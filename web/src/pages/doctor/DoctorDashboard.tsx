import React, { useState } from 'react';
import { KPICard } from '../../components/KPICard';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import {
  DOCTORS, PATIENTS, APPOINTMENTS, BEDS, DOCTOR_PATIENT_LINKS, VITALS,
} from '../../data/mockData';
import { formatDate, timeAgo } from '../../utils/formatters';
import { getBPColor, getHRColor, getStatusVariant } from '../../utils/colors';

const TODAY = new Date().toISOString().split('T')[0];

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function DoctorDashboard({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const doctor = DOCTORS.find((d) => d.email === user?.email);

  if (!doctor) {
    return (
      <div className="page-scroll">
        <div className="page-header">
          <div>
            <div className="page-title">Doctor Dashboard</div>
            <div className="page-subtitle">Welcome, {user?.name}</div>
          </div>
        </div>
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">🩺</span>
            <h3>Doctor profile not created yet</h3>
            <p>
              Your doctor record hasn't been set up by the admin yet.<br/>
              Once the admin creates your profile, your patients and appointments will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const myLinks    = DOCTOR_PATIENT_LINKS.filter((l) => l.doctorId === doctor.id);
  const myPatients = PATIENTS.filter((p) => myLinks.some((l) => l.patientId === p.id));
  const myAppts    = APPOINTMENTS.filter((a) => a.doctorId === doctor.id);
  const todayAppts = myAppts.filter((a) => a.date === TODAY || a.status === 'Confirmed');
  const myBeds     = BEDS.filter((b) => b.doctorId === doctor.id && b.status === 'Occupied');

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">Doctor Dashboard</div>
          <div className="page-subtitle">Welcome back, {doctor.name} · {formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard title="My Patients" value={myPatients.length} icon="👥"
          color="#2563eb" colorBg="#eff6ff" subtitle="Under your care" />
        <KPICard title="Today's Appointments" value={todayAppts.length} icon="📅"
          color="#8b5cf6" colorBg="#f5f3ff" subtitle="Scheduled today" />
        <KPICard title="Beds Assigned" value={myBeds.length} icon="🛏️"
          color="#f59e0b" colorBg="#fffbeb" subtitle="Admitted patients" />
        <KPICard title="Experience" value={`${doctor.experience} yrs`} icon="🩺"
          color="#10b981" colorBg="#ecfdf5" subtitle={doctor.specialization} />
      </div>


      {/* Today's Appointments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Today's Appointments</div>
            <span className="badge badge-info">{todayAppts.length}</span>
          </div>
          <div>
            {todayAppts.length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                <span className="empty-state-icon">🎉</span>
                <p>No appointments today</p>
              </div>
            ) : todayAppts.map((a) => (
              <div key={a.id} className="appt-card">
                <Avatar uri={a.patientPhoto} name={a.patientName} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.time} · {a.reason}</div>
                </div>
                <Badge label={a.status} variant={getStatusVariant(a.status) as any} />
              </div>
            ))}
          </div>
        </div>

        {/* Admitted Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏥 Admitted Patients</div>
            <span className="badge badge-warning">{myBeds.length} beds</span>
          </div>
          <div>
            {myBeds.length === 0 ? (
              <div className="empty-state" style={{ padding: 28 }}>
                <p>No admitted patients</p>
              </div>
            ) : myBeds.map((bed) => {
              const vitals = VITALS.filter((v) => v.bedId === bed.id)
                .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
              return (
                <div key={bed.id} className="appt-card"
                  onClick={() => bed.patientId && onNavigate('doctor-patient-detail', { patientId: bed.patientId })}>
                  <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{bed.patientName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Bed {bed.bedNumber} · {bed.ward}
                    </div>
                  </div>
                  {vitals && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: getBPColor(vitals.bp_systolic) }}>
                        {vitals.bp_systolic}/{vitals.bp_diastolic}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(vitals.recordedAt)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* My Patients table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">👥 My Patients</div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('doctor-patients')}>
            View All
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age</th>
                <th>Blood Group</th>
                <th>Last Visit</th>
                <th>Allergies</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myPatients.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }}
                  onClick={() => onNavigate('doctor-patient-detail', { patientId: p.id })}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={p.photoURL} name={p.name} size={32} />
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </div>
                  </td>
                  <td>{p.age} · {p.sex}</td>
                  <td><span className="tag">{p.bloodGroup}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.lastVisit)}</td>
                  <td>
                    {p.allergies.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.allergies.map((a) => <span key={a} className="badge badge-danger">{a}</span>)}
                      </div>
                    ) : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>None</span>}
                  </td>
                  <td><button className="btn btn-ghost btn-sm">View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
