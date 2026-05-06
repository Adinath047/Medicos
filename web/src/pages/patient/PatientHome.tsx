import React from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import {
  PATIENTS, APPOINTMENTS, VISITS, VITALS, BEDS,
} from '../../data/mockData';
import { formatDate, timeAgo } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color, getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function PatientHome({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const patient = PATIENTS.find((p) => p.email === user?.email);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!patient) {
    return (
      <div className="page-scroll">
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderRadius: 'var(--radius-xl)', padding: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(37,99,235,0.3)', marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>{greeting()}, 👋</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 4 }}>
              {user?.name?.split(' ')[0] ?? 'Patient'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="empty-state" style={{ padding: 48 }}>
            <span className="empty-state-icon">🏥</span>
            <h3>Profile not set up yet</h3>
            <p>Your patient record hasn't been created by the admin yet.<br/>Please contact the hospital to register your profile.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('patient-appointments')}>📅 Book Appointment</button>
          </div>
        </div>
      </div>
    );
  }

  const myAppts = APPOINTMENTS.filter((a) => a.patientId === patient.id);
  const nextAppt = myAppts.find((a) => a.status !== 'Cancelled' && a.status !== 'Completed') ?? myAppts[0];
  const lastVisit = VISITS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())[0];
  const latestVitals = VITALS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const bed = BEDS.find((b) => b.patientId === patient.id && b.status === 'Occupied');

  return (
    <div className="page-scroll">
      {/* Greeting */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        borderRadius: 'var(--radius-xl)', padding: '28px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
      }}>
        <div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>{greeting()}, 👋</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginTop: 4 }}>
            {patient.name.split(' ')[0]}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
            {formatDate(new Date().toISOString())}
          </div>
          {bed && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px' }}>
              <span>🏥</span>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                Admitted – Bed {bed.bedNumber} · {bed.ward}
              </span>
            </div>
          )}
        </div>
        <Avatar uri={patient.photoURL} name={patient.name} size={64} />
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Blood Group', value: patient.bloodGroup, color: '#ef4444', bg: '#fef2f2', icon: '🩸' },
          { label: 'Primary Doctor', value: patient.primaryDoctor.replace('Dr. ', 'Dr.'), color: '#2563eb', bg: '#eff6ff', icon: '🩺' },
          { label: 'Age', value: `${patient.age} yrs`, color: '#10b981', bg: '#ecfdf5', icon: '👤' },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 'var(--radius)', padding: '14px 16px',
            border: `1px solid ${s.color}30`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Next Appointment */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Next Appointment</div>
        {nextAppt ? (
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('patient-appointments')}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="appt-date-box">
                <div className="appt-day">{new Date(nextAppt.date).getDate()}</div>
                <div className="appt-month">{new Date(nextAppt.date).toLocaleString('en', { month: 'short' })}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{nextAppt.doctorName}</div>
                <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{nextAppt.doctorSpecialization}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>⏰ {nextAppt.time} · {nextAppt.reason}</div>
              </div>
              <Badge label={nextAppt.status} variant={getStatusVariant(nextAppt.status) as any} />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>No upcoming appointments</span>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('patient-appointments')}>
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vitals */}
      <div>
        <div className="section-label" style={{ marginBottom: 12 }}>Recent Vitals</div>
        {latestVitals ? (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Last Checkup</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(latestVitals.recordedAt)}</span>
            </div>
            <div className="card-body">
              <div className="vitals-grid">
                {[
                  { label: 'BP', value: `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`, color: getBPColor(latestVitals.bp_systolic) },
                  { label: 'Heart Rate', value: `${latestVitals.heartRate} bpm`, color: getHRColor(latestVitals.heartRate) },
                  { label: 'SpO₂', value: `${latestVitals.spo2}%`, color: getSPO2Color(latestVitals.spo2) },
                  { label: 'Temp', value: `${latestVitals.temperature}°C`, color: '#2563eb' },
                ].map((v) => (
                  <div key={v.label} className="vital-card">
                    <div className="vital-value" style={{ color: v.color }}>{v.value}</div>
                    <div className="vital-label">{v.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ color: 'var(--text-muted)', fontSize: 13 }}>No vitals recorded yet.</div>
          </div>
        )}
      </div>

      {/* Last Visit */}
      {lastVisit && (
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Last Visit</div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{lastVisit.doctorName}</span>
                <Badge label={lastVisit.status} variant={getStatusVariant(lastVisit.status) as any} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{formatDate(lastVisit.admissionDate)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lastVisit.reason}</div>
              <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 6, fontWeight: 600 }}>
                Diagnosis: {lastVisit.diagnosis}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => onNavigate('patient-appointments')}
      >
        📅 Book an Appointment
      </button>
    </div>
  );
}
