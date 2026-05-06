import React from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  PATIENTS, BEDS, APPOINTMENTS, VISITS, PRESCRIPTIONS, VITALS, BILLING_HEADERS,
} from '../../data/mockData';
import { formatDate, timeAgo } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color, getStatusVariant } from '../../utils/colors';

interface Props {
  patientId?: string;
  onNavigate: (page: string, data?: unknown) => void;
}

export default function PatientDetail({ patientId, onNavigate }: Props) {
  const patient = PATIENTS.find((p) => p.id === patientId) ?? PATIENTS[0];
  const bed = BEDS.find((b) => b.patientId === patient.id && b.status === 'Occupied');
  const appts = APPOINTMENTS.filter((a) => a.patientId === patient.id);
  const visits = VISITS.filter((v) => v.patientId === patient.id);
  const vitals = VITALS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const rxs = PRESCRIPTIONS.filter((r) => r.patientId === patient.id);
  const bills = BILLING_HEADERS.filter((b) => b.patientId === patient.id);
  const latestVitals = vitals[0];

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('admin-patients')}>← Back</button>
          <Avatar uri={patient.photoURL} name={patient.name} size={52} />
          <div>
            <div className="page-title">{patient.name}</div>
            <div className="page-subtitle">{patient.age} yrs · {patient.sex} · {patient.bloodGroup}</div>
          </div>
        </div>
        {bed && <Badge label={`Admitted – Bed ${bed.bedNumber}`} variant="info" />}
      </div>

      {/* Info + Vitals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">👤 Patient Info</div></div>
          <div className="card-body">
            <div className="info-row">
              {[
                { label: 'Date of Birth', value: formatDate(patient.dob) },
                { label: 'Contact', value: patient.phone },
                { label: 'Email', value: patient.email },
                { label: 'Address', value: patient.address },
                { label: 'Primary Doctor', value: patient.primaryDoctor },
                { label: 'Blood Group', value: patient.bloodGroup },
              ].map((item) => (
                <div className="info-item" key={item.label}>
                  <label>{item.label}</label>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
            {patient.allergies.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="form-label">Allergies</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {patient.allergies.map((a) => (
                    <span key={a} className="badge badge-danger">{a}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <label className="form-label">Emergency Contact</label>
              <p style={{ marginTop: 4, fontSize: 13 }}>
                {patient.emergencyContact.name} ({patient.emergencyContact.relation}) – {patient.emergencyContact.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Latest Vitals */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💓 Latest Vitals</div>
            {latestVitals && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(latestVitals.recordedAt)}</span>}
          </div>
          <div className="card-body">
            {latestVitals ? (
              <div className="vitals-grid">
                {[
                  { label: 'Blood Pressure', value: `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`, unit: 'mmHg', color: getBPColor(latestVitals.bp_systolic) },
                  { label: 'Heart Rate', value: `${latestVitals.heartRate}`, unit: 'bpm', color: getHRColor(latestVitals.heartRate) },
                  { label: 'SpO₂', value: `${latestVitals.spo2}`, unit: '%', color: getSPO2Color(latestVitals.spo2) },
                  { label: 'Temperature', value: `${latestVitals.temperature}`, unit: '°C', color: '#2563eb' },
                  { label: 'Resp. Rate', value: `${latestVitals.respRate}`, unit: '/min', color: '#8b5cf6' },
                  { label: 'Blood Sugar', value: `${latestVitals.bloodSugar}`, unit: 'mg/dL', color: '#f59e0b' },
                ].map((v) => (
                  <div key={v.label} className="vital-card">
                    <div className="vital-value" style={{ color: v.color }}>{v.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.unit}</div>
                    <div className="vital-label">{v.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <span className="empty-state-icon">📊</span>
                <p>No vitals recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointments + Visits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📅 Appointments</div></div>
          <div>
            {appts.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No appointments</p></div>
            ) : appts.map((a) => (
              <div key={a.id} className="appt-card">
                <div className="appt-date-box">
                  <div className="appt-day">{new Date(a.date).getDate()}</div>
                  <div className="appt-month">{new Date(a.date).toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{a.doctorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.time} · {a.reason}</div>
                </div>
                <Badge label={a.status} variant={getStatusVariant(a.status) as any} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">🏥 Visit History</div></div>
          <div>
            {visits.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No visits yet</p></div>
            ) : visits.map((v) => (
              <div key={v.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v.doctorName}</span>
                  <Badge label={v.status} variant={getStatusVariant(v.status) as any} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(v.admissionDate)}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{v.reason}</div>
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>Dx: {v.diagnosis}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prescriptions */}
      {rxs.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">💊 Prescriptions</div></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rxs.map((rx) => (
              <div key={rx.id} style={{ padding: 16, background: 'var(--surface-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{rx.doctorName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(rx.createdAt)}</span>
                </div>
                <table className="rx-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--border)' }}>
                      {['Medicine', 'Strength', 'Dose', 'Frequency', 'Duration'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rx.medicines.map((m, i) => (
                      <tr key={i}>
                        {[m.name, m.strength, m.dose, m.frequency, m.duration].map((v, j) => (
                          <td key={j} style={{ padding: '6px 10px', fontSize: 13, color: 'var(--text-secondary)' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rx.advice && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--primary)', padding: '8px 10px', background: 'var(--primary-light)', borderRadius: 6 }}>
                    📝 {rx.advice}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
