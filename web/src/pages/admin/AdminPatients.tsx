import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { PATIENTS, BEDS, DOCTORS, Patient } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function AddPatientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Patient) => void }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', dob: '', sex: 'Male' as Patient['sex'],
    bloodGroup: 'O+', address: '', primaryDoctor: '',
    ecName: '', ecPhone: '', ecRelation: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.dob) {
      setError('Name, email, phone and date of birth are required.');
      return;
    }
    const dob = new Date(form.dob);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    const id = `p${Date.now()}`;
    const newPatient: Patient = {
      id,
      userId: id,
      hospitalId: 'hsp-001',
      uhid: `UHID-001-${String(PATIENTS.length + 1).padStart(6,'0')}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
      age,
      sex: form.sex,
      bloodGroup: form.bloodGroup,
      address: form.address.trim(),
      allergies: [],
      chronicConditions: [],
      primaryDoctor: form.primaryDoctor.trim() || 'Unassigned',
      lastVisit: new Date().toISOString().split('T')[0],
      emergencyContact: {
        name: form.ecName.trim() || '—',
        phone: form.ecPhone.trim() || '—',
        relation: form.ecRelation.trim() || '—',
      },
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=2563eb&color=fff&bold=true&size=128`,
    };
    onAdd(newPatient);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">👤 Add New Patient</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Rahul Mehta" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="input" type="email" placeholder="patient@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date of Birth *</label>
                <input className="input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Sex</label>
                <select className="select-input" value={form.sex} onChange={e => set('sex', e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Blood Group</label>
                <select className="select-input" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Primary Doctor</label>
                <select className="select-input" value={form.primaryDoctor} onChange={e => set('primaryDoctor', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {DOCTORS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <input className="input" placeholder="Street, City - PIN" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Emergency Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Name</label>
                    <input className="input" placeholder="Contact name" value={form.ecName} onChange={e => set('ecName', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="input" placeholder="+91..." value={form.ecPhone} onChange={e => set('ecPhone', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Relation</label>
                    <input className="input" placeholder="e.g. Spouse" value={form.ecRelation} onChange={e => set('ecRelation', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Add Patient</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPatients({ onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [, forceRender] = useState(0);

  const handleAdd = (p: Patient) => {
    PATIENTS.push(p);
    setShowAdd(false);
    forceRender(n => n + 1);
  };

  const filtered = PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.bloodGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-scroll">
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      <div className="page-header">
        <div>
          <div className="page-title">Patients</div>
          <div className="page-subtitle">{PATIENTS.length} registered patients</div>
        </div>
        <button className="btn btn-primary" id="add-patient-btn" onClick={() => setShowAdd(true)}>
          + Add Patient
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, blood group…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="badge badge-info">{filtered.length} results</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <span className="empty-state-icon">👥</span>
            <h3>No patients yet</h3>
            <p>Click "+ Add Patient" to register the first patient.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Sex</th>
                  <th>Blood Group</th>
                  <th>Phone</th>
                  <th>Primary Doctor</th>
                  <th>Last Visit</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const bed = BEDS.find((b) => b.patientId === p.id && b.status === 'Occupied');
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate('admin-patient-detail', { patientId: p.id })}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar uri={p.photoURL} name={p.name} size={36} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.age} · {p.sex}</td>
                      <td><span className="tag">{p.bloodGroup}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.phone ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.primaryDoctor}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(p.lastVisit)}</td>
                      <td>
                        {bed ? <Badge label="Admitted" variant="info" /> : <Badge label="OPD" variant="neutral" />}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); onNavigate('admin-patient-detail', { patientId: p.id }); }}
                        >View →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
