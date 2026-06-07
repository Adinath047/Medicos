// client/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { db, markPending } from '../db/localDB';
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
            <div style={{ marginRight:'auto' }}>
              <button type="button" className="btn btn-ghost btn-sm"
                style={{ color:'var(--danger)' }}
                disabled={saving}
                onClick={async () => {
                  if (!confirm(`Permanently remove ${user.name}?`)) return;
                  setSaving(true);
                  try {
                    await apiClient.delete(`/users/${user.id}`);
                    onDone({ ...user, _deleted: true });
                  } catch (err: any) {
                    setError(err?.response?.data?.error || 'Delete failed');
                    setSaving(false);
                  }
                }}>
                🗑 Delete
              </button>
            </div>
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

// ── Add Medicine Modal ────────────────────────────────────────────────
function AddMedicineModal({ onClose, onDone }: { onClose:()=>void; onDone:(m:any)=>void }) {
  const [form, setForm] = useState({
    name: '', generics: '', strengths: '', defaultDose: '', category: 'General'
  });
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Medicine name is required'); return; }
    onDone({
      name: form.name.trim(),
      generics: form.generics.split(',').map(x => x.trim()).filter(Boolean),
      strengths: form.strengths.split('\n').map(x => x.trim()).filter(Boolean),
      defaultDose: form.defaultDose.trim(),
      category: form.category.trim()
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add New Medicine</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{display:'flex', flexDirection:'column', gap:12}}>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group">
              <label className="form-label">Medicine Name *</label>
              <input className="input" placeholder="e.g. Paracetamol 500mg" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Generic Names (comma separated)</label>
              <input className="input" placeholder="e.g. Acetaminophen" value={form.generics} onChange={e=>setForm(f=>({...f, generics:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Available Strengths (one per line)</label>
              <textarea className="input" style={{minHeight:60}} placeholder="e.g.&#10;500 mg&#10;650 mg" value={form.strengths} onChange={e=>setForm(f=>({...f, strengths:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Dose Strength</label>
              <input className="input" placeholder="e.g. 500 mg" value={form.defaultDose} onChange={e=>setForm(f=>({...f, defaultDose:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="input" placeholder="e.g. Analgesics" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Medicine</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Medicine Modal ───────────────────────────────────────────────
function EditMedicineModal({ medicine, onClose, onDone, onDelete }: { medicine:any; onClose:()=>void; onDone:(id:string, m:any)=>void; onDelete:(id:string)=>void }) {
  const [form, setForm] = useState({
    name: medicine.name,
    generics: Array.isArray(medicine.generics) ? medicine.generics.join(', ') : '',
    strengths: Array.isArray(medicine.strengths) ? medicine.strengths.join('\n') : '',
    defaultDose: medicine.default_dose || '',
    category: medicine.category || '',
    is_active: medicine.is_active ?? 1
  });
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Medicine name is required'); return; }
    onDone(medicine.id, {
      name: form.name.trim(),
      generics: form.generics.split(',').map((x: string) => x.trim()).filter(Boolean),
      strengths: form.strengths.split('\n').map((x: string) => x.trim()).filter(Boolean),
      defaultDose: form.defaultDose.trim(),
      category: form.category.trim(),
      is_active: Number(form.is_active)
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Medicine</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{display:'flex', flexDirection:'column', gap:12}}>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group">
              <label className="form-label">Medicine Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Generic Names (comma separated)</label>
              <input className="input" value={form.generics} onChange={e=>setForm(f=>({...f, generics:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Available Strengths (one per line)</label>
              <textarea className="input" style={{minHeight:60}} value={form.strengths} onChange={e=>setForm(f=>({...f, strengths:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Dose Strength</label>
              <input className="input" value={form.defaultDose} onChange={e=>setForm(f=>({...f, defaultDose:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="input" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input" value={form.is_active} onChange={e=>setForm(f=>({...f, is_active:Number(e.target.value)}))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <div style={{ marginRight:'auto' }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => { if(confirm('Delete this medicine?')) onDelete(medicine.id); }}>
                🗑 Delete
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
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

  // Tab state
  const [activeTab, setActiveTab] = useState<'users'|'system'|'medicines'>(isAdmin ? 'users' : 'system');

  // Medicines manager state
  const [meds, setMeds] = useState<any[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medPage, setMedPage] = useState(0);
  const [showAddMed, setShowAddMed] = useState(false);
  const [editMed, setEditMed] = useState<any>(null);
  const medsPerPage = 12;

  // Load medicines from IndexedDB
  useEffect(() => {
    if (activeTab === 'medicines') {
      loadMedicines();
    }
  }, [activeTab]);

  async function loadMedicines() {
    const all = await db.medicines.toArray();
    all.sort((a, b) => a.name.localeCompare(b.name));
    setMeds(all);
  }

  async function handleAddMedicine(medData: any) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      hospital_id: user?.hospitalId || 'hsp-001',
      name: medData.name,
      generics: medData.generics,
      strengths: medData.strengths,
      default_dose: medData.defaultDose || null,
      category: medData.category || null,
      is_active: 1,
      created_at: now,
      updated_at: now
    };
    await markPending(db.medicines, payload, 'create');
    await db.medicines.put(payload);
    await loadMedicines();
    setShowAddMed(false);
  }

  async function handleUpdateMedicine(id: string, medData: any) {
    const existing = meds.find(m => m.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const payload = {
      ...existing,
      name: medData.name,
      generics: medData.generics,
      strengths: medData.strengths,
      default_dose: medData.defaultDose || null,
      category: medData.category || null,
      is_active: medData.is_active,
      updated_at: now
    };
    await markPending(db.medicines, payload, 'update');
    await db.medicines.put(payload);
    await loadMedicines();
    setEditMed(null);
  }

  async function handleDeleteMedicine(id: string) {
    const existing = meds.find(m => m.id === id);
    if (!existing) return;
    await markPending(db.medicines, existing, 'delete');
    await db.medicines.delete(id);
    await loadMedicines();
    setEditMed(null);
  }

  const filteredMeds = meds.filter(m => {
    if (!medSearch) return true;
    const q = medSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      (Array.isArray(m.generics) && m.generics.some((g: string) => g.toLowerCase().includes(q))) ||
      m.category?.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filteredMeds.length / medsPerPage);
  const paginatedMeds = filteredMeds.slice(medPage * medsPerPage, (medPage + 1) * medsPerPage);

  // Practitioner profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: (user as any)?.phone || '',
    specialization: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
    consultationFee: user?.consultationFee || 0,
    followupFee: user?.followupFee || 0,
    letterhead: user?.letterhead || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sync profileForm state if user loads/updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: (user as any).phone || '',
        specialization: user.specialization || '',
        licenseNumber: user.licenseNumber || '',
        consultationFee: user.consultationFee || 0,
        followupFee: user.followupFee || 0,
        letterhead: user.letterhead || '',
      });
    }
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      await apiClient.patch('/users/me/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        specialization: profileForm.specialization,
        license_number: profileForm.licenseNumber,
        consultation_fee: parseFloat(profileForm.consultationFee as any) || 0,
        followup_fee: parseFloat(profileForm.followupFee as any) || 0,
        letterhead: profileForm.letterhead,
      });
      setProfileSuccess('Practitioner profile updated successfully.');
      // Refresh the session to update user in authStore
      await useAuthStore.getState().restoreSession();
    } catch (err: any) {
      setProfileError(err?.response?.data?.error || 'Failed to update practitioner profile.');
    } finally {
      setSavingProfile(false);
    }
  }

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
      db.medicines.clear(), db.syncQueue.clear(), db.meta.clear(),
    ]);
    setCleared(true);
  }

  async function loadStats() {
    const [p,e,v,rx,a,b,q,m] = await Promise.all([
      db.patients.count(), db.encounters.count(), db.vitals.count(),
      db.prescriptions.count(), db.appointments.count(), db.billing.count(),
      db.syncQueue.count(), db.medicines.count(),
    ]);
    setDbStats({ patients:p, encounters:e, vitals:v, prescriptions:rx, appointments:a, billing:b, medicines:m, syncPending:q });
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
        {(isAdmin || user?.role === 'doctor') && (
          <button className={`tab${activeTab==='medicines'?' active':''}`} onClick={()=>setActiveTab('medicines')}>
            Medicines Directory
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
          {editUser && <EditUserModal user={editUser} onClose={()=>setEditUser(null)} onDone={updated=>{
            if (updated._deleted) {
              setStaff(s => s.filter(x => x.id !== updated.id));
            } else {
              setStaff(s => s.map(x=>x.id===updated.id?{...x,...updated}:x));
            }
            setEditUser(null);
          }} />}

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

          {user?.role === 'doctor' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Practitioner Settings</div>
              </div>
              <form onSubmit={handleSaveProfile} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}
                {profileError && <div className="alert alert-danger">{profileError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="input"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="input"
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <select
                      className="input"
                      value={profileForm.specialization}
                      onChange={e => setProfileForm(f => ({ ...f, specialization: e.target.value }))}
                    >
                      <option value="">— Select specialization —</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Medical Council License No.</label>
                    <input
                      className="input"
                      placeholder="e.g. MH-12345"
                      value={profileForm.licenseNumber}
                      onChange={e => setProfileForm(f => ({ ...f, licenseNumber: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee (₹) *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={profileForm.consultationFee}
                      onChange={e => setProfileForm(f => ({ ...f, consultationFee: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Fee (₹) *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={profileForm.followupFee}
                      onChange={e => setProfileForm(f => ({ ...f, followupFee: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Custom Letterhead</label>
                    
                    {profileForm.letterhead && profileForm.letterhead.startsWith('data:image/') ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Current Letterhead Banner Image:</div>
                        <div style={{ position: 'relative', display: 'inline-block', border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
                          <img src={profileForm.letterhead} style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} alt="Letterhead Preview" />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', color: 'var(--danger)', padding: '2px 6px', minHeight: 'auto', border: '1px solid #fee2e2' }}
                            onClick={() => setProfileForm(f => ({ ...f, letterhead: '' }))}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Custom Header Text (Optional)</label>
                          <textarea
                            className="input"
                            style={{ fontFamily: 'monospace', minHeight: 80 }}
                            placeholder="e.g.&#10;DR. PRIYA SHARMA, MD&#10;Cardiologist&#10;Reg No: MH-12345 · Phone: +91 98765 43210"
                            value={profileForm.letterhead}
                            onChange={e => setProfileForm(f => ({ ...f, letterhead: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 12, background: 'var(--surface-alt)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Or Upload Letterhead Image banner (replaces text)</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              setProfileForm(f => ({ ...f, letterhead: base64 }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                        Recommended size: 800x120px (under 1MB). This banner image or custom text will override the default hospital branding header on printed prescriptions.
                      </small>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingProfile}>
                  {savingProfile ? <><div className="spinner spinner-sm" />Saving Profile…</> : 'Save Profile'}
                </button>
              </form>
            </div>
          )}

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
      {/* ── Medicines Directory tab ── */}
      {activeTab === 'medicines' && (isAdmin || user?.role === 'doctor') && (
        <>
          {showAddMed && <AddMedicineModal onClose={()=>setShowAddMed(false)} onDone={handleAddMedicine} />}
          {editMed && <EditMedicineModal medicine={editMed} onClose={()=>setEditMed(null)} onDone={handleUpdateMedicine} onDelete={handleDeleteMedicine} />}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div className="card-title">
                Medicines Master Directory
                <span style={{marginLeft:8,fontSize:11,color:'var(--text-muted)',fontWeight:400}}>({filteredMeds.length} items)</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ width: 220, height: 36, padding: '0 12px' }}
                  placeholder="Search medicines..."
                  value={medSearch}
                  onChange={e => { setMedSearch(e.target.value); setMedPage(0); }}
                />
                <button className="btn btn-primary btn-sm" onClick={()=>setShowAddMed(true)}>+ Add Medicine</button>
              </div>
            </div>

            {paginatedMeds.length === 0
              ? <div className="empty-state"><span className="empty-icon">💊</span><h3>No medicines found</h3><p>Try searching for a different keyword or add a new medicine.</p></div>
              : <>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine Name</th>
                          <th>Generics</th>
                          <th>Category</th>
                          <th>Strengths</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedMeds.map(m => (
                          <tr key={m.id}>
                            <td>
                              <div>
                                <div style={{fontWeight:600,fontSize:13}}>{m.name}</div>
                                {m.default_dose && <small style={{color:'var(--text-muted)'}}>Default Dose: {m.default_dose}</small>}
                              </div>
                            </td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>
                              {Array.isArray(m.generics) && m.generics.length > 0 ? m.generics.join(', ') : '—'}
                            </td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>{m.category || '—'}</td>
                            <td style={{fontSize:12,color:'var(--text-muted)'}}>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {Array.isArray(m.strengths) && m.strengths.map((s: string) => (
                                  <span key={s} className="badge badge-neutral" style={{ fontSize: 10 }}>{s}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${m.is_active !== 0 ? 'badge-success' : 'badge-neutral'}`}>
                                {m.is_active !== 0 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={()=>setEditMed(m)}>Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                      <button className="btn btn-secondary btn-sm" disabled={medPage === 0} onClick={() => setMedPage(p => Math.max(0, p - 1))}>
                        Previous
                      </button>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {medPage + 1} of {totalPages}</span>
                      <button className="btn btn-secondary btn-sm" disabled={medPage >= totalPages - 1} onClick={() => setMedPage(p => Math.min(totalPages - 1, p + 1))}>
                        Next
                      </button>
                    </div>
                  )}
                </>
            }
          </div>
        </>
      )}
    </>
  );
}
