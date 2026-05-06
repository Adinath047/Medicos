import React, { useState } from 'react';
import { KPICard } from '../../components/KPICard';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  HOSPITALS, DOCTORS, PATIENTS, USERS, DOCTOR_VERIFICATIONS,
} from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const STATE_STATS = [
  { state: 'Maharashtra', hospitals: 12, doctors: 89 },
  { state: 'Delhi', hospitals: 9, doctors: 72 },
  { state: 'Karnataka', hospitals: 7, doctors: 55 },
  { state: 'Tamil Nadu', hospitals: 6, doctors: 48 },
  { state: 'Rajasthan', hospitals: 4, doctors: 32 },
  { state: 'Punjab', hospitals: 3, doctors: 21 },
];

export default function SuperAdminDashboard({ onNavigate }: Props) {
  const totalHospitals  = HOSPITALS.length;
  const verifiedHosp    = HOSPITALS.filter(h => h.verified).length;
  const pendingHosp     = HOSPITALS.filter(h => !h.verified).length;
  const totalDoctors    = DOCTORS.length;
  const verifiedDoctors = DOCTORS.filter(d => d.nmcVerified).length;
  const pendingVerif    = DOCTOR_VERIFICATIONS.filter(v => v.status === 'Pending').length;
  const totalPatients   = PATIENTS.length;
  const allUsers        = USERS.length;

  const governmentHosp  = HOSPITALS.filter(h => h.type === 'Government').length;
  const privateHosp     = HOSPITALS.filter(h => h.type === 'Private').length;
  const clinicHosp      = HOSPITALS.filter(h => h.type === 'Clinic').length;
  const maxStat = Math.max(...STATE_STATS.map(s => s.hospitals));

  const quickActions = [
    { icon: '🏥', label: 'Register Hospital', page: 'superadmin-hospitals' },
    { icon: '🩺', label: 'Verify Doctors',    page: 'superadmin-doctors', badge: pendingVerif },
    { icon: '🛡️', label: 'Manage Admins',    page: 'superadmin-admins' },
    { icon: '📊', label: 'All Hospitals',     page: 'superadmin-hospitals' },
  ];

  return (
    <div className="page-scroll">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Platform Overview</div>
          <div className="page-subtitle">Medicos National Network · {formatDate(new Date().toISOString())}</div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⚡</span> Super Admin
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>National Overview</div>
        <div className="kpi-grid">
          <KPICard
            title="Total Hospitals" value={totalHospitals}
            subtitle={`${verifiedHosp} verified · ${pendingHosp} pending`}
            icon="🏥" color="#7c3aed" colorBg="#f5f3ff"
            trend={pendingHosp > 0 ? `${pendingHosp} await approval` : 'All verified'}
            trendPositive={pendingHosp === 0}
          />
          <KPICard
            title="Registered Doctors" value={totalDoctors}
            subtitle={`${verifiedDoctors} NMC verified`}
            icon="🩺" color="#10b981" colorBg="#ecfdf5"
            trend={pendingVerif > 0 ? `${pendingVerif} pending verification` : 'All verified'}
            trendPositive={pendingVerif === 0}
          />
          <KPICard
            title="Total Patients" value={totalPatients}
            subtitle="Across all hospitals"
            icon="👥" color="#2563eb" colorBg="#eff6ff"
          />
          <KPICard
            title="Platform Users" value={allUsers}
            subtitle="All roles combined"
            icon="🌐" color="#f59e0b" colorBg="#fffbeb"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Quick Actions</div>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {quickActions.map((qa) => (
                <button
                  key={qa.page + qa.label}
                  className="btn btn-secondary"
                  onClick={() => onNavigate(qa.page)}
                  style={{ gap: 8, padding: '10px 20px', position: 'relative' }}
                >
                  <span style={{ fontSize: 18 }}>{qa.icon}</span>
                  {qa.label}
                  {qa.badge ? (
                    <span style={{
                      position: 'absolute', top: -6, right: -6,
                      background: '#ef4444', color: '#fff',
                      borderRadius: '50%', width: 18, height: 18,
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{qa.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Hospitals by State */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📍 Hospitals by State</div>
            <span className="badge badge-info">{totalHospitals} registered</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STATE_STATS.map(stat => (
              <div key={stat.state}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{stat.state}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.hospitals} hospitals · {stat.doctors} doctors</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(stat.hospitals / maxStat) * 100}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hospital Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏥 Hospital Types</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Private',          count: privateHosp,     color: '#7c3aed', icon: '🏨' },
              { label: 'Government',        count: governmentHosp,  color: '#2563eb', icon: '🏛️' },
              { label: 'Clinic',            count: clinicHosp,      color: '#10b981', icon: '🏪' },
              { label: 'Nursing Home',
                count: HOSPITALS.filter(h => h.type === 'Nursing Home').length,
                color: '#f59e0b', icon: '🏠' },
              { label: 'Diagnostic Centre',
                count: HOSPITALS.filter(h => h.type === 'Diagnostic Centre').length,
                color: '#ef4444', icon: '🔬' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: t.color + '15', border: `1.5px solid ${t.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}>{t.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.count} registered</div>
                </div>
                <div style={{
                  fontWeight: 800, fontSize: 20, color: t.color,
                  minWidth: 32, textAlign: 'right',
                }}>{t.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Hospitals */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏥 Registered Hospitals</div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('superadmin-hospitals')}>
            Manage All →
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hospital</th>
                <th>ID</th>
                <th>City</th>
                <th>State</th>
                <th>Type</th>
                <th>Status</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {HOSPITALS.map(h => (
                <tr key={h.id} style={{ cursor: 'pointer' }}
                  onClick={() => onNavigate('superadmin-hospitals', { hospitalId: h.id })}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.email}</div>
                  </td>
                  <td><code style={{ fontSize: 11 }}>{h.id}</code></td>
                  <td>{h.city}</td>
                  <td>{h.state}</td>
                  <td><Badge label={h.type} variant="info" /></td>
                  <td><Badge label={h.status} variant={h.status === 'Active' ? 'success' : h.status === 'Pending' ? 'warning' : 'danger'} /></td>
                  <td>
                    {h.verified
                      ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Verified</span>
                      : <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Verification Queue */}
      {DOCTOR_VERIFICATIONS.filter(v => v.status === 'Pending').length > 0 && (
        <div className="card" style={{ border: '1.5px solid #fbbf24' }}>
          <div className="card-header" style={{ background: '#fffbeb' }}>
            <div className="card-title">⚠️ Doctor Verification Queue</div>
            <span className="badge badge-warning pulse">
              {DOCTOR_VERIFICATIONS.filter(v => v.status === 'Pending').length} pending
            </span>
          </div>
          <div style={{ padding: 16 }}>
            {DOCTOR_VERIFICATIONS.filter(v => v.status === 'Pending').map(v => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: '#ede9fe', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 20,
                }}>🩺</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{v.doctorName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {v.qualifications} · NMC: {v.nmcNumber}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    {v.hospitalName} · Applied {formatDate(v.submittedAt)}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onNavigate('superadmin-doctors')}>
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
