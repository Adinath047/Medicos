import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  APPOINTMENTS, PATIENTS, DOCTORS, HOSPITALS, type Appointment,
} from '../../data/mockData';
import { useAuthStore } from '../../hooks/useAuthStore';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function ReceptionistCheckin({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const hospitalId = user?.hospitalId ?? '';

  const TODAY = new Date().toISOString().split('T')[0];

  const [appointments, setAppointments] = useState<Appointment[]>(
    APPOINTMENTS.filter(a => a.hospitalId === hospitalId && a.date === TODAY)
  );
  const [weightBP, setWeightBP] = useState<Record<string, { weight: string; bp: string }>>({});
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<'pending' | 'checkedin' | 'all'>('pending');

  const hospital = HOSPITALS.find(h => h.id === hospitalId);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCheckin = (apptId: string) => {
    // Update in APPOINTMENTS array
    const idx = APPOINTMENTS.findIndex(a => a.id === apptId);
    if (idx !== -1) APPOINTMENTS[idx].status = 'Checked-In';
    setAppointments(APPOINTMENTS.filter(a => a.hospitalId === hospitalId && a.date === TODAY));

    // Update patient vitals pre-data if provided
    const wb = weightBP[apptId];
    if (wb) {
      const appt = APPOINTMENTS.find(a => a.id === apptId);
      if (appt) {
        const pat = PATIENTS.find(p => p.id === appt.patientId);
        if (pat) {
          if (wb.weight) pat.weight = wb.weight;
        }
      }
    }
    showToast('✅ Patient checked in and sent to doctor queue!');
  };

  const handleComplete = (apptId: string) => {
    const idx = APPOINTMENTS.findIndex(a => a.id === apptId);
    if (idx !== -1) APPOINTMENTS[idx].status = 'Completed';
    setAppointments(APPOINTMENTS.filter(a => a.hospitalId === hospitalId && a.date === TODAY));
    showToast('🏁 Visit marked as completed!');
  };

  const filtered = appointments.filter(a => {
    if (tab === 'pending')    return a.status === 'Confirmed' || a.status === 'Pending';
    if (tab === 'checkedin')  return a.status === 'Checked-In' || a.status === 'In Consultation';
    return true;
  });

  const pending   = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Pending').length;
  const checkedIn = appointments.filter(a => a.status === 'Checked-In' || a.status === 'In Consultation').length;

  return (
    <div className="page-scroll">
      {toast && <div className="alert alert-success">{toast}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Patient Check-in</div>
          <div className="page-subtitle">{hospital?.name} · {formatDate(new Date().toISOString())}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            padding: '8px 14px', borderRadius: 10, background: '#fffbeb',
            border: '1.5px solid #fbbf24', fontSize: 13, fontWeight: 700, color: '#b45309',
          }}>⏳ {pending} Waiting</div>
          <div style={{
            padding: '8px 14px', borderRadius: 10, background: '#ecfdf5',
            border: '1.5px solid #6ee7b7', fontSize: 13, fontWeight: 700, color: '#065f46',
          }}>✅ {checkedIn} Checked In</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: 14 }}>
          <div className="filter-tabs">
            <button className={`filter-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
              ⏳ Pending ({pending})
            </button>
            <button className={`filter-tab${tab === 'checkedin' ? ' active' : ''}`} onClick={() => setTab('checkedin')}>
              ✅ Checked In ({checkedIn})
            </button>
            <button className={`filter-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
              📋 All Today ({appointments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Queue list */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">
              {tab === 'pending' ? '🎉' : tab === 'checkedin' ? '⏳' : '📅'}
            </span>
            <h3>{tab === 'pending' ? 'All patients checked in!' : 'No patients here'}</h3>
            <p>
              {tab === 'pending'
                ? 'Great job! Everyone is in the doctor queue.'
                : 'No appointments match this filter.'}
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('receptionist-appointments')}>
              Book Appointment
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...filtered]
            .sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0))
            .map(appt => {
              const patient = PATIENTS.find(p => p.id === appt.patientId);
              const doctor  = DOCTORS.find(d => d.id === appt.doctorId);
              const wb = weightBP[appt.id] ?? { weight: '', bp: '' };

              return (
                <div key={appt.id} className="card" style={{
                  border: appt.status === 'Pending' || appt.status === 'Confirmed'
                    ? '1.5px solid #fbbf24'
                    : appt.status === 'Checked-In'
                      ? '1.5px solid #6ee7b7'
                      : '1.5px solid var(--border)',
                }}>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Token */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'var(--primary-gradient)', color: '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 20, flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                      }}>
                        {appt.tokenNumber ?? '—'}
                        <div style={{ fontSize: 8, fontWeight: 600, opacity: 0.8, letterSpacing: 0.5 }}>TOKEN</div>
                      </div>

                      {/* Patient info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <Avatar uri={appt.patientPhoto} name={appt.patientName} size={40} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{appt.patientName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {patient?.uhid && <code style={{ fontSize: 11 }}>{patient.uhid}</code>}
                              {patient?.age && <span> · {patient.age}y {patient.sex}</span>}
                              {patient?.bloodGroup && (
                                <span style={{ marginLeft: 6, fontWeight: 700, color: '#b91c1c' }}>
                                  {patient.bloodGroup}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            🩺 <strong>{appt.doctorName}</strong> · {appt.doctorSpecialization}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🕐 {appt.time}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📋 {appt.reason}</div>
                        </div>

                        {patient?.chronicConditions && patient.chronicConditions.length > 0 && (
                          <div style={{ fontSize: 11, color: '#b45309', marginBottom: 6 }}>
                            ⚠️ {patient.chronicConditions.join(', ')}
                          </div>
                        )}
                        {patient?.allergies && patient.allergies.length > 0 && (
                          <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 8 }}>
                            🚫 Allergic to: {patient.allergies.join(', ')}
                          </div>
                        )}

                        {/* Pre-check-in vitals — only for pending */}
                        {(appt.status === 'Confirmed' || appt.status === 'Pending') && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                            <input
                              className="input" style={{ width: 130, fontSize: 12 }}
                              placeholder="Weight (kg)"
                              value={wb.weight}
                              onChange={e => setWeightBP(prev => ({ ...prev, [appt.id]: { ...wb, weight: e.target.value } }))}
                            />
                            <input
                              className="input" style={{ width: 140, fontSize: 12 }}
                              placeholder="BP (e.g. 120/80)"
                              value={wb.bp}
                              onChange={e => setWeightBP(prev => ({ ...prev, [appt.id]: { ...wb, bp: e.target.value } }))}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pre-visit vitals (optional)</span>
                          </div>
                        )}
                      </div>

                      {/* Status + Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 140 }}>
                        <Badge
                          label={appt.status}
                          variant={
                            appt.status === 'Confirmed' ? 'warning'
                            : appt.status === 'Checked-In' ? 'success'
                            : appt.status === 'Completed' ? 'info'
                            : 'info'
                          }
                        />
                        {(appt.status === 'Confirmed' || appt.status === 'Pending') && (
                          <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => handleCheckin(appt.id)}
                          >
                            ✅ Check In
                          </button>
                        )}
                        {appt.status === 'Checked-In' && (
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: 12 }}
                            onClick={() => handleComplete(appt.id)}
                          >
                            🏁 Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
