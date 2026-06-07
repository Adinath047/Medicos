// server/routes/patient_uploads.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const ip = req => req.ip || null;

// GET /api/patient-uploads/:patient_id
// Can be accessed by a doctor/staff (with hospitalId check) or a patient (matching patient_id)
router.get('/:patient_id', authMiddleware, async (req, res) => {
  const { patient_id } = req.params;
  
  // If the user is a patient, they can only access their own uploads
  if (req.user.role === 'patient' && req.user.id !== patient_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // If user is staff, check hospital
  const hid = req.user.role === 'super_admin' || req.user.role === 'patient' ? null : req.user.hospitalId;

  let sql = 'SELECT * FROM patient_uploads WHERE patient_id = $1';
  const params = [patient_id];
  let index = 2;

  if (hid) {
    sql += ` AND hospital_id = $${index++}`;
    params.push(hid);
  }
  
  sql += ' ORDER BY uploaded_at DESC';

  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patient-uploads
router.post('/', authMiddleware, async (req, res) => {
  const { patient_id, title, file_url, file_type, notes, hospital_id: bodyHid } = req.body;
  if (!patient_id || !title || !file_url) {
    return res.status(400).json({ error: 'patient_id, title, and file_url are required' });
  }

  // Authorize upload
  if (req.user.role === 'patient' && req.user.id !== patient_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const hospitalId = req.user.hospitalId || 'hsp-001';
    const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [patient_id, hospitalId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found in this hospital' });

    const id = uuid();

    await run(
      `INSERT INTO patient_uploads (id, patient_id, hospital_id, title, file_url, file_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, patient_id, hospitalId, title, file_url, file_type || null, notes || null]
    );

    auditLog(req.user.id, 'PATIENT_UPLOAD_ADDED', 'patient_uploads', id, { patient_id, title }, ip(req));
    
    const created = await queryOne('SELECT * FROM patient_uploads WHERE id = $1', [id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patient-uploads/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const upload = await queryOne('SELECT * FROM patient_uploads WHERE id = $1 AND hospital_id = $2', [id, req.user.hospitalId]);
    
    if (!upload) return res.status(404).json({ error: 'Upload not found' });
    
    if (req.user.role === 'patient' && req.user.id !== upload.patient_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await run('DELETE FROM patient_uploads WHERE id = $1', [id]);
    auditLog(req.user.id, 'PATIENT_UPLOAD_DELETED', 'patient_uploads', id, { patient_id: upload.patient_id }, ip(req));
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
