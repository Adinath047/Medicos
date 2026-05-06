import React from 'react';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import { PATIENTS, PRESCRIPTIONS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function PatientPrescriptions({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const patient = PATIENTS.find((p) => p.email === user?.email);

  if (!patient) {
    return (
      <div className="page-scroll">
        <div className="page-header"><div><div className="page-title">My Prescriptions</div></div></div>
        <div className="empty-state" style={{ padding: 56 }}>
          <span className="empty-state-icon">💊</span>
          <h3>No prescriptions yet</h3>
          <p>Your doctor will add prescriptions after your consultations.</p>
        </div>
      </div>
    );
  }

  const rxs = PRESCRIPTIONS.filter((r) => r.patientId === patient.id);


  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">My Prescriptions</div>
          <div className="page-subtitle">{rxs.length} prescriptions on record</div>
        </div>
      </div>

      {rxs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💊</span>
          <h3>No prescriptions yet</h3>
          <p>Your doctor will add prescriptions after your consultations</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rxs.map((rx) => (
            <div key={rx.id} className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{rx.doctorName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(rx.createdAt)} · By {rx.createdByRole}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm">🖨️ Print</button>
              </div>
              <div className="card-body">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {['Medicine', 'Strength', 'Dose', 'Frequency', 'Duration'].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rx.medicines.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>{m.name}</td>
                          <td>{m.strength}</td>
                          <td>{m.dose}</td>
                          <td>{m.frequency}</td>
                          <td>{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rx.advice && (
                  <div className="alert alert-info" style={{ marginTop: 12 }}>
                    📝 Doctor's Advice: {rx.advice}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
