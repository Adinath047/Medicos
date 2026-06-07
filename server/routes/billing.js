// server/routes/billing.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;
const BILLING_ROLES = ['billing', 'receptionist', 'admin'];
const VALID_PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance', 'NEFT', 'Cheque', 'Other'];

const parseBill = r => parseJsonFields(r, ['items']);

// GET /api/billing?patient_id=&status=
router.get('/', authMiddleware, async (req, res) => {
  const { patient_id, status, limit = 30 } = req.query;
  const { hospitalId } = req.user;

  let sql = `SELECT b.*, p.name as patient_name, p.uhid FROM billing b JOIN patients p ON b.patient_id = p.id WHERE b.hospital_id = $1`;
  const params = [hospitalId];
  let index = 2;

  if (patient_id) { sql += ` AND b.patient_id = $${index++}`; params.push(patient_id); }
  if (status)     { sql += ` AND b.payment_status = $${index++}`; params.push(status); }
  sql += ` ORDER BY b.created_at DESC LIMIT $${index++}`;
  params.push(Number(limit));

  try {
    const rows = await query(sql, params);
    res.json(rows.map(parseBill));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing
router.post('/',
  authMiddleware,
  requireRole(...BILLING_ROLES),
  v.body({
    patient_id:   [v.required, v.str(1, 100)],
    total_amount: [v.float(0, 9999999)],
    net_amount:   [v.float(0, 9999999)],
    paid_amount:  [v.float(0, 9999999)],
    discount:     [v.float(0, 100)],
    payment_mode: [v.oneOf(VALID_PAYMENT_MODES)],
  }),
  async (req, res) => {
    const {
      patient_id, encounter_id,
      items = [], total_amount, discount = 0,
      net_amount, paid_amount = 0, payment_mode = 'Cash', notes,
    } = req.body;

    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

    try {
      const hospitalId = req.user.hospitalId || 'hsp-001';
      const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [patient_id, hospitalId]);
      if (!patient) return res.status(404).json({ error: 'Patient not found in this hospital' });

      const id = uuid();
      const invCountRow = await queryOne('SELECT COUNT(*) as n FROM billing WHERE hospital_id = $1', [hospitalId]);
      const invCount = invCountRow ? parseInt(invCountRow.n || 0) : 0;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, '0')}`;
      const payStatus = paid_amount >= net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';

      await run(
        `INSERT INTO billing
          (id, hospital_id, patient_id, encounter_id, items, total_amount, discount, net_amount,
           paid_amount, payment_mode, payment_status, invoice_number, notes, billed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, hospitalId, patient_id, encounter_id||null,
         JSON.stringify(items), total_amount||0, discount, net_amount||total_amount||0,
         paid_amount, payment_mode, payStatus, invoiceNumber, notes||null, req.user.id]
      );

      auditLog(req.user.id, 'CREATE_BILL', 'billing', id,
        { patient_id, invoice_number: invoiceNumber, net_amount: net_amount||total_amount||0, payment_mode }, ip(req));
      
      const created = await queryOne('SELECT * FROM billing WHERE id = $1', [id]);
      res.status(201).json(parseBill(created));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/billing/:id/payment
router.put('/:id/payment',
  authMiddleware,
  requireRole(...BILLING_ROLES),
  v.body({
    paid_amount:  [v.required, v.float(0, 9999999)],
    payment_mode: [v.oneOf(VALID_PAYMENT_MODES)],
  }),
  async (req, res) => {
    const { paid_amount, payment_mode } = req.body;
    
    try {
      const bill = await queryOne('SELECT * FROM billing WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId]);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });

      const payStatus = paid_amount >= bill.net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';
      await run(
        'UPDATE billing SET paid_amount = $1, payment_mode = $2, payment_status = $3 WHERE id = $4',
        [paid_amount, payment_mode || bill.payment_mode, payStatus, req.params.id]
      );
      
      auditLog(req.user.id, 'UPDATE_PAYMENT', 'billing', req.params.id,
        { paid_amount, payment_mode, payment_status: payStatus }, ip(req));
      
      const updated = await queryOne('SELECT * FROM billing WHERE id = $1', [req.params.id]);
      res.json(parseBill(updated));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
