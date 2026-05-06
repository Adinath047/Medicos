import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { useAuthStore } from '../../hooks/useAuthStore';
import { PATIENTS, APPOINTMENTS, DOCTORS, Appointment } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const REASONS = [
  'General Checkup', 'Follow-up Visit', 'Fever & Cold', 'Chest Pain',
  'Back Pain', 'Headache', 'Skin Issue', 'Eye Problem', 'Dental',
  'Mental Health', 'Blood Test Review', 'Vaccination', 'Other',
];

const TIMES = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'];

function BookModal({ patientId, onClose, onBook }: {
  patientId: string;
  onClose: () => void;
  onBook: (a: Appointment) => void;
}) {
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate]         = useState('');
  const [time, setTime]         = useState('10:00 AM');
  const [reason, setReason]     = useState('General Checkup');
  const [notes, setNotes]       = useState('');
  const [error, setError]       = useState('');

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) { setError('Please select a doctor.'); return; }
    if (!date)     { setError('Please select a date.'); return; }
    const doctor = DOCTORS.find(d => d.id === doctorId)!;
    const patient = PATIENTS.find(p => p.id === patientId);
    const newAppt: Appointment = {
      id: `a${Date.now()}`,
      hospitalId: doctor.hospitalId,
      patientId,
      patientName:  patient?.name ?? 'Patient',
      patientPhoto: patient?.photoURL ?? '',
      doctorId,
      doctorName:   doctor.name,
      doctorSpecialization: doctor.specialization,
      date,
      time,
      reason,
      notes: notes.trim(),
      status: 'Confirmed',
    };
    onBook(newAppt);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📅 Book Appointment</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Doctor *</label>
                {DOCTORS.length === 0 ? (
                  <div className="alert alert-info">No doctors available yet. Ask admin to add doctors first.</div>
                ) : (
                  <select className="select-input" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                    <option value="">— Choose a doctor —</option>
                    {DOCTORS.map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Date *</label>
                  <input className="input" type="date" min={minDateStr} value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <select className="select-input" value={time} onChange={e => setTime(e.target.value)}>
                    {TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <select className="select-input" value={reason} onChange={e => setReason(e.target.value)}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Notes (optional)</label>
                <textarea className="input" rows={2} style={{ resize: 'vertical' }}
                  placeholder="Any additional information for the doctor…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={DOCTORS.length === 0}>
              ✓ Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatientAppointments({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const [showBook, setShowBook] = useState(false);
  const [, forceRender]         = useState(0);

  const patient = PATIENTS.find(p => p.email === user?.email);

  // Not registered yet as a patient record
  if (!patient) {
    return (
      <div className="page-scroll">
        <div className="empty-state" style={{ padding: 64 }}>
          <span className="empty-state-icon">📅</span>
          <h3>Profile not set up yet</h3>
          <p>Your patient record hasn't been created by the admin yet.<br/>Please contact the hospital admin to register your profile.</p>
        </div>
      </div>
    );
  }

  const appts = APPOINTMENTS.filter(a => a.patientId === patient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleBook = (a: Appointment) => {
    APPOINTMENTS.push(a);
    setShowBook(false);
    forceRender(n => n + 1);
  };

  return (
    <div className="page-scroll">
      {showBook && (
        <BookModal patientId={patient.id} onClose={() => setShowBook(false)} onBook={handleBook} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">My Appointments</div>
          <div className="page-subtitle">{appts.length} total appointments</div>
        </div>
        <button className="btn btn-primary" id="book-appt-btn" onClick={() => setShowBook(true)}>
          + Book Appointment
        </button>
      </div>

      {appts.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">📅</span>
            <h3>No appointments yet</h3>
            <p>Book your first appointment with one of our specialists</p>
            <button className="btn btn-primary" onClick={() => setShowBook(true)}>Book Now</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {appts.map((a) => (
            <div key={a.id} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="appt-date-box">
                  <div className="appt-day">{new Date(a.date).getDate()}</div>
                  <div className="appt-month">{new Date(a.date).toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.doctorName}</div>
                  <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{a.doctorSpecialization}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>⏰ {a.time} · {formatDate(a.date)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.reason}</div>
                  {a.notes && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, fontStyle: 'italic' }}>{a.notes}</div>}
                </div>
                <Badge label={a.status} variant={getStatusVariant(a.status) as any} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
