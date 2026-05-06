import React, { useState } from 'react';
import { KPICard } from '../../components/KPICard';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  PATIENTS, APPOINTMENTS, DOCTORS, HOSPITALS,
} from '../../data/mockData';
import { useAuthStore } from '../../hooks/useAuthStore';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const TODAY = new Date().toISOString().split('T')[0];

export default function ReceptionistDashboard({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId ?? '';
  const hospital   = HOSPITALS.find(h => h.id === hospitalId);

  const myPatients     = PATIENTS.filter(p => p.hospitalId === hospitalId && p.registeredBy === user?.id);
  const todayAppts     = APPOINTMENTS.filter(a => a.hospitalId === hospitalId && a.date === TODAY);
  const pendingCheckin = todayAppts.filter(a => a.status === 'Confirmed' || a.status === 'Pending');
  const checkedIn      = todayAppts.filter(a => a.status === 'Checked-In' || a.status === 'In Consultation');
  const completed      = todayAppts.filter(a => a.status === 'Completed');
  const myDoctors      = DOCTORS.filter(d => d.hospitalId === hospitalId && d.status === 'Active');

  const quickActions = [
    { icon: '👤', label: 'Register Patient', page: 'receptionist-patients', primary: true },
    { icon: '📅', label: 'Book Appointment', page: 'receptionist-appointments', primary: false },
    { icon: '✅', label: 'Check-In Patient',  page: 'receptionist-checkin',     primary: false },
  ];

  return (
    <div className="page-scroll">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Reception Dashboard</div>
          <div className="page-subtitle">
            {hospital?.name ?? 'Hospital'} · {formatDate(new Date().toISOString())}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: 'linear-gradient(135deg, #db2777, #be185d)',
          color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>🏥</span> Receptionist
        </div>
      </div>

      {/* KPIs */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Today's Summary</div>
        <div className="kpi-grid">
          <KPICard
            title="My Patients" value={myPatients.length}
            subtitle="Registered by me" icon="👤" color="#db2777" colorBg="#fdf2f8"
          />
          <KPICard
            title="Today's Appointments" value={todayAppts.length}
            subtitle={`${pendingCheckin.length} awaiting check-in`}
            icon="📅" color="#2563eb" colorBg="#eff6ff"
            trend={pendingCheckin.length > 0 ? `${pendingCheckin.length} to check in` : undefined}
            trendPositive={false}
          />
          <KPICard
            title="Checked In" value={checkedIn.length}
            subtitle="In queue or consultation" icon="✅" color="#10b981" colorBg="#ecfdf5"
          />
          <KPICard
            title="Completed" value={completed.length}
            subtitle="Today's finished visits" icon="🏁" color="#f59e0b" colorBg="#fffbeb"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Quick Actions</div>
        <div className="card">
          <div className="card-body" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {quickActions.map(qa => (
                <button
                  key={qa.page}
                  className={`btn ${qa.primary ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: 10, padding: '12px 24px', fontSize: 14 }}
                  onClick={() => onNavigate(qa.page)}
                >
                  <span style={{ fontSize: 20 }}>{qa.icon}</span>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pending Check-ins */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⏳ Pending Check-ins</div>
            {pendingCheckin.length > 0 && (
              <span className="badge badge-warning pulse">{pendingCheckin.length} waiting</span>
            )}
          </div>
          <div style={{ padding: 12 }}>
            {pendingCheckin.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <span className="empty-state-icon">✅</span>
                <p>All patients checked in!</p>
              </div>
            ) : pendingCheckin.slice(0, 5).map(appt => (
              <div key={appt.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                borderRadius: 8, marginBottom: 6, border: '1.5px solid var(--border)',
                background: 'var(--surface)',
              }}>
                <Avatar uri={appt.patientPhoto} name={appt.patientName} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{appt.patientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {appt.doctorName} · Token #{appt.tokenNumber ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{appt.time}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('receptionist-checkin', { appointmentId: appt.id })}
                >Check In →</button>
              </div>
            ))}
          </div>
        </div>

        {/* Available Doctors Today */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🩺 Available Doctors</div>
            <span className="badge badge-success">{myDoctors.length} active</span>
          </div>
          <div style={{ padding: 12 }}>
            {myDoctors.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <span className="empty-state-icon">🩺</span>
                <p>No doctors available</p>
              </div>
            ) : myDoctors.map(doc => {
              const docAppts = todayAppts.filter(a => a.doctorId === doc.id);
              const inQueue  = docAppts.filter(a => a.status === 'Confirmed' || a.status === 'Checked-In').length;
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                  borderRadius: 8, marginBottom: 6, border: '1.5px solid var(--border)',
                }}>
                  <Avatar uri={doc.photoURL} name={doc.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.specialization}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹{doc.consultationFee} · {inQueue} in queue</div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('receptionist-appointments', { doctorId: doc.id })}
                  >Book</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Registrations */}
      {myPatients.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">👤 Recently Registered Patients</div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('receptionist-patients')}>
              View All
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Patient</th><th>UHID</th><th>Age / Sex</th><th>Doctor</th><th>Registered</th></tr>
              </thead>
              <tbody>
                {myPatients.slice(-5).reverse().map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar uri={p.photoURL} name={p.name} size={30} />
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 11 }}>{p.uhid}</code></td>
                    <td style={{ fontSize: 12 }}>{p.age}y · {p.sex}</td>
                    <td style={{ fontSize: 12 }}>{p.primaryDoctor || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.lastVisit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
