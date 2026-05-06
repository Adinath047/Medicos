import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import {
  HOSPITALS, USERS, type Hospital, type HospitalType,
  generateHospitalId,
} from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const EMPTY_HOSPITAL = {
  name: '', type: 'Private' as HospitalType, address: '',
  city: '', state: '', pincode: '', phone: '', email: '',
  website: '', registrationNumber: '', specialties: [] as string[],
  adminId: '', adminName: '',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Chandigarh', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

const SPECIALTY_OPTIONS = [
  'Cardiology', 'Neurology', 'Oncology', 'Orthopaedics', 'Paediatrics',
  'Gynaecology', 'Dermatology', 'Psychiatry', 'Radiology', 'Pathology',
  'Emergency', 'General Medicine', 'Surgery', 'Maternity', 'Neonatology',
  'Nuclear Medicine', 'ENT', 'Ophthalmology', 'Urology', 'Nephrology',
];

export default function SuperAdminHospitals({ onNavigate }: Props) {
  const [hospitals, setHospitals] = useState<Hospital[]>(HOSPITALS);
  const [search, setSearch]       = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [typeFilter, setTypeFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_HOSPITAL });
  const [specInput, setSpecInput] = useState('');
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');

  const adminUsers = USERS.filter(u => u.role === 'admin');

  const filtered = hospitals.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q || h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.id.toLowerCase().includes(q);
    const matchState  = stateFilter === 'All' || h.state === stateFilter;
    const matchType   = typeFilter === 'All'  || h.type === typeFilter;
    const matchStatus = statusFilter === 'All' || h.status === statusFilter;
    return matchSearch && matchState && matchType && matchStatus;
  });

  const handleVerify = (id: string, verified: boolean) => {
    setHospitals(prev =>
      prev.map(h => h.id === id
        ? { ...h, verified, status: verified ? 'Active' : h.status }
        : h
      )
    );
    // also update source array
    const idx = HOSPITALS.findIndex(h => h.id === id);
    if (idx !== -1) { HOSPITALS[idx].verified = verified; HOSPITALS[idx].status = verified ? 'Active' : HOSPITALS[idx].status; }
  };

  const handleAddSpecialty = () => {
    if (specInput.trim() && !form.specialties.includes(specInput.trim())) {
      setForm(f => ({ ...f, specialties: [...f.specialties, specInput.trim()] }));
      setSpecInput('');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.city || !form.state || !form.registrationNumber) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    const newHosp: Hospital = {
      id: generateHospitalId(),
      ...form,
      adminId: form.adminId || 'u1',
      adminName: form.adminName || 'Assigned Admin',
      verified: false,
      status: 'Pending',
      totalDoctors: 0,
      totalPatients: 0,
      totalBeds: 0,
      createdAt: new Date().toISOString(),
    };
    HOSPITALS.push(newHosp);
    setHospitals([...HOSPITALS]);
    setSaving(false);
    setSuccess(`Hospital registered! ID: ${newHosp.id}`);
    setShowModal(false);
    setForm({ ...EMPTY_HOSPITAL });
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="page-scroll">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Hospital Registry</div>
          <div className="page-subtitle">{hospitals.length} hospitals · {hospitals.filter(h => h.verified).length} verified</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Register Hospital
        </button>
      </div>

      {success && (
        <div className="alert alert-success" role="alert">✅ {success}</div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <input
              className="input"
              placeholder="🔍 Search by name, city, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
              <option value="All">All States</option>
              {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              {['Government','Private','Clinic','Nursing Home','Diagnostic Centre'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option>Active</option><option>Pending</option><option>Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Hospital ID</th>
                <th>City, State</th>
                <th>Type</th>
                <th>Reg. No.</th>
                <th>Admin</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state" style={{ padding: 40 }}>
                      <span className="empty-state-icon">🏥</span>
                      <p>No hospitals found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(h => (
                <tr key={h.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.email}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {h.specialties.slice(0, 3).map(s => (
                        <span key={s} style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 8,
                          background: 'var(--surface-alt)', color: 'var(--text-muted)',
                        }}>{s}</span>
                      ))}
                      {h.specialties.length > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{h.specialties.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td><code style={{ fontSize: 11, letterSpacing: 0.4 }}>{h.id}</code></td>
                  <td><div style={{ fontWeight: 500 }}>{h.city}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.state} · {h.pincode}</div></td>
                  <td><Badge label={h.type} variant="info" /></td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{h.registrationNumber}</td>
                  <td style={{ fontSize: 12 }}>{h.adminName}</td>
                  <td><Badge label={h.status} variant={h.status === 'Active' ? 'success' : h.status === 'Pending' ? 'warning' : 'danger'} /></td>
                  <td>
                    {h.verified
                      ? <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>✓ Verified</span>
                      : <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>⏳ Pending</span>}
                  </td>
                  <td>
                    {!h.verified ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleVerify(h.id, true)}
                      >Verify ✓</button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleVerify(h.id, false)}
                      >Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Hospital Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏥 Register New Hospital</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Hospital Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Apollo Sunrise Hospital" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital Type *</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as HospitalType }))}>
                    <option>Government</option><option>Private</option><option>Clinic</option>
                    <option>Nursing Home</option><option>Diagnostic Centre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number *</label>
                  <input className="input" value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="e.g. DL-HOS-2024-00001" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address</label>
                  <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <select className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="input" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="6-digit pincode" maxLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91-XX-XXXXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hospital@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.hospital.com" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Assign Hospital Admin</label>
                  <select className="input" value={form.adminId} onChange={e => {
                    const u = adminUsers.find(u => u.id === e.target.value);
                    setForm(f => ({ ...f, adminId: e.target.value, adminName: u?.name ?? '' }));
                  }}>
                    <option value="">Select Admin</option>
                    {adminUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Specialties</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="input" value={specInput} onChange={e => setSpecInput(e.target.value)}>
                      <option value="">Choose specialty</option>
                      {SPECIALTY_OPTIONS.filter(s => !form.specialties.includes(s)).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button type="button" className="btn btn-secondary" onClick={handleAddSpecialty}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {form.specialties.map(s => (
                      <span key={s} style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 12,
                        background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {s}
                        <button type="button" onClick={() => setForm(f => ({ ...f, specialties: f.specialties.filter(x => x !== s) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 12 }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                fontSize: 12, color: '#0369a1', marginRight: 'auto',
              }}>
                <strong>Auto-generated ID:</strong> {generateHospitalId()}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Registering…' : '🏥 Register Hospital'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
