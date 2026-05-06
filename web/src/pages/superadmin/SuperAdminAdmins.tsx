import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { USERS, HOSPITALS, STAFF, type User } from '../../data/mockData';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function SuperAdminAdmins({ onNavigate }: Props) {
  const [adminUsers, setAdminUsers] = useState<User[]>(
    USERS.filter(u => u.role === 'admin')
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', hospitalId: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const unassignedHospitals = HOSPITALS.filter(h =>
    !adminUsers.some(u => u.hospitalId === h.id)
  );

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const newUser: User = {
      id: `u${Date.now()}`,
      email: form.email,
      password: form.password,
      role: 'admin',
      name: form.name,
      hospitalId: form.hospitalId || undefined,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=2563eb&color=fff&bold=true&size=128`,
    };
    USERS.push(newUser);
    setAdminUsers(USERS.filter(u => u.role === 'admin'));
    setSaving(false);
    showToast(`✅ Admin account created for ${form.name}`);
    setShowModal(false);
    setForm({ name: '', email: '', password: '', hospitalId: '' });
  };

  return (
    <div className="page-scroll">
      {toast && <div className="alert alert-success">{toast}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Admin Accounts</div>
          <div className="page-subtitle">Hospital administrators across the platform</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Create Admin Account
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Admins', value: adminUsers.length, icon: '🛡️', color: '#2563eb', bg: '#eff6ff' },
          { label: 'Hospitals Covered', value: adminUsers.filter(u => u.hospitalId).length, icon: '🏥', color: '#10b981', bg: '#ecfdf5' },
          { label: 'Unassigned Hospitals', value: unassignedHospitals.length, icon: '⚠️', color: '#f59e0b', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: s.bg, border: `1.5px solid ${s.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admins table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🛡️ Hospital Admins</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Email</th>
                <th>Assigned Hospital</th>
                <th>Hospital Type</th>
                <th>City</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(u => {
                const hosp = HOSPITALS.find(h => h.id === u.hospitalId);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar uri={u.photoURL} name={u.name} size={34} />
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      {hosp
                        ? <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{hosp.name}</div>
                            <code style={{ fontSize: 10 }}>{hosp.id}</code>
                          </div>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not assigned</span>}
                    </td>
                    <td>{hosp ? <Badge label={hosp.type} variant="info" /> : '—'}</td>
                    <td style={{ fontSize: 12 }}>{hosp?.city ?? '—'}</td>
                    <td><Badge label={hosp ? 'Active' : 'Pending'} variant={hosp ? 'success' : 'warning'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Also show receptionist staff */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏥 All Platform Staff</div>
          <span className="badge badge-info">{STAFF.length} staff</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Staff ID</th>
                <th>Role</th>
                <th>Hospital</th>
                <th>Shift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {STAFF.length === 0 ? (
                <tr><td colSpan={6}>
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No staff registered yet
                  </div>
                </td></tr>
              ) : STAFF.map(s => {
                const hosp = HOSPITALS.find(h => h.id === s.hospitalId);
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar uri={undefined} name={s.name} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 11 }}>{s.staffId}</code></td>
                    <td><Badge label={s.role} variant="info" /></td>
                    <td style={{ fontSize: 12 }}>{hosp?.name ?? s.hospitalId}</td>
                    <td style={{ fontSize: 12 }}>{s.shift}</td>
                    <td><Badge label={s.status} variant={s.status === 'Active' ? 'success' : 'danger'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🛡️ Create Admin Account</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Admin's full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@hospital.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password *</label>
                  <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set initial password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Hospital</label>
                  <select className="input" value={form.hospitalId} onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value }))}>
                    <option value="">— Select Hospital (optional) —</option>
                    {HOSPITALS.map(h => (
                      <option key={h.id} value={h.id}>{h.name} · {h.city}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="alert" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', marginTop: 16, fontSize: 12 }}>
                💡 The admin will be able to log in immediately with these credentials and should change their password after first login.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.email || !form.password}>
                {saving ? 'Creating…' : '🛡️ Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
