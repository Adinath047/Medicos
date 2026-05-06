import React from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  PATIENTS, APPOINTMENTS, VISITS, VITALS, PRESCRIPTIONS,
} from '../../data/mockData';
import { formatDate, timeAgo } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color, getStatusVariant } from '../../utils/colors';

interface Props { patientId?: string; onNavigate: (page: string, data?: unknown) => void; }

export default function DoctorPatientDetail({ patientId, onNavigate }: Props) {
  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return <div className="page-scroll"><div className="empty-state">Patient not found</div></div>;

  const appts = APPOINTMENTS.filter((a) => a.patientId === patient.id);
  const visits = VISITS.filter((v) => v.patientId === patient.id);
  const vitals = VITALS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const rxs = PRESCRIPTIONS.filter((r) => r.patientId === patient.id);
  const latestVitals = vitals[0];

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('doctor-patients')}>← Back</button>
          <Avatar uri={patient.photoURL} name={patient.name} size={52} />
          <div>
            <div className="page-title">{patient.name}</div>
            <div className="page-subtitle">{patient.age} yrs · {patient.sex} · Blood Group: {patient.bloodGroup}</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('doctor-prescriptions')}>
          + Add Prescription
        </button>
      </div>

      {/* Info + Vitals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Patient Info</div></div>
          <div className="card-body">
            <div className="info-row">
              {[
                { label: 'Date of Birth', value: formatDate(patient.dob) },
                { label: 'Phone', value: patient.phone },
                { label: 'Email', value: patient.email },
                { label: 'Address', value: patient.address },
              ].map((item) => (
                <div className="info-item" key={item.label}>
                  <label>{item.label}</label>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
            {patient.allergies.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <label className="form-label">⚠️ Allergies</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {patient.allergies.map((a) => <span key={a} className="badge badge-danger">{a}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Latest Vitals</div>
            {latestVitals && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(latestVitals.recordedAt)}</span>}
          </div>
          <div className="card-body">
            {latestVitals ? (
              <div className="vitals-grid">
                {[
                  { label: 'BP', value: `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`, color: getBPColor(latestVitals.bp_systolic) },
                  { label: 'Heart Rate', value: `${latestVitals.heartRate} bpm`, color: getHRColor(latestVitals.heartRate) },
                  { label: 'SpO₂', value: `${latestVitals.spo2}%`, color: getSPO2Color(latestVitals.spo2) },
                  { label: 'Temp', value: `${latestVitals.temperature}°C`, color: '#2563eb' },
                  { label: 'Resp Rate', value: `${latestVitals.respRate}/min`, color: '#8b5cf6' },
                  { label: 'Blood Sugar', value: `${latestVitals.bloodSugar} mg/dL`, color: '#f59e0b' },
                ].map((v) => (
                  <div key={v.label} className="vital-card">
                    <div className="vital-value" style={{ color: v.color }}>{v.value}</div>
                    <div className="vital-label">{v.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}><p>No vitals recorded</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Prescriptions */}
      {rxs.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">💊 Prescriptions</div></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rxs.map((rx) => (
              <div key={rx.id} style={{ padding: 14, background: 'var(--surface-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700 }}>{formatDate(rx.createdAt)}</span>
                  <Badge label={rx.createdByRole} variant="info" />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{['Medicine', 'Strength', 'Dose', 'Frequency', 'Duration'].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rx.medicines.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{m.name}</td>
                          <td>{m.strength}</td>
                          <td>{m.dose}</td>
                          <td>{m.frequency}</td>
                          <td>{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rx.advice && <div className="alert alert-info" style={{ marginTop: 10 }}>📝 {rx.advice}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit History */}
      <div className="card">
        <div className="card-header"><div className="card-title">🏥 Visit History</div></div>
        <div>
          {visits.map((v) => (
            <div key={v.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(v.admissionDate)}</span>
                <Badge label={v.status} variant={getStatusVariant(v.status) as any} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v.reason}</div>
              <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>Dx: {v.diagnosis}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
