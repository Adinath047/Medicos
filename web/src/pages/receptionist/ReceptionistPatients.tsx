import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  PATIENTS, DOCTORS, HOSPITALS,
  type Patient, generateUHID,
} from '../../data/mockData';
import { useAuthStore } from '../../hooks/useAuthStore';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CHRONIC_LIST = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid Disorder', 'Kidney Disease', 'Arthritis', 'Epilepsy', 'COPD', 'Anaemia'];
const ALLERGY_LIST = ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'Latex', 'Dust', 'Pollen', 'Nuts', 'Seafood', 'Dairy'];

const EMPTY_FORM = {
  name: '', dob: '', age: '', sex: 'Male' as 'Male' | 'Female' | 'Other',
  phone: '', email: '', address: '',
  bloodGroup: 'B+', weight: '', height: '',
  allergies: [] as string[], chronicConditions: [] as string[],
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  govtIdType: 'Aadhaar' as 'Aadhaar' | 'Ration Card' | 'Voter ID' | 'Passport',
  govtIdNumber: '',
  insuranceProvider: '', insuranceNumber: '',
  primaryDoctorId: '',
};

export default function ReceptionistPatients({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId ?? '';

  const [patients, setPatients] = useState<Patient[]>(PATIENTS.filter(p => p.hospitalId === hospitalId));
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [newPatientUhid, setNewPatientUhid] = useState('');

  const myDoctors = DOCTORS.filter(d => d.hospitalId === hospitalId && d.status === 'Active');
  const hospital  = HOSPITALS.find(h => h.id === hospitalId);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // Auto-calculate age from DOB
  const handleDobChange = (dob: string) => {
    setForm(f => {
      const age = dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
        : 0;
      return { ...f, dob, age: String(age > 0 ? age : '') };
    });
  };

  const toggleList = (field: 'allergies' | 'chronicConditions', val: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.sex || !form.bloodGroup) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));

    const doc = myDoctors.find(d => d.id === form.primaryDoctorId);
    const uhid = generateUHID(hospitalId);
    const newId = `pat-${Date.now()}`;
    const newPatient: Patient = {
      id: newId,
      hospitalId,
      uhid,
      registeredBy: user?.id,
      name: form.name,
      dob: form.dob,
      age: parseInt(form.age) || 0,
      sex: form.sex,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address,
      bloodGroup: form.bloodGroup,
      weight: form.weight || undefined,
      height: form.height || undefined,
      allergies: form.allergies,
      chronicConditions: form.chronicConditions,
      emergencyContact: {
        name: form.emergencyName,
        phone: form.emergencyPhone,
        relation: form.emergencyRelation,
      },
      govtIdType: form.govtIdNumber ? form.govtIdType : undefined,
      govtIdNumber: form.govtIdNumber || undefined,
      insuranceProvider: form.insuranceProvider || undefined,
      insuranceNumber: form.insuranceNumber || undefined,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=db2777&color=fff&bold=true&size=128`,
      lastVisit: new Date().toISOString(),
      primaryDoctor: doc?.name ?? '',
      primaryDoctorId: form.primaryDoctorId || undefined,
    };

    PATIENTS.push(newPatient);
    setPatients(PATIENTS.filter(p => p.hospitalId === hospitalId));
    setSaving(false);
    setNewPatientUhid(uhid);
    showToast(`✅ Patient registered! UHID: ${uhid}`);
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return !q
      || p.name.toLowerCase().includes(q)
      || p.uhid.toLowerCase().includes(q)
      || (p.phone ?? '').includes(q);
  });

  return (
    <div className="page-scroll">
      {toast && <div className="alert alert-success">{toast}</div>}
      {newPatientUhid && (
        <div className="alert" style={{ background: '#ede9fe', border: '1px solid #c4b5fd', color: '#6d28d9', marginBottom: 8 }}>
          <strong>New Patient Registered!</strong> UHID: <code style={{ fontWeight: 800 }}>{newPatientUhid}</code> — Share this with the patient.
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Patient Registration</div>
          <div className="page-subtitle">{hospital?.name} · {patients.length} patients registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Register Walk-in Patient
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: 14 }}>
          <input
            className="input" style={{ maxWidth: 480 }}
            placeholder="🔍 Search by name, UHID or phone…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Patient table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>UHID</th>
                <th>Age / Sex</th>
                <th>Blood Group</th>
                <th>Phone</th>
                <th>Doctor</th>
                <th>Conditions</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <span className="empty-state-icon">👤</span>
                    <p>{patients.length === 0 ? 'No patients registered yet.' : 'No results.'}</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                      Register First Patient
                    </button>
                  </div>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={p.photoURL} name={p.name} size={34} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.allergies.length > 0 && (
                          <div style={{ fontSize: 10, color: '#ef4444' }}>⚠️ {p.allergies.slice(0,2).join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 11, fontWeight: 700 }}>{p.uhid}</code></td>
                  <td style={{ fontSize: 13 }}>{p.age}y · {p.sex}</td>
                  <td>
                    <span style={{
                      fontWeight: 800, fontSize: 12, padding: '2px 8px',
                      borderRadius: 8, background: '#fee2e2', color: '#b91c1c',
                    }}>{p.bloodGroup}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{p.phone ?? <span style={{ color: 'var(--text-muted)' }}>Not provided</span>}</td>
                  <td style={{ fontSize: 12 }}>{p.primaryDoctor || '—'}</td>
                  <td>
                    {p.chronicConditions.length === 0
                      ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>
                      : <span style={{ fontSize: 11, color: '#b45309' }}>{p.chronicConditions.slice(0,2).join(', ')}</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.lastVisit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Patient Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👤 Register Walk-in Patient</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>

              {/* Section: Basic Info */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Basic Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Full Name *</label>
                    <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Patient's full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="input" type="date" value={form.dob} onChange={e => handleDobChange(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age (years)</label>
                    <input className="input" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="If DOB unknown" min={0} max={130} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sex *</label>
                    <select className="input" value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value as any }))}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group *</label>
                    <select className="input" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                      {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight</label>
                    <input className="input" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 68 kg" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height</label>
                    <input className="input" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="e.g. 5'7&quot;" />
                  </div>
                </div>
              </div>

              {/* Section: Contact */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Contact Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Phone <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(optional)</span></label>
                    <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(optional)</span></label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="patient@email.com" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address</label>
                    <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full residential address" />
                  </div>
                </div>
              </div>

              {/* Section: Emergency Contact */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Emergency Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="input" value={form.emergencyName} onChange={e => setForm(f => ({ ...f, emergencyName: e.target.value }))} placeholder="Contact name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="input" value={form.emergencyPhone} onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relation</label>
                    <input className="input" value={form.emergencyRelation} onChange={e => setForm(f => ({ ...f, emergencyRelation: e.target.value }))} placeholder="e.g. Spouse, Parent" />
                  </div>
                </div>
              </div>

              {/* Section: Medical */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Medical History</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Known Allergies</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ALLERGY_LIST.map(a => (
                        <button
                          key={a} type="button"
                          onClick={() => toggleList('allergies', a)}
                          style={{
                            padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: '1.5px solid',
                            borderColor: form.allergies.includes(a) ? '#ef4444' : 'var(--border)',
                            background: form.allergies.includes(a) ? '#fee2e2' : 'transparent',
                            color: form.allergies.includes(a) ? '#b91c1c' : 'var(--text-muted)',
                            fontWeight: form.allergies.includes(a) ? 700 : 400,
                          }}
                        >{a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Chronic Conditions</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CHRONIC_LIST.map(c => (
                        <button
                          key={c} type="button"
                          onClick={() => toggleList('chronicConditions', c)}
                          style={{
                            padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: '1.5px solid',
                            borderColor: form.chronicConditions.includes(c) ? '#f59e0b' : 'var(--border)',
                            background: form.chronicConditions.includes(c) ? '#fffbeb' : 'transparent',
                            color: form.chronicConditions.includes(c) ? '#b45309' : 'var(--text-muted)',
                            fontWeight: form.chronicConditions.includes(c) ? 700 : 400,
                          }}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Govt ID & Insurance */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Identity & Insurance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Govt ID Type</label>
                    <select className="input" value={form.govtIdType} onChange={e => setForm(f => ({ ...f, govtIdType: e.target.value as any }))}>
                      <option>Aadhaar</option><option>Ration Card</option><option>Voter ID</option><option>Passport</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID Number</label>
                    <input className="input" value={form.govtIdNumber} onChange={e => setForm(f => ({ ...f, govtIdNumber: e.target.value }))} placeholder="ID number" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurance Provider</label>
                    <input className="input" value={form.insuranceProvider} onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))} placeholder="e.g. Star Health, PMJAY" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurance Number</label>
                    <input className="input" value={form.insuranceNumber} onChange={e => setForm(f => ({ ...f, insuranceNumber: e.target.value }))} placeholder="Policy / Member number" />
                  </div>
                </div>
              </div>

              {/* Section: Assign Doctor */}
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>Assign to Doctor</div>
                <div className="form-group">
                  <label className="form-label">Primary Doctor</label>
                  <select className="input" value={form.primaryDoctorId} onChange={e => setForm(f => ({ ...f, primaryDoctorId: e.target.value }))}>
                    <option value="">— Select a Doctor (optional) —</option>
                    {myDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} · {d.specialization} · ₹{d.consultationFee}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <div style={{
                padding: '8px 12px', borderRadius: 8, background: '#f0fdf4',
                border: '1px solid #86efac', fontSize: 12, color: '#15803d', marginRight: 'auto',
              }}>
                <strong>Auto-generated UHID:</strong> {generateUHID(hospitalId)}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Registering…' : '👤 Register Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
