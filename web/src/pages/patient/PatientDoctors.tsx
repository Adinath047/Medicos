import React from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import { PATIENTS, DOCTORS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function PatientDoctors({ onNavigate }: Props) {
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">Our Doctors</div>
          <div className="page-subtitle">Browse our specialist physicians</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {DOCTORS.map((doc) => (
          <div key={doc.id} className="card" style={{ transition: 'all var(--transition)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar uri={doc.photoURL} name={doc.name} size={52} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{doc.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{doc.specialization}</div>
                  <Badge label={doc.status} variant={doc.status === 'Active' ? 'success' : 'danger'} />
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                {doc.bio}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Experience', value: `${doc.experience} yrs` },
                  { label: 'Patients', value: `${doc.patientsCount}` },
                ].map((s) => (
                  <div key={s.label} style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>Schedule</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {doc.schedule.map((s) => (
                    <span key={s.day} className="tag">{s.day} {s.startTime}–{s.endTime}</span>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14 }}
                onClick={() => onNavigate('patient-appointments')}
              >
                📅 Book Appointment
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
