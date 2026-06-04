// server/routes/pharmacy.js — Pharmacy billing (staff_type = 'pharmacy')
const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.ip || null;

// Only receptionist role (any staff_type) can access pharmacy — guard pharmacy mutations
function pharmacyAuth(req, res, next) {
  if (!['receptionist', 'pharmacist'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Pharmacy access: receptionist or pharmacist role required' });
  }
  next();
}

function parseBill(r) { return parseJsonFields(r, ['medicines']); }

// ── GET /api/pharmacy — list pharmacy bills ─────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { patient_id, status, limit = 30 } = req.query;
  const { hospitalId } = req.user;

  let sql = `SELECT pb.*, p.name as patient_name, p.uhid,
                    u.name as pharmacist_name
             FROM pharmacy_bills pb
             JOIN patients p ON pb.patient_id = p.id
             JOIN users u ON pb.pharmacist_id = u.id
             WHERE pb.hospital_id = $1`;
  const params = [hospitalId];
  let index = 2;

  if (patient_id) { sql += ` AND pb.patient_id = $${index++}`; params.push(patient_id); }
  if (status)     { sql += ` AND pb.payment_status = $${index++}`; params.push(status); }
  sql += ` ORDER BY pb.created_at DESC LIMIT $${index++}`;
  params.push(Number(limit));

  try {
    const rows = await query(sql, params);
    res.json(rows.map(parseBill));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/pharmacy/:id ────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT pb.*, p.name as patient_name, p.uhid, p.age, p.sex,
              u.name as pharmacist_name
       FROM pharmacy_bills pb
       JOIN patients p ON pb.patient_id = p.id
       JOIN users u ON pb.pharmacist_id = u.id
       WHERE pb.id = $1`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(parseBill(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/pharmacy — create pharmacy bill ────────────────────────────────
router.post('/', authMiddleware, pharmacyAuth, async (req, res) => {
  const {
    patient_id, prescription_id,
    medicines = [], discount = 0,
    paid_amount = 0, payment_mode = 'Cash', notes,
  } = req.body;

  if (!patient_id || !medicines.length) {
    return res.status(400).json({ error: 'patient_id and at least one medicine required' });
  }

  try {
    const hospitalId = req.user.hospitalId || 'hsp-001';
    const id = uuid();
    const total_amount = medicines.reduce((s, m) => s + (m.quantity * m.unit_price), 0);
    const net_amount   = Math.max(0, total_amount - parseFloat(discount || 0));
    const payStatus    = paid_amount >= net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';

    const invCountRow = await queryOne('SELECT COUNT(*) as n FROM pharmacy_bills WHERE hospital_id = $1', [hospitalId]);
    const invCount = invCountRow ? parseInt(invCountRow.n || 0) : 0;
    const invoice_number = `PHR-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, '0')}`;

    await run(
      `INSERT INTO pharmacy_bills
        (id, hospital_id, patient_id, prescription_id, pharmacist_id,
         medicines, total_amount, discount, net_amount, paid_amount,
         payment_mode, payment_status, invoice_number, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, hospitalId, patient_id, prescription_id || null, req.user.id,
       JSON.stringify(medicines), total_amount, parseFloat(discount || 0), net_amount,
       parseFloat(paid_amount || 0), payment_mode, payStatus, invoice_number, notes || null]
    );

    auditLog(req.user.id, 'CREATE_PHARMACY_BILL', 'pharmacy_bills', id,
      { patient_id, invoice_number, net_amount }, ip(req));

    const created = await queryOne('SELECT * FROM pharmacy_bills WHERE id = $1', [id]);
    res.status(201).json(parseBill(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/pharmacy/:id/payment — record/update payment ──────────────────
router.put('/:id/payment', authMiddleware, pharmacyAuth, async (req, res) => {
  const { paid_amount, payment_mode } = req.body;
  
  try {
    const bill = await queryOne('SELECT * FROM pharmacy_bills WHERE id = $1', [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Not found' });

    const payStatus = paid_amount >= bill.net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';
    await run(
      `UPDATE pharmacy_bills
       SET paid_amount=$1, payment_mode=$2, payment_status=$3, updated_at=now()::text
       WHERE id=$4`,
      [parseFloat(paid_amount), payment_mode || bill.payment_mode, payStatus, req.params.id]
    );

    auditLog(req.user.id, 'UPDATE_PHARMACY_PAYMENT', 'pharmacy_bills', req.params.id,
      { paid_amount, payment_status: payStatus }, ip(req));

    const updated = await queryOne('SELECT * FROM pharmacy_bills WHERE id = $1', [req.params.id]);
    res.json(parseBill(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
