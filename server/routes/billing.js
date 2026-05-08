// server/routes/billing.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, parseJsonFields, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

const parseBill = r => parseJsonFields(r, ['items']);

// GET /api/billing?patient_id=&status=
router.get('/', authMiddleware, (req, res) => {
  const { patient_id, status, limit = 30 } = req.query;
  const { hospitalId } = req.user;

  let sql = `SELECT b.*, p.name as patient_name, p.uhid FROM billing b JOIN patients p ON b.patient_id = p.id WHERE b.hospital_id = ?`;
  const params = [hospitalId];
  if (patient_id) { sql += ' AND b.patient_id = ?'; params.push(patient_id); }
  if (status)     { sql += ' AND b.payment_status = ?'; params.push(status); }
  sql += ' ORDER BY b.created_at DESC LIMIT ?';
  params.push(Number(limit));

  res.json(query(sql, params).map(parseBill));
});

// POST /api/billing
router.post('/', authMiddleware, (req, res) => {
  const {
    patient_id, encounter_id,
    items = [], total_amount, discount = 0,
    net_amount, paid_amount = 0, payment_mode = 'Cash', notes,
  } = req.body;

  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  const hospitalId = req.user.hospitalId || 'hsp-001';
  const id = uuid();
  const invCount = queryOne('SELECT COUNT(*) as n FROM billing WHERE hospital_id = ?', [hospitalId]).n;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, '0')}`;
  const payStatus = paid_amount >= net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';

  run(
    `INSERT INTO billing
      (id, hospital_id, patient_id, encounter_id, items, total_amount, discount, net_amount,
       paid_amount, payment_mode, payment_status, invoice_number, notes, billed_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, hospitalId, patient_id, encounter_id||null,
     JSON.stringify(items), total_amount||0, discount, net_amount||total_amount||0,
     paid_amount, payment_mode, payStatus, invoiceNumber, notes||null, req.user.id]
  );

  auditLog(req.user.id, 'CREATE_BILL', 'billing', id,
    { patient_id, invoice_number: invoiceNumber, net_amount: net_amount||total_amount||0, payment_mode }, ip(req));
  res.status(201).json(parseBill(queryOne('SELECT * FROM billing WHERE id = ?', [id])));
});

// PUT /api/billing/:id/payment
router.put('/:id/payment', authMiddleware, (req, res) => {
  const { paid_amount, payment_mode } = req.body;
  const bill = queryOne('SELECT * FROM billing WHERE id = ?', [req.params.id]);
  if (!bill) return res.status(404).json({ error: 'Not found' });

  const payStatus = paid_amount >= bill.net_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending';
  run(
    'UPDATE billing SET paid_amount = ?, payment_mode = ?, payment_status = ? WHERE id = ?',
    [paid_amount, payment_mode || bill.payment_mode, payStatus, req.params.id]
  );
  auditLog(req.user.id, 'UPDATE_PAYMENT', 'billing', req.params.id,
    { paid_amount, payment_mode, payment_status: payStatus }, ip(req));
  res.json(parseBill(queryOne('SELECT * FROM billing WHERE id = ?', [req.params.id])));
});

module.exports = router;
