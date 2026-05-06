// client/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../db/localDB';
import { syncNow } from '../sync/syncManager';
import { useSync } from '../sync/useSync';
import { apiClient } from '../api/client';

const ROLES = ['doctor','nurse','receptionist','admin'] as const;
const SPECIALIZATIONS = [
  'General Medicine','General Surgery','Pediatrics','Obstetrics & Gynaecology',
  'Cardiology','Cardiothoracic Surgery','Neurology','Neurosurgery',
  'Orthopedics','Ophthalmology','ENT','Dermatology','Psychiatry',
  'Pulmonology','Nephrology','Urology','Gastroenterology','Oncology',
  'Endocrinology','Rheumatology','Anesthesiology','Radiology',
  'Pathology','Dentistry','Physiotherapy','Emergency Medicine','Other',
];

const ROLE_COLORS: Record<string,string> = {
  admin:'badge-danger', doctor:'badge-info', nurse:'badge-success', receptionist:'badge-warning',
};
const ROLE_LABELS: Record<string,string> = {
  admin:'Admin', doctor:'Doctor', nurse:'Nurse', receptionist:'Receptionist',
};

// ── Add Staff Modal ───────────────────────────────────────────────────
function AddUserModal({ onClose, onDone }: { onClose:()=>void; onDone:(u:any)=>void }) {
  const [form, setForm] = useState({
    name:'', email:'', password:'', role:'doctor' as typeof ROLES[number],
    specialization:'', phone:'', license_number:'',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k:string, v:string) => setForm(f => ({...f,[k]:v}));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) { setError('Name, email and password are required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiClient.post('/users', form);
      onDone(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create user. Is the server running?');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Staff Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{gridColumn:'1/-1'}} className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="Dr. Ramesh Kumar" value={form.name} onChange={e=>set('name',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="input" type="email" placeholder="dr.kumar@hospital.local" value={form.email} onChange={e=>set('email',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="input" value={form.role} onChange={e=>set('role',e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e=>set('password',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e=>set('phone',e.target.value)} />
              </div>

              {form.role === 'doctor' && <>
                <div style={{gridColumn:'1/-1'}} className="form-group">
                  <label className="form-label">Specialization</label>
                  <select className="input" value={form.specialization} onChange={e=>set('specialization',e.target.value)}>
                    <option value="">— Select specialization —</option>
                    {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}} className="form-group">
                  <label className="form-label">Medical Council License No.</label>
                  <input className="input" placeholder="e.g. MH-12345" value={form.license_number} onChange={e=>set('license_number',e.target.value)} />
                </div>
              </>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner spinner-sm"/>Adding…</> : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Staff Modal ──────────────────────────────────────────────────
function EditUserModal({ user, onClose, onDone }: { user:any; onClose:()=>void; onDone:(u:any)=>void }) {
  const [form, setForm] = useState({
    name: user.name, phone: user.phone||'', specialization: user.specialization||'', license_number: user.license_number||'', is_active: user.is_active,
  });
  const [newPwd, setNewPwd]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [pwdSaving, setPwdSave] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const set = (k:string, v:any) => setForm(f => ({...f,[k]:v}));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await apiClient.patch(`/users/${user.id}`, form);
      setSuccess('Saved successfully');
      onDone({ ...user, ...form });
    } catch (err:any) { setError(err?.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function resetPwd() {
    if (!newPwd || newPwd.length < 6) { setError('Password must be at least 6 characters'); return; }
    setPwdSave(true); setError(''); setSuccess('');
    try {
      await apiClient.post(`/users/${user.id}/reset-password`, { password: newPwd });
      setSuccess('Password reset successfully'); setNewPwd('');
    } catch (err:any) { setError(err?.response?.data?.error || 'Reset failed'); }
    finally { setPwdSave(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{user.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{user.email} · <span className={`badge ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            {error   && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{gridColumn:'1/-1'}} className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input" value={form.is_active} onChange={e=>set('is_active', Number(e.target.value))}>
                  <option value={1}>Active</option>
                  <option value={0}>Deactivated</option>
                </select>
              </div>
              {user.role === 'doctor' && <>
                <div style={{gridColumn:'1/-1'}} className="form-group">
                  <label className="form-label">Specialization</label>
                  <select className="input" value={form.specialization} onChange={e=>set('specialization',e.target.value)}>
                    <option value="">— None —</option>
                    {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}} className="form-group">
                  <label className="form-label">License Number</label>
                  <input className="input" value={form.license_number} onChange={e=>set('license_number',e.target.value)} />
                </div>
              </>}
            </div>

            {/* Password reset section */}
            <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginTop:4}}>
              <div className="form-label" style={{marginBottom:8}}>Reset Password</div>
              <div style={{display:'flex',gap:8}}>
                <input className="input" type="password" placeholder="New password (min 6 chars)" value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={resetPwd} disabled={pwdSaving}>
                  {pwdSaving ? <div className="spinner spinner-sm"/> : 'Reset'}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner spinner-sm"/>Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const { syncState, pendingCount } = useSync();
  const isAdmin = user?.role === 'admin';

  // User management state
  const [staff, setStaff]       = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [roleFilter, setRoleFilter] = useState('all');

  // System state
  const [cleared, setCleared]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [dbStats, setDbStats]   = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users'|'system'>(isAdmin ? 'users' : 'system');

  useEffect(() => {
    if (isAdmin) loadStaff();
  }, [isAdmin]);

  async function loadStaff() {
    setLoadingStaff(true); setStaffError('');
    try {
      const res = await apiClient.get('/users');
      setStaff(res.data.users);
    } catch (e:any) {
      setStaffError(e?.response?.data?.error || 'Cannot load staff — is the server running?');
    } finally { setLoadingStaff(false); }
  }

  async function forceSync() {
    setSyncing(true);
    try { await syncNow(); } finally { setSyncing(false); }
  }

  async function clearLocal() {
    if (!confirm('Clear all local IndexedDB data? Server data is preserved.')) return;
    await Promise.all([
      db.patients.clear(), db.encounters.clear(), db.vitals.clear(),
      db.prescriptions.clear(), db.appointments.clear(), db.billing.clear(),
      db.syncQueue.clear(), db.meta.clear(),
    ]);
    setCleared(true);
  }

  async function loadStats() {
    const [p,e,v,rx,a,b,q] = await Promise.all([
      db.patients.count(), db.encounters.count(), db.vitals.count(),
      db.prescriptions.count(), db.appointments.count(), db.billing.count(),
      db.syncQueue.count(),
    ]);
    setDbStats({ patients:p, encounters:e, vitals:v, prescriptions:rx, appointments:a, billing:b, syncPending:q });
  }

  const filteredStaff = roleFilter === 'all' ? staff : staff.filter(s => s.role === roleFilter);

  const staffByRole = {
    all: staff.length,
    doctor: staff.filter(s=>s.role==='doctor').length,
    nurse: staff.filter(s=>s.role==='nurse').length,
    receptionist: staff.filter(s=>s.role==='receptionist').length,
    admin: staff.filter(s=>s.role==='admin').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Manage staff, system & preferences</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{width:'100%'}}>
        {isAdmin && (
          <button className={`tab${activeTab==='users'?' active':''}`} onClick={()=>setActiveTab('users')}>
            Staff Management
          </button>
        )}
        <button className={`tab${activeTab==='system'?' active':''}`} onClick={()=>setActiveTab('system')}>
          System
        </button>
      </div>

      {/* ── Staff Management tab ── */}
      {activeTab === 'users' && isAdmin && (
        <>
          {showAdd && <AddUserModal onClose={()=>setShowAdd(false)} onDone={u=>{ setStaff(s=>[u,...s]); setShowAdd(false); }} />}
          {editUser && <EditUserModal user={editUser} onClose={()=>setEditUser(null)} onDone={updated=>{ setStaff(s=>s.map(x=>x.id===updated.id?{...x,...updated}:x)); setEditUser(null); }} />}

          {/* Stats row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
            {(['all','doctor','nurse','receptionist','admin'] as const).map(r => (
              <div key={r}
                onClick={()=>setRoleFilter(r)}
                style={{
                  background: roleFilter===r ? 'var(--primary-light)' : 'var(--surface)',
                  border: `1px solid ${roleFilter===r ? 'var(--primary-mid)' : 'var(--border)'}`,
                  borderRadius:'var(--radius-lg)', padding:'12px 14px',
                  cursor:'pointer', transition:'all 0.12s',
                }}>
                <div style={{fontSize:22,fontWeight:700,color:roleFilter===r?'var(--primary)':'var(--text)'}}>{staffByRole[r]}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize',marginTop:2}}>{r==='all'?'Total Staff':ROLE_LABELS[r]+'s'}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                {roleFilter==='all' ? 'All Staff' : `${ROLE_LABELS[roleFilter]}s`}
                <span style={{marginLeft:8,fontSize:11,color:'var(--text-muted)',fontWeight:400}}>({filteredStaff.length})</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}>+ Add Staff</button>
            </div>

            {staffError && <div className="alert alert-warning" style={{margin:16}}>{staffError}</div>}

            {loadingStaff
              ? <div style={{padding:40,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
              : filteredStaff.length === 0
                ? <div className="empty-state"><span className="empty-icon">👥</span><h3>No staff found</h3><p>Add your first staff member.</p></div>
                : <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Specialization</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:10}}>
                                <div style={{
                                  width:32,height:32,borderRadius:'50%',
                                  background:`var(--primary-grad)`,color:'#fff',
                                  display:'flex',alignItems:'center',justifyContent:'center',
                                  fontSize:12,fontWeight:700,flexShrink:0,
                                  opacity: s.is_active ? 1 : 0.4,
                                }}>
                                  {s.name?.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
                                </div>
                                <div>
                                  <div style={{fontWeight:600,fontSize:13}}>{s.name}</div>
                                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className={`badge ${ROLE_COLORS[s.role]}`}>{ROLE_LABELS[s.role]}</span></td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>{s.specialization || '—'}</td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>{s.phone || '—'}</td>
                            <td>
                              <span className={`badge ${s.is_active ? 'badge-success' : 'badge-neutral'}`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={()=>setEditUser(s)}>Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
            }
          </div>
        </>
      )}

      {/* ── System tab ── */}
      {activeTab === 'system' && (
        <>
          {/* Profile */}
          <div className="card">
            <div className="card-header"><div className="card-title">My Profile</div></div>
            <div className="card-body">
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:52,height:52,borderRadius:14,background:'var(--primary-grad)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700}}>
                  {user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:700}}>{user?.name}</div>
                  <div style={{color:'var(--text-muted)',fontSize:13}}>{user?.email}</div>
                  <div style={{marginTop:5}}><span className={`badge ${ROLE_COLORS[user?.role||'doctor']}`} style={{textTransform:'capitalize'}}>{ROLE_LABELS[user?.role||'doctor']}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync */}
          <div className="card">
            <div className="card-header"><div className="card-title">Sync Status</div></div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {[
                  { label:'Pending Records', value:pendingCount, color: pendingCount>0?'var(--warning)':'var(--success)' },
                  { label:'Connection', value: navigator.onLine?'Online':'Offline', color: navigator.onLine?'var(--success)':'var(--danger)' },
                  { label:'Sync State', value: syncState, color:'var(--primary)' },
                ].map(x=>(
                  <div key={x.label} style={{flex:1,minWidth:120,background:'var(--surface-alt)',borderRadius:'var(--radius)',padding:'12px 14px',textAlign:'center',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:20,fontWeight:700,color:x.color,textTransform:'capitalize'}}>{x.value}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{x.label}</div>
                  </div>
                ))}
              </div>
              {pendingCount > 0 && <div className="alert alert-warning">⚠ {pendingCount} records waiting to sync. Connect to hospital network and click Sync Now.</div>}
              <button className="btn btn-primary" style={{alignSelf:'flex-start'}} onClick={forceSync} disabled={syncing}>
                {syncing ? <><div className="spinner spinner-sm"/>Syncing…</> : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* DB Stats */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Local Database</div>
              <button className="btn btn-secondary btn-sm" onClick={loadStats}>Refresh</button>
            </div>
            <div className="card-body">
              {!dbStats
                ? <button className="btn btn-ghost" onClick={loadStats}>Load statistics</button>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:10}}>
                    {Object.entries(dbStats).map(([k,v]:any)=>(
                      <div key={k} style={{background:'var(--surface-alt)',borderRadius:'var(--radius)',padding:'12px',textAlign:'center',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:22,fontWeight:700,color:'var(--primary)'}}>{v}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{k}</div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Danger zone */}
          <div className="card" style={{border:'1px solid var(--danger-border)'}}>
            <div className="card-header" style={{background:'var(--danger-bg)'}}>
              <div className="card-title" style={{color:'var(--danger)'}}>Danger Zone</div>
            </div>
            <div className="card-body">
              {cleared
                ? <div className="alert alert-success">Local cache cleared. Please reload the page.</div>
                : <>
                    <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>
                      Clear all locally cached data from this device. Server data (SQLite) is NOT affected.
                    </p>
                    <button className="btn btn-danger btn-sm" onClick={clearLocal}>Clear Local Cache</button>
                  </>
              }
            </div>
          </div>
        </>
      )}
    </>
  );
}
