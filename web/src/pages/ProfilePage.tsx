import React, { useRef, useState } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  USERS, DOCTORS, PATIENTS, Doctor, Patient,
} from '../data/mockData';

interface Props { onNavigate: (page: string) => void; }

const SPECIALIZATIONS = [
  'Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology',
  'Oncology','Gynecology','Psychiatry','General Surgery','Internal Medicine',
  'ENT','Ophthalmology','Urology','Nephrology','Radiology','General Practice',
];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── Photo Upload Button ──────────────────────────────────────────────────────
function PhotoUpload({ photoURL, name, onPhoto }: {
  photoURL?: string; name: string; onPhoto: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
        border: '3px solid var(--primary)', boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
        background: 'var(--primary-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }} onClick={() => inputRef.current?.click()}>
        {photoURL ? (
          <img src={photoURL} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#fff', fontSize: 36, fontWeight: 800, fontFamily: 'inherit' }}>{initials}</span>
        )}
      </div>
      {/* Camera overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          border: '2px solid var(--surface)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
          transition: 'transform 0.15s',
        }}
        title="Change photo"
      >📷</button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Doctor Profile Section ───────────────────────────────────────────────────
function DoctorSection({ userId, userEmail, userName, photoURL }: {
  userId: string; userEmail: string; userName: string; photoURL?: string;
}) {
  const existing = DOCTORS.find(d => d.userId === userId || d.email === userEmail);
  const [saved, setSaved]   = useState(false);
  const [, forceRender]     = useState(0);

  const [form, setForm] = useState({
    specialization: existing?.specialization ?? 'General Practice',
    experience:     String(existing?.experience ?? ''),
    nmcNumber:      existing?.nmcNumber ?? '',
    phone:          existing?.phone ?? '',
    email:          existing?.email ?? userEmail,
    bio:            existing?.bio ?? '',
  });
  const [schedule, setSchedule] = useState(
    existing?.schedule ?? [{ day: 'Mon', startTime: '09:00', endTime: '17:00' }]
  );
  const [slotDay, setSlotDay]   = useState('Mon');
  const [slotFrom, setSlotFrom] = useState('09:00');
  const [slotTo, setSlotTo]     = useState('17:00');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addSlot = () => {
    if (schedule.some(s => s.day === slotDay)) return;
    setSchedule(s => [...s, { day: slotDay, startTime: slotFrom, endTime: slotTo }]);
  };
  const removeSlot = (day: string) => setSchedule(s => s.filter(x => x.day !== day));

  const handleSave = () => {
    if (existing) {
      // Update in-place
      existing.specialization = form.specialization;
      existing.experience     = parseInt(form.experience) || 0;
      existing.nmcNumber      = form.nmcNumber;
      existing.phone          = form.phone;
      existing.email          = form.email;
      existing.bio            = form.bio;
      existing.schedule       = schedule;
      existing.photoURL       = photoURL ?? existing.photoURL;
    } else {
      // Create new doctor record
      const newDoc: Doctor = {
        id:             `d${Date.now()}`,
        userId,
        hospitalId:     'hsp-001',
        name:           userName,
        type:           'Specialist',
        email:          form.email,
        phone:          form.phone,
        nmcNumber:      form.nmcNumber || `NMC-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,
        nmcVerified:    false,
        govtIdType:     'Aadhaar',
        govtIdNumber:   '',
        govtIdVerified: false,
        dateOfBirth:    '1990-01-01',
        gender:         'Male',
        achievements:   [],
        languages:      [],
        consultationFee: 500,
        qualifications: 'MBBS',
        specialization: form.specialization,
        status:         'Pending Verification',
        experience:     parseInt(form.experience) || 0,
        patientsCount:  0,
        bio:            form.bio || `${form.specialization} specialist.`,
        photoURL:       photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=10b981&color=fff&bold=true&size=128`,
        schedule,
      };
      DOCTORS.push(newDoc);
    }
    setSaved(true);
    forceRender(n => n + 1);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🩺 Doctor Profile {!existing && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Incomplete</span>}</div>
        {!existing && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>Complete to unlock your dashboard</span>}
      </div>
      <div className="card-body">
        {!existing && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            📋 Fill in your details below to activate your Doctor Dashboard.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label">Specialization</label>
            <select className="select-input" value={form.specialization} onChange={e => set('specialization', e.target.value)}>
              {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Experience (years)</label>
            <input className="input" type="number" min="0" max="60" placeholder="e.g. 8"
              value={form.experience} onChange={e => set('experience', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Registration Number</label>
            <input className="input" placeholder="NMC-YYYY-XXXX (auto if blank)"
              value={form.nmcNumber} onChange={e => set('nmcNumber', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="input" placeholder="+91 98765 43210"
              value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Bio / About</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical' }}
              placeholder="Brief professional summary about your experience and approach…"
              value={form.bio} onChange={e => set('bio', e.target.value)} />
          </div>

          {/* Schedule builder */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Consultation Schedule</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <label className="form-label">Day</label>
                <select className="select-input" style={{ width: 90 }} value={slotDay} onChange={e => setSlotDay(e.target.value)}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">From</label>
                <input className="input" type="time" style={{ width: 120 }} value={slotFrom} onChange={e => setSlotFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input className="input" type="time" style={{ width: 120 }} value={slotTo} onChange={e => setSlotTo(e.target.value)} />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSlot} style={{ alignSelf: 'flex-end' }}>
                + Add Slot
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {schedule.map(s => (
                <span key={s.day} className="tag" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {s.day} {s.startTime}–{s.endTime}
                  <button type="button" onClick={() => removeSlot(s.day)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, padding: 0, fontSize: 12 }}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {existing ? '✓ Save Changes' : '✓ Create Doctor Profile'}
          </button>
          {saved && <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>✅ Saved!</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Patient Profile Section ──────────────────────────────────────────────────
function PatientSection({ userId, userEmail, photoURL }: {
  userId: string; userEmail: string; photoURL?: string;
}) {
  const existing = PATIENTS.find(p => p.userId === userId || p.email === userEmail);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    phone:      existing?.phone ?? '',
    address:    existing?.address ?? '',
    bloodGroup: existing?.bloodGroup ?? 'O+',
    ecName:     existing?.emergencyContact?.name ?? '',
    ecPhone:    existing?.emergencyContact?.phone ?? '',
    ecRelation: existing?.emergencyContact?.relation ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (existing) {
      existing.phone      = form.phone;
      existing.address    = form.address;
      existing.bloodGroup = form.bloodGroup;
      existing.emergencyContact = {
        name: form.ecName, phone: form.ecPhone, relation: form.ecRelation,
      };
      if (photoURL) existing.photoURL = photoURL;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!existing) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-info">
            🏥 Your patient profile hasn't been created by the admin yet. Contact the hospital reception to register your medical record.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">🏥 My Health Profile</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Age: {existing.age} · {existing.sex} · {existing.bloodGroup}
        </span>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label">Phone</label>
            <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Blood Group</label>
            <select className="select-input" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
              {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <input className="input" placeholder="Street, City - PIN" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Emergency Contact</div>
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

          {existing.allergies.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="section-label" style={{ marginBottom: 8 }}>⚠️ Allergies</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {existing.allergies.map(a => <span key={a} className="badge badge-danger">{a}</span>)}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleSave}>✓ Save Changes</button>
          {saved && <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>✅ Saved!</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordSection({ userId }: { userId: string }) {
  const [form, setForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk]       = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setOk(false);
    const user = USERS.find(u => u.id === userId);
    if (!user) return;
    if (form.current !== user.password) { setError('Current password is incorrect.'); return; }
    if (form.newPw.length < 6)          { setError('New password must be at least 6 characters.'); return; }
    if (form.newPw !== form.confirm)    { setError('Passwords do not match.'); return; }
    user.password = form.newPw;
    setForm({ current: '', newPw: '', confirm: '' });
    setOk(true);
    setTimeout(() => setOk(false), 4000);
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">🔐 Change Password</div></div>
      <div className="card-body">
        <form onSubmit={handle}>
          {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>⚠️ {error}</div>}
          {ok    && <div className="alert alert-success" style={{ marginBottom: 14 }}>✅ Password changed successfully!</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Current Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.current} onChange={e => set('current', e.target.value)} />
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters"
                value={form.newPw} onChange={e => set('newPw', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat new password"
                value={form.confirm} onChange={e => set('confirm', e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage({ onNavigate }: Props) {
  const { user, role, logout } = useAuthStore();
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name ?? '');

  if (!user) return null;

  const handlePhoto = (url: string) => {
    setPhotoURL(url);
    // Update USERS array
    const u = USERS.find(x => x.id === user.id);
    if (u) u.photoURL = url;
    // Update doctor or patient array too
    const doc = DOCTORS.find(d => d.userId === user.id || d.email === user.email);
    if (doc) doc.photoURL = url;
    const pat = PATIENTS.find(p => p.userId === user.id || p.email === user.email);
    if (pat) pat.photoURL = url;
    // Update auth store reactively
    const current = useAuthStore.getState().user;
    if (current) useAuthStore.setState({ user: { ...current, photoURL: url } });
  };

  const handleSaveName = () => {
    const u = USERS.find(x => x.id === user.id);
    if (u && displayName.trim()) {
      u.name = displayName.trim();
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.setState({ user: { ...current, name: displayName.trim() } });
    }
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 3000);
  };

  return (
    <div className="page-scroll">
      {/* ── Profile header ── */}
      <div style={{
        background: 'linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%)',
        borderRadius: 'var(--radius-xl)', padding: '32px 28px',
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
        marginBottom: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <PhotoUpload photoURL={photoURL} name={user.name} onPhoto={handlePhoto} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{
                background: 'transparent', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,0.4)',
                color: '#fff', fontSize: 24, fontWeight: 800, outline: 'none',
                padding: '2px 4px', width: 'auto', minWidth: 120,
                letterSpacing: -0.5,
              }}
              onBlur={handleSaveName}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            {nameSaved && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>✓ saved</span>}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 10 }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 20,
              padding: '4px 14px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              {role === 'admin' ? '🛡️' : role === 'doctor' ? '🩺' : '👤'} {role}
            </span>
            <span style={{
              background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', borderRadius: 20,
              padding: '4px 14px', fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              ● Active
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
          <div style={{ marginBottom: 4 }}>Click avatar to</div>
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>change photo 📷</div>
        </div>
      </div>

      {/* ── Account Info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Account ID', value: user.id, icon: '#️⃣' },
          { label: 'Email',      value: user.email, icon: '✉️' },
          { label: 'Role',       value: role ?? '—', icon: '🔖' },
          { label: 'Status',     value: 'Active',   icon: '✅' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2, wordBreak: 'break-all' }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Role-specific section ── */}
      {role === 'doctor' && (
        <DoctorSection userId={user.id} userEmail={user.email} userName={user.name} photoURL={photoURL || undefined} />
      )}
      {role === 'patient' && (
        <PatientSection userId={user.id} userEmail={user.email} photoURL={photoURL || undefined} />
      )}
      {role === 'admin' && (
        <div className="card">
          <div className="card-header"><div className="card-title">🛡️ Admin Access</div></div>
          <div className="card-body">
            <div className="alert alert-info">
              You have full administrative access to Medicos Hospital Management System. Manage doctors, patients, beds, billing, and prescriptions from the sidebar.
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password ── */}
      <ChangePasswordSection userId={user.id} />

      {/* ── Danger Zone ── */}
      <div className="card" style={{ border: '1.5px solid var(--danger)' }}>
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--danger)' }}>⚠️ Account Actions</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-danger" onClick={logout}>
              🚪 Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
