// server/routes/beds.js
const router = require('express').Router();
const { query, queryOne, run, auditLog } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const v = require('../middleware/validate');

const ip = req => req.ip || null;

// GET /api/beds
router.get('/', authMiddleware, async (req, res) => {
  const { hospitalId } = req.user;
  try {
    // Seed default beds if none exist for this hospital to make it testable immediately
    const countRow = await queryOne('SELECT COUNT(*) as n FROM beds WHERE hospital_id = $1', [hospitalId]);
    if (countRow && parseInt(countRow.n || 0) === 0) {
      const defaultBeds = [
        { id: `bed-${hospitalId}-101a`, bed_number: 'Bed A', room: 'Room 101', ward: 'General Ward', type: 'General' },
        { id: `bed-${hospitalId}-101b`, bed_number: 'Bed B', room: 'Room 101', ward: 'General Ward', type: 'General' },
        { id: `bed-${hospitalId}-101c`, bed_number: 'Bed C', room: 'Room 101', ward: 'General Ward', type: 'General' },
        { id: `bed-${hospitalId}-201a`, bed_number: 'Bed A', room: 'Room 201', ward: 'Semi-Private Ward', type: 'Semi-Private' },
        { id: `bed-${hospitalId}-201b`, bed_number: 'Bed B', room: 'Room 201', ward: 'Semi-Private Ward', type: 'Semi-Private' },
        { id: `bed-${hospitalId}-301`,  bed_number: 'Bed 1', room: 'Room 301', ward: 'Private Room', type: 'Private' },
        { id: `bed-${hospitalId}-302`,  bed_number: 'Bed 1', room: 'Room 302', ward: 'Private Room', type: 'Private' },
        { id: `bed-${hospitalId}-icu1`, bed_number: 'Bed 1', room: 'Room 401', ward: 'ICU', type: 'ICU' },
        { id: `bed-${hospitalId}-icu2`, bed_number: 'Bed 2', room: 'Room 401', ward: 'ICU', type: 'ICU' },
      ];
      for (const b of defaultBeds) {
        await run(
          `INSERT INTO beds (id, hospital_id, bed_number, room, ward, type, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Available')`,
          [b.id, hospitalId, b.bed_number, b.room, b.ward, b.type]
        );
      }
    }

    // Fetch all beds joined with occupant details
    const rows = await query(
      `SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, u.name as doctor_name
       FROM beds b
       LEFT JOIN patients p ON b.patient_id = p.id
       LEFT JOIN users u ON b.doctor_id = u.id
       WHERE b.hospital_id = $1
       ORDER BY b.ward, b.room, b.bed_number`,
      [hospitalId]
    );

    // Fetch latest vitals for each patient in occupied beds
    const bedsWithVitals = [];
    for (const row of rows) {
      let vitals = null;
      if (row.patient_id) {
        vitals = await queryOne(
          'SELECT * FROM vitals WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 1',
          [row.patient_id]
        );
      }
      bedsWithVitals.push({ ...row, vitals });
    }

    res.json(bedsWithVitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id/allocate
router.put('/:id/allocate', authMiddleware, async (req, res) => {
  const { patient_id, doctor_id } = req.body;
  const { hospitalId } = req.user;
  
  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
  
  try {
    // Verify patient belongs to same hospital
    const patient = await queryOne('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND is_active = 1', [patient_id, hospitalId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found in this hospital' });
    
    // Verify doctor belongs to same hospital
    if (doctor_id) {
      const doctor = await queryOne("SELECT id FROM users WHERE id = $1 AND hospital_id = $2 AND role = 'doctor' AND is_active = 1", [doctor_id, hospitalId]);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });
    }
    
    // Check if bed exists and belongs to hospital
    const bed = await queryOne('SELECT id, status FROM beds WHERE id = $1 AND hospital_id = $2', [req.params.id, hospitalId]);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    
    if (bed.status === 'Occupied') {
      return res.status(409).json({ error: 'Bed is already occupied' });
    }
    
    const now = new Date().toISOString();
    await run(
      `UPDATE beds
       SET status = 'Occupied', patient_id = $1, doctor_id = $2, admitted_at = $3
       WHERE id = $4`,
      [patient_id, doctor_id || null, now, req.params.id]
    );
    
    auditLog(req.user.id, 'ALLOCATE_BED', 'beds', req.params.id, { patient_id, doctor_id }, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id/release
router.put('/:id/release', authMiddleware, async (req, res) => {
  const { hospitalId } = req.user;
  try {
    const bed = await queryOne('SELECT id, status FROM beds WHERE id = $1 AND hospital_id = $2', [req.params.id, hospitalId]);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    
    await run(
      `UPDATE beds
       SET status = 'Available', patient_id = NULL, doctor_id = NULL, admitted_at = NULL
       WHERE id = $1`,
      [req.params.id]
    );
    
    auditLog(req.user.id, 'RELEASE_BED', 'beds', req.params.id, {}, ip(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
