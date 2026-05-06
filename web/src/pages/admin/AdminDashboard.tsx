import React, { useState } from 'react';
import { KPICard } from '../../components/KPICard';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  BEDS, PATIENTS, DOCTORS, APPOINTMENTS, REMINDERS, VITALS, USERS,
} from '../../data/mockData';
import { formatDate, timeAgo, minutesSince } from '../../utils/formatters';
import { getBPColor, getStatusVariant } from '../../utils/colors';

const TODAY = new Date().toISOString().split('T')[0];

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function AdminDashboard({ onNavigate }: Props) {
  const [vitalFilter, setVitalFilter] = useState<'all' | 'overdue'>('overdue');

  const occupiedBeds   = BEDS.filter((b) => b.status === 'Occupied');
  const availableBeds  = BEDS.filter((b) => b.status === 'Available');
  const todayAppts     = APPOINTMENTS.filter((a) => a.date === TODAY || a.status === 'Confirmed');
  const pendingReminders = REMINDERS.filter((r) => r.status === 'Pending');

  const vitalsDueBeds = occupiedBeds.map((bed) => {
    const lastVitals = VITALS
      .filter((v) => v.bedId === bed.id)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    const minsAgo = lastVitals ? minutesSince(lastVitals.recordedAt) : 9999;
    return { bed, lastVitals, minsAgo, isOverdue: minsAgo >= 30 };
  });

  const filteredVitalsDue = vitalFilter === 'overdue'
    ? vitalsDueBeds.filter((v) => v.isOverdue)
    : vitalsDueBeds;

  const quickActions = [
    { icon: '👤', label: 'Patients',   page: 'admin-patients' },
    { icon: '🩺', label: 'Doctors',    page: 'admin-doctors' },
    { icon: '🛏️', label: 'Beds',       page: 'admin-beds' },
    { icon: '💊', label: 'Vitals',     page: 'admin-vitals' },
    { icon: '🧾', label: 'Billing',    page: 'admin-billing' },
    { icon: '💉', label: 'Prescribe',  page: 'admin-prescriptions' },
  ];

  return (
    <div className="page-scroll">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">Today: {formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Overview</div>
        <div className="kpi-grid">
          <KPICard
            title="Total Doctors" value={DOCTORS.length}
            subtitle={`${DOCTORS.filter(d => d.status === 'Active').length} active`}
            icon="🩺" color="#10b981" colorBg="#ecfdf5"
          />
          <KPICard
            title="Total Patients" value={PATIENTS.length}
            subtitle="Registered patients"
            icon="👥" color="#2563eb" colorBg="#eff6ff"
          />
          <KPICard
            title="Beds Occupied" value={`${occupiedBeds.length}/${BEDS.length}`}
            subtitle={`${availableBeds.length} available`}
            icon="🛏️" color="#f59e0b" colorBg="#fffbeb"
          />
          <KPICard
            title="Appointments" value={todayAppts.length}
            subtitle="Today's schedule"
            icon="📅" color="#8b5cf6" colorBg="#f5f3ff"
            trend={pendingReminders.length > 0 ? `${pendingReminders.length} overdue` : undefined}
            trendPositive={false}
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
                  key={qa.page}
                  className="btn btn-secondary"
                  id={`qa-${qa.page}`}
                  onClick={() => onNavigate(qa.page)}
                  style={{ gap: 8, padding: '10px 20px' }}
                >
                  <span style={{ fontSize: 18 }}>{qa.icon}</span>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Vitals Due */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🩺 Vitals Due Now</div>
            {pendingReminders.length > 0 && (
              <span className="badge badge-danger pulse">{pendingReminders.length} overdue</span>
            )}
          </div>
          {/* Filter tabs */}
          <div style={{ padding: '12px 16px 0' }}>
            <div className="filter-tabs">
              <button
                className={`filter-tab${vitalFilter === 'overdue' ? ' active' : ''}`}
                onClick={() => setVitalFilter('overdue')}
              >⚠️ Overdue Only</button>
              <button
                className={`filter-tab${vitalFilter === 'all' ? ' active' : ''}`}
                onClick={() => setVitalFilter('all')}
              >🛏️ All Occupied</button>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {filteredVitalsDue.length === 0 ? (
              <div className="alert alert-success" style={{ marginTop: 8 }}>
                ✅ All vitals are up to date
              </div>
            ) : (
              filteredVitalsDue.map(({ bed, lastVitals, isOverdue }) => (
                <div
                  key={bed.id}
                  onClick={() => onNavigate('admin-vitals', { bedId: bed.id })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    marginBottom: 8,
                    border: `1.5px solid ${isOverdue ? '#fecaca' : 'var(--border)'}`,
                    background: isOverdue ? 'var(--danger-bg)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                      {bed.bedNumber} · {bed.ward}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bed.patientName}</div>
                  </div>
                  {lastVitals ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: getBPColor(lastVitals.bp_systolic) }}>
                        {lastVitals.bp_systolic}/{lastVitals.bp_diastolic}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>BP</div>
                    </div>
                  ) : (
                    <span className="badge badge-danger">No vitals!</span>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate('admin-vitals', { bedId: bed.id }); }}>
                    Enter →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Today's Appointments</div>
            <span className="badge badge-info">{todayAppts.length} scheduled</span>
          </div>
          <div>
            {todayAppts.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <span className="empty-state-icon">📅</span>
                <p>No appointments today</p>
              </div>
            ) : (
              todayAppts.map((appt) => (
                <div key={appt.id} className="appt-card">
                  <Avatar uri={appt.patientPhoto} name={appt.patientName} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>
                      {appt.patientName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {appt.doctorName} · {appt.time}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{appt.reason}</div>
                  </div>
                  <Badge label={appt.status} variant={getStatusVariant(appt.status) as any} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Admissions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏥 Currently Admitted Patients</div>
          <span className="badge badge-info">{occupiedBeds.length} beds occupied</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Bed</th>
                <th>Ward</th>
                <th>Type</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {occupiedBeds.map((bed) => (
                <tr key={bed.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={32} />
                      <span style={{ fontWeight: 600 }}>{bed.patientName}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{bed.bedNumber}</td>
                  <td>{bed.ward}</td>
                  <td><Badge label={bed.type} variant="info" /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{bed.doctorName}</td>
                  <td><Badge label={bed.status} variant="info" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── System Users (Admin Analytics) ─────────────────────────────────── */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>System Users</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {(['admin', 'doctor', 'patient'] as const).map((role) => {
            const roleUsers = USERS.filter(u => u.role === role);
            const meta = {
              admin:   { icon: '🛡️', color: '#2563eb', bg: '#eff6ff', label: 'Admins' },
              doctor:  { icon: '🩺', color: '#10b981', bg: '#ecfdf5', label: 'Doctors' },
              patient: { icon: '👤', color: '#f59e0b', bg: '#fffbeb', label: 'Patients' },
            }[role];
            return (
              <div key={role} className="card">
                <div className="card-header" style={{ borderBottom: `3px solid ${meta.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: meta.bg, border: `1.5px solid ${meta.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>{meta.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: meta.color }}>
                        {roleUsers.length} {meta.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active accounts</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roleUsers.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                      No {meta.label.toLowerCase()} registered
                    </div>
                  ) : roleUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={u.photoURL} name={u.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email}
                        </div>
                      </div>
                      <span className={`badge badge-${{ admin: 'info', doctor: 'success', patient: 'warning' }[role]}`}>
                        {role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
