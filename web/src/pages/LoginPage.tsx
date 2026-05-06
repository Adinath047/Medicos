import React, { useState } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';

const DEMO_CREDS = [
  { role: '⚡ Super Admin', email: 'super@medicos.app',     password: 'Super@123',  desc: 'National platform control' },
  { role: '🛡️ Admin',      email: 'admin@medicos.app',     password: 'Admin@123',  desc: 'Hospital management' },
  { role: '🩺 Doctor',      email: 'dr.sharma@medicos.app', password: 'Doctor@123', desc: 'Clinical portal' },
  { role: '🏥 Receptionist',email: 'reception@medicos.app', password: 'Recept@123', desc: 'Patient check-in & registration' },
  { role: '👤 Patient',     email: 'patient@medicos.app',   password: 'Patient@123',desc: 'Personal health portal' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('admin@medicos.app');
  const [password, setPassword] = useState('Admin@123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    const ok = await login(email.trim(), password);
    if (!ok) setError('Invalid credentials. Try the demo accounts below.');
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">M</div>
          <div className="login-title">Medicos</div>
          <div className="login-sub">Hospital Management System</div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div className="alert alert-danger">⚠️ {error}</div>
          )}

          <div>
            <label className="form-label">Email Address</label>
            <div className="search-bar" style={{ borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>✉️</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div className="search-bar" style={{ borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ padding: '4px 8px', fontSize: 15, background: 'none' }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {isLoading ? (
              <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Signing in…</>
            ) : 'Sign In →'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div>
          <div className="section-label" style={{ textAlign: 'center', marginBottom: 12 }}>
            Quick Demo – click to auto-fill
          </div>
          <div className="demo-chips">
            {DEMO_CREDS.map((c) => (
              <div
                key={c.role}
                className="demo-chip"
                onClick={() => { setEmail(c.email); setPassword(c.password); setError(''); }}
                id={`demo-${c.role.split(' ')[1]?.toLowerCase() ?? c.role}`}
              >
                <span className="demo-chip-role">{c.role}</span>
                <div>
                  <div className="demo-chip-email">{c.email}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-light)' }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>
          © 2025 Medicos Health System · All rights reserved
        </div>
      </div>
    </div>
  );
}
