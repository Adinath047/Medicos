// server/routes/pharmacy.js — Pharmacy billing (staff_type = 'pharmacy')
const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

// Only receptionist role (any staff_type) can access pharmacy — guard pharmacy mutations
function pharmacyAuth(req, res, next) {
  if (!['receptionist'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Pharmacy access: receptionist role required' });
  }
  next();
}

function parseBill(r) { return parseJsonFields(r, ['medicines']); }

// ── GET /api/pharmacy — list pharmacy bills ─────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, status, limit = 30 } = req.query;
  const { hospitalId } = req.user;

  let sql = `SELECT pb.*, p.name as patient_name, p.uhid,
                    u.name as pharmacist_name
             FROM pharmacy_bills pb
             JOIN patients p ON pb.patient_id = p.id
             JOIN users u ON pb.pharmacist_id = u.id
             WHERE pb.hospital_id = ?`;
  const params = [hospitalId];
  if (patient_id) { sql += ' AND pb.patient_id = ?'; params.push(patient_id); }
  if (status)     { sql += ' AND pb.payment_status = ?'; params.push(status); }
  sql += ' ORDER BY pb.created_at DESC LIMIT ?';
  params.push(Number(limit));

  res.json(query(sql, params).map(parseBill));
});

// ── GET /api/pharmacy/:id ────────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const row = queryOne(
    `SELECT pb.*, p.name as patient_name, p.uhid, p.age, p.sex,
            u.name as pharmacist_name
     FROM pharmacy_bills pb
     JOIN patients p ON pb.patient_id = p.id
     JOIN users u ON pb.pharmacist_id = u.id
     WHERE pb.id = ?`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseBill(row));
});

// ── POST /api/pharmacy — create pharmacy bill ────────────────────────────────
router.post('/', authMiddleware, pharmacyAuth, (req, res) => {
  const {
    patient_id, prescription_id,
    medicines = [], discount = 0,
    paid_amount = 0, payment_mode = 'Cash', notes,
  } = req.body;

  if (!patient_id || !medicines.length) {
    return res.status(400).json({ error: 'patient_id and at least one medicine required' });
  }

  const hospitalId = req.user.hospitalId || 'hsp-001';
  const id = uuid();
  const total_amount = medicines.reduce((s, m) => s + (m.quantity * m.unit_price), 0);
  const net_amount   = Math.max(0, total_amount - parseFloat(discount || 0));
  const payStatus    = paid_amount >= net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';

  const invCount = queryOne('SELECT COUNT(*) as n FROM pharmacy_bills WHERE hospital_id = ?', [hospitalId]).n;
  const invoice_number = `PHR-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, '0')}`;

  run(
    `INSERT INTO pharmacy_bills
      (id, hospital_id, patient_id, prescription_id, pharmacist_id,
       medicines, total_amount, discount, net_amount, paid_amount,
       payment_mode, payment_status, invoice_number, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, hospitalId, patient_id, prescription_id || null, req.user.id,
     JSON.stringify(medicines), total_amount, parseFloat(discount || 0), net_amount,
     parseFloat(paid_amount || 0), payment_mode, payStatus, invoice_number, notes || null]
  );

  auditLog(req.user.id, 'CREATE_PHARMACY_BILL', 'pharmacy_bills', id,
    { patient_id, invoice_number, net_amount }, ip(req));

  res.status(201).json(parseBill(queryOne('SELECT * FROM pharmacy_bills WHERE id = ?', [id])));
});

// ── PUT /api/pharmacy/:id/payment — record/update payment ──────────────────
router.put('/:id/payment', authMiddleware, pharmacyAuth, (req, res) => {
  const { paid_amount, payment_mode } = req.body;
  const bill = queryOne('SELECT * FROM pharmacy_bills WHERE id = ?', [req.params.id]);
  if (!bill) return res.status(404).json({ error: 'Not found' });

  const payStatus = paid_amount >= bill.net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';
  run(
    `UPDATE pharmacy_bills
     SET paid_amount=?, payment_mode=?, payment_status=?, updated_at=datetime('now')
     WHERE id=?`,
    [parseFloat(paid_amount), payment_mode || bill.payment_mode, payStatus, req.params.id]
  );

  auditLog(req.user.id, 'UPDATE_PHARMACY_PAYMENT', 'pharmacy_bills', req.params.id,
    { paid_amount, payment_status: payStatus }, ip(req));

  res.json(parseBill(queryOne('SELECT * FROM pharmacy_bills WHERE id = ?', [req.params.id])));
});

module.exports = router;
