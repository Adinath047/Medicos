// client/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

const DEMO = [
  { role: '🛡️ Admin',        email: 'admin@medicos.local',     password: 'Admin@123',  color: '#2563eb' },
  { role: '🩺 Doctor',        email: 'dr.sharma@medicos.local', password: 'Doctor@123', color: '#10b981' },
  { role: '📋 Receptionist',  email: 'reception@medicos.local', password: 'Recept@123', color: '#f59e0b' },
];

export default function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) setError('Invalid credentials. Use a demo account below.');
  }

  function fillDemo(d: typeof DEMO[0]) { setEmail(d.email); setPassword(d.password); setError(''); }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo-wrap" style={{ flexDirection:'column', alignItems:'center', textAlign:'center' }}>
          <div className="login-logo">🏥</div>
          <div>
            <div className="login-title">Medicos EMR</div>
            <div className="login-sub">Offline-First Hospital Records System</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {error && <div className="alert alert-danger">⚠️ {error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="doctor@hospital.local" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? <><div className="spinner spinner-sm"/>Signing in…</> : '→ Sign In'}
          </button>
        </form>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Quick Demo Logins</div>
          <div className="demo-chips">
            {DEMO.map(d => (
              <div key={d.email} className="demo-chip" onClick={() => fillDemo(d)}>
                <div style={{ width:28,height:28,borderRadius:8,background:d.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0 }}>
                  {d.role.split(' ')[0]}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{d.role.split(' ').slice(1).join(' ')}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{d.email}</div>
                </div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'var(--primary)', fontWeight:600 }}>→ Fill</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:14 }}>
          🔒 Data stored locally on this device · Works fully offline
        </div>
      </div>
    </div>
  );
}
