// client/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { validateEmail, validateRequired } from '../utils/validation';

export default function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [loading, setLoading]   = useState(false);

  function validate(): boolean {
    const errs: Record<string,string> = {};
    const emailErr = validateRequired(email, 'Email') || validateEmail(email);
    const passErr  = validateRequired(password, 'Password');
    if (emailErr) errs.email    = emailErr;
    if (passErr)  errs.password = passErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) setError('Invalid email or password.');
  }

  const inputStyle = (field: string) => ({
    borderColor: fieldErrors[field] ? 'var(--danger)' : undefined,
  });

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo-wrap" style={{ flexDirection:'column', alignItems:'center', textAlign:'center' }}>
          <div className="login-logo">🏥</div>
          <div>
            <div className="login-title">Medicos EMR</div>
            <div className="login-sub">Hospital Records System</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }} noValidate>
          {error && <div className="alert alert-danger">⚠️ {error}</div>}

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              className="input"
              type="email"
              id="login-email"
              placeholder="doctor@hospital.local"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })); }}
              autoComplete="username"
              style={inputStyle('email')}
            />
            {fieldErrors.email && <div style={{ color:'var(--danger)', fontSize:12, marginTop:4 }}>⚠ {fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              className="input"
              type="password"
              id="login-password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }}
              autoComplete="current-password"
              style={inputStyle('password')}
            />
            {fieldErrors.password && <div style={{ color:'var(--danger)', fontSize:12, marginTop:4 }}>⚠ {fieldErrors.password}</div>}
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} id="login-submit">
            {loading ? <><div className="spinner spinner-sm"/>Signing in…</> : '→ Sign In'}
          </button>
        </form>

        <div style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:14 }}>
          🔒 Data stored locally on this device · Works fully offline
        </div>
      </div>
    </div>
  );
}
