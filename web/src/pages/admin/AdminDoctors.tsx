import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { DOCTORS, Doctor } from '../../data/mockData';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology',
  'Oncology', 'Gynecology', 'Psychiatry', 'General Surgery', 'Internal Medicine',
  'ENT', 'Ophthalmology', 'Urology', 'Nephrology', 'Radiology',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AddDoctorModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Doctor) => void }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', nmcNumber: '',
    specialization: 'Cardiology', experience: '', bio: '',
    scheduleDay: 'Mon', startTime: '09:00', endTime: '17:00',
  });
  const [schedule, setSchedule] = useState<{ day: string; startTime: string; endTime: string }[]>([]);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addScheduleSlot = () => {
    if (schedule.some(s => s.day === form.scheduleDay)) return;
    setSchedule(s => [...s, { day: form.scheduleDay, startTime: form.startTime, endTime: form.endTime }]);
  };

  const removeSlot = (day: string) => setSchedule(s => s.filter(x => x.day !== day));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Name, email and phone are required.');
      return;
    }
    const id = `d${Date.now()}`;
    const newDoctor: Doctor = {
      id,
      userId: id,
      hospitalId: 'hsp-001',
      name: form.name.trim(),
      type: 'Specialist',
      email: form.email.trim(),
      phone: form.phone.trim(),
      nmcNumber: form.nmcNumber.trim() || `NMC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`,
      nmcVerified: false,
      govtIdType: 'Aadhaar',
      govtIdNumber: '',
      govtIdVerified: false,
      dateOfBirth: '',
      gender: 'Male',
      achievements: [],
      languages: ['Hindi', 'English'],
      consultationFee: 500,
      qualifications: form.specialization,
      specialization: form.specialization,
      status: 'Pending Verification',
      experience: parseInt(form.experience) || 0,
      patientsCount: 0,
      bio: form.bio.trim() || `${form.specialization} specialist.`,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=10b981&color=fff&bold=true&size=128`,
      schedule: schedule.length > 0 ? schedule : [{ day: 'Mon', startTime: '09:00', endTime: '17:00' }],
    };
    onAdd(newDoctor);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🩺 Add New Doctor</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Dr. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="input" type="email" placeholder="dr.name@medicos.app" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Specialization</label>
                <select className="select-input" value={form.specialization} onChange={e => set('specialization', e.target.value)}>
                  {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Experience (years)</label>
                <input className="input" type="number" min="0" max="50" placeholder="0" value={form.experience} onChange={e => set('experience', e.target.value)} />
              </div>
              <div>
                <label className="form-label">NMC / SMC Number</label>
                <input className="input" placeholder="NMC-YYYY-XXXXX (auto if blank)" value={form.nmcNumber} onChange={e => set('nmcNumber', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Bio / About</label>
                <textarea className="input" rows={2} style={{ resize: 'vertical' }}
                  placeholder="Brief professional summary…"
                  value={form.bio} onChange={e => set('bio', e.target.value)} />
              </div>

              {/* Schedule Builder */}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Schedule (optional)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label className="form-label">Day</label>
                    <select className="select-input" style={{ width: 90 }} value={form.scheduleDay} onChange={e => set('scheduleDay', e.target.value)}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">From</label>
                    <input className="input" type="time" style={{ width: 110 }} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">To</label>
                    <input className="input" type="time" style={{ width: 110 }} value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addScheduleSlot}>+ Add Slot</button>
                </div>
                {schedule.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {schedule.map(s => (
                      <span key={s.day} className="tag" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {s.day} {s.startTime}–{s.endTime}
                        <button type="button" onClick={() => removeSlot(s.day)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Add Doctor</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDoctors({ onNavigate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [, forceRender] = useState(0);

  const handleAdd = (d: Doctor) => {
    DOCTORS.push(d);
    setShowAdd(false);
    forceRender(n => n + 1);
  };

  return (
    <div className="page-scroll">
      {showAdd && <AddDoctorModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      <div className="page-header">
        <div>
          <div className="page-title">Doctors</div>
          <div className="page-subtitle">{DOCTORS.length} registered doctors</div>
        </div>
        <button className="btn btn-primary" id="add-doctor-btn" onClick={() => setShowAdd(true)}>
          + Add Doctor
        </button>
      </div>

      {DOCTORS.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">🩺</span>
            <h3>No doctors registered</h3>
            <p>Click "+ Add Doctor" to onboard your first doctor.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {DOCTORS.map((doc) => (
            <div key={doc.id} className="card" style={{ cursor: 'pointer', transition: 'all var(--transition)' }}
              onClick={() => onNavigate('admin-doctor-detail', { doctorId: doc.id })}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <Avatar uri={doc.photoURL} name={doc.name} size={56} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{doc.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{doc.specialization}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>NMC: {doc.nmcNumber} {doc.nmcVerified ? '✓' : '⏳'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Badge label={doc.status} variant={getStatusVariant(doc.status) as any} />
                  <span className="badge badge-info">{doc.experience} yrs exp</span>
                  <span className="badge badge-purple">{doc.patientsCount} patients</span>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>{doc.bio}</p>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="section-label" style={{ marginBottom: 8 }}>Schedule</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {doc.schedule.map((s) => (
                      <span key={s.day} className="tag">{s.day} {s.startTime}–{s.endTime}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {doc.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
