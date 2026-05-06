import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  APPOINTMENTS, PATIENTS, DOCTORS, HOSPITALS,
  type Appointment,
} from '../../data/mockData';
import { useAuthStore } from '../../hooks/useAuthStore';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
];

const REASONS = [
  'General Consultation', 'Follow-up Visit', 'New Complaint',
  'Lab Result Review', 'Prescription Renewal', 'Emergency',
  'Routine Check-up', 'Pre-surgical Assessment', 'Post-operative Care',
];

const EMPTY_FORM = {
  patientId: '', doctorId: '', date: new Date().toISOString().split('T')[0],
  time: '', reason: '', notes: '',
};

export default function ReceptionistAppointments({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId ?? '';

  const [appointments, setAppointments] = useState<Appointment[]>(
    APPOINTMENTS.filter(a => a.hospitalId === hospitalId)
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const myDoctors  = DOCTORS.filter(d => d.hospitalId === hospitalId && d.status === 'Active');
  const myPatients = PATIENTS.filter(p => p.hospitalId === hospitalId);
  const hospital   = HOSPITALS.find(h => h.id === hospitalId);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Booked slots for selected doctor+date
  const bookedSlots = APPOINTMENTS
    .filter(a => a.doctorId === form.doctorId && a.date === form.date)
    .map(a => a.time);

  // Token number = next token for that doctor+date
  const getNextToken = (doctorId: string, date: string) =>
    APPOINTMENTS.filter(a => a.doctorId === doctorId && a.date === date).length + 1;

  const handleSave = async () => {
    if (!form.patientId || !form.doctorId || !form.date || !form.time || !form.reason) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));

    const patient = myPatients.find(p => p.id === form.patientId)!;
    const doctor  = myDoctors.find(d => d.id === form.doctorId)!;
    const token   = getNextToken(form.doctorId, form.date);

    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      hospitalId,
      patientId: form.patientId,
      patientName: patient.name,
      patientPhoto: patient.photoURL,
      doctorId: form.doctorId,
      doctorName: doctor.name,
      doctorSpecialization: doctor.specialization,
      date: form.date,
      time: form.time,
      tokenNumber: token,
      reason: form.reason,
      status: 'Confirmed',
      notes: form.notes,
      registeredBy: user?.id,
    };

    APPOINTMENTS.push(newAppt);
    setAppointments(APPOINTMENTS.filter(a => a.hospitalId === hospitalId));
    setSaving(false);
    showToast(`✅ Appointment booked! Token #${token} · ${form.time}`);
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
  };

  const filtered = appointments.filter(a => {
    const matchDate   = !dateFilter || a.date === dateFilter;
    const matchDoctor = doctorFilter === 'All' || a.doctorId === doctorFilter;
    return matchDate && matchDoctor;
  });

  const getStatusVariant = (s: string) => {
    if (s === 'Confirmed')         return 'success';
    if (s === 'Checked-In')        return 'info';
    if (s === 'In Consultation')   return 'warning';
    if (s === 'Completed')         return 'success';
    if (s === 'Cancelled')         return 'danger';
    return 'info';
  };

  return (
    <div className="page-scroll">
      {toast && <div className="alert alert-success">{toast}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Appointments</div>
          <div className="page-subtitle">{hospital?.name} · {appointments.length} total</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Book Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Date</label>
              <input className="input" type="date" value={dateFilter}
                onChange={e => setDateFilter(e.target.value)} style={{ width: 160 }} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Doctor</label>
              <select className="input" value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}>
                <option value="All">All Doctors</option>
                {myDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 16 }}
              onClick={() => { setDateFilter(''); setDoctorFilter('All'); }}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Appointments table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📅 Appointments</div>
          <span className="badge badge-info">{filtered.length} shown</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <span className="empty-state-icon">📅</span>
                    <p>No appointments found</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>Book First Appointment</button>
                  </div>
                </td></tr>
              ) : [...filtered].sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0)).map(appt => (
                <tr key={appt.id}>
                  <td>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--primary-gradient)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 14,
                    }}>
                      {appt.tokenNumber ?? '—'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar uri={appt.patientPhoto} name={appt.patientName} size={30} />
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{appt.patientName}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{appt.doctorName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{appt.doctorSpecialization}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDate(appt.date)}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{appt.time}</td>
                  <td style={{ fontSize: 12, maxWidth: 140 }}>{appt.reason}</td>
                  <td><Badge label={appt.status} variant={getStatusVariant(appt.status) as any} /></td>
                  <td>
                    {(appt.status === 'Confirmed' || appt.status === 'Pending') && (
                      <button className="btn btn-primary btn-sm"
                        onClick={() => onNavigate('receptionist-checkin', { appointmentId: appt.id })}>
                        Check In
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📅 Book Appointment</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Patient *</label>
                  <select className="input" value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}>
                    <option value="">— Select Patient —</option>
                    {myPatients.map(p => <option key={p.id} value={p.id}>{p.name} · UHID: {p.uhid}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Doctor *</label>
                  <select className="input" value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value, time: '' }))}>
                    <option value="">— Select Doctor —</option>
                    {myDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} · {d.specialization} · ₹{d.consultationFee}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="input" type="date" value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    <option value="">— Select Reason —</option>
                    {REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

                {/* Time slot picker */}
                {form.doctorId && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Time Slot *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {TIME_SLOTS.map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        const isSelected = form.time === slot;
                        return (
                          <button
                            key={slot} type="button" disabled={isBooked}
                            onClick={() => setForm(f => ({ ...f, time: slot }))}
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: isBooked ? 'not-allowed' : 'pointer',
                              border: '1.5px solid',
                              borderColor: isBooked ? 'var(--border)' : isSelected ? '#2563eb' : 'var(--border)',
                              background: isBooked ? 'var(--surface-alt)' : isSelected ? '#2563eb' : 'transparent',
                              color: isBooked ? 'var(--text-muted)' : isSelected ? '#fff' : 'var(--text)',
                              fontWeight: isSelected ? 700 : 400,
                              opacity: isBooked ? 0.5 : 1,
                            }}
                          >
                            {slot} {isBooked && '✕'}
                          </button>
                        );
                      })}
                    </div>
                    {form.doctorId && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Token #{getNextToken(form.doctorId, form.date)} will be assigned
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="input" rows={3} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes for the doctor…"
                    style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary" onClick={handleSave} disabled={saving || !form.patientId || !form.doctorId || !form.time || !form.reason}
              >
                {saving ? 'Booking…' : '📅 Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
