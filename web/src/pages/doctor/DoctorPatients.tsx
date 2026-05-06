import React from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DOCTORS, PATIENTS, DOCTOR_PATIENT_LINKS, BEDS, APPOINTMENTS, PRESCRIPTIONS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function DoctorPatients({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const doctor = DOCTORS.find((d) => d.email === user?.email);

  if (!doctor) {
    return (
      <div className="page-scroll">
        <div className="page-header"><div><div className="page-title">My Patients</div></div></div>
        <div className="card"><div className="empty-state" style={{ padding: 56 }}>
          <span className="empty-state-icon">👥</span>
          <h3>Doctor profile not set up</h3>
          <p>Your doctor profile hasn't been created by the admin yet.</p>
        </div></div>
      </div>
    );
  }

  const myLinks   = DOCTOR_PATIENT_LINKS.filter((l) => l.doctorId === doctor.id);
  const myPatients = PATIENTS.filter((p) => myLinks.some((l) => l.patientId === p.id));


  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">My Patients</div>
          <div className="page-subtitle">{myPatients.length} patients under your care</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {myPatients.map((p) => {
          const bed = BEDS.find((b) => b.patientId === p.id && b.status === 'Occupied');
          const upcomingAppt = APPOINTMENTS
            .filter((a) => a.patientId === p.id && a.status !== 'Cancelled' && a.status !== 'Completed')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          const rxCount = PRESCRIPTIONS.filter((r) => r.patientId === p.id).length;

          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('doctor-patient-detail', { patientId: p.id })}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Avatar uri={p.photoURL} name={p.name} size={48} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.age} yrs · {p.sex} · {p.bloodGroup}</div>
                    {bed && <Badge label={`Bed ${bed.bedNumber}`} variant="info" />}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Last Visit', value: formatDate(p.lastVisit) },
                    { label: 'Prescriptions', value: `${rxCount} rx` },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {upcomingAppt && (
                  <div style={{ padding: '8px 10px', background: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--primary-mid)', fontSize: 12 }}>
                    📅 Next: {formatDate(upcomingAppt.date)} at {upcomingAppt.time}
                  </div>
                )}

                {p.allergies.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.allergies.map((a) => <span key={a} className="badge badge-danger">⚠️ {a}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
