import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { db } from '../db/localDB';
import { useAuthStore } from '../store/authStore';

export default function FrontDeskDashboard({ onNavigate }: { onNavigate: (p: string, d?: any) => void }) {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [patientsMap, setPatientsMap]   = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Emergency Alert state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [alertDoctors, setAlertDoctors] = useState<any[]>([]);
  const [alertPatients, setAlertPatients] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedPatId, setSelectedPatId] = useState('');
  const [alertMessage, setAlertMessage] = useState('Emergency assistance required at front desk!');
  const [submittingAlert, setSubmittingAlert] = useState(false);

  useEffect(() => {
    if (showEmergencyModal) {
      setSelectedDocId('');
      setSelectedPatId('');
      setAlertMessage('Emergency assistance required at front desk!');
      
      apiClient.get('/users/doctors')
        .then(res => setAlertDoctors(res.data || []))
        .catch(() => {});
        
      apiClient.get('/patients?limit=500')
        .then(res => setAlertPatients(res.data.patients || []))
        .catch(() => {});
    }
  }, [showEmergencyModal]);

  async function handleSendAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocId || !alertMessage.trim()) return;
    
    setSubmittingAlert(true);
    try {
      await apiClient.post('/notifications', {
        doctor_id: selectedDocId,
        patient_id: selectedPatId || undefined,
        message: alertMessage.trim(),
      });
      alert('Emergency alert sent to doctor.');
      setShowEmergencyModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to trigger emergency alert.');
    } finally {
      setSubmittingAlert(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: string) {
    try {
      const r = await apiClient.put(`/appointments/${id}/status`, { status });
      await db.appointments.put({ ...r.data, _syncStatus: 'synced' });
      setAppointments(prev => prev.map(x => x.id === id ? r.data : x));
    } catch {
      const existing = appointments.find(x => x.id === id);
      if (existing) {
        const payload = { ...existing, status, _syncStatus: 'pending', updated_at: new Date().toISOString() };
        await db.appointments.put(payload);
        await db.syncQueue.add({
          table: 'appointments',
          operation: 'update',
          payload,
          clientUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          attempts: 0
        });
      } else {
        await db.appointments.update(id, { status, _syncStatus: 'pending' });
      }
      setAppointments(prev => prev.map(x => x.id === id ? { ...x, status } : x));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Fetch Today's Appointments
        let apptsData = [];
        try {
          const r = await apiClient.get('/appointments'); // We'll filter on client to be safe
          apptsData = r.data;
        } catch {
          apptsData = await db.appointments.toArray();
        }
        const todaysAppts = apptsData.filter((a: any) => a.date?.startsWith(today));
        
        // 2. Fetch Pending Bills
        let billsData = [];
        try {
          const r = await apiClient.get('/billing');
          billsData = r.data;
        } catch {
          billsData = await db.billing.toArray();
        }
        const pending = billsData.filter((b: any) => ['Pending', 'Partial'].includes(b.payment_status) && b.bill_type !== 'pharmacy');

        // 3. Fetch Patients for names
        let patsData = [];
        try {
          const r = await apiClient.get('/patients', { params: { limit: 1000 } });
          patsData = r.data.patients;
        } catch {
          patsData = await db.patients.toArray();
        }
        const pMap: Record<string, any> = {};
        patsData.forEach((p: any) => pMap[p.id] = p);

        setAppointments(todaysAppts);
        setPendingBills(pending);
        setPatientsMap(pMap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /> Loading dashboard...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Front Desk Dashboard</h2>
        <div style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.name.split(' ')[0]}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* QUICK ACTIONS */}
        <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => onNavigate('patients', { autoOpen: true })} style={{ justifyContent: 'center' }}>
              + Register New Patient
            </button>
            <button className="btn" onClick={() => onNavigate('appointments')} style={{ justifyContent: 'center' }}>
              📅 Schedule Appointment
            </button>
            <button className="btn" onClick={() => onNavigate('billing')} style={{ justifyContent: 'center' }}>
              💳 Create Bill
            </button>
            <button className="btn btn-danger" onClick={() => setShowEmergencyModal(true)} style={{ justifyContent: 'center', background: '#dc2626', color: '#fff', border: 'none' }}>
              🚨 Trigger Emergency Alert
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{appointments.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>TODAY'S APPT</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }}></div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{pendingBills.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>PENDING BILLS</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        
        {/* TODAY'S QUEUE */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Today's Queue</h3>
            <button className="btn btn-sm" onClick={() => onNavigate('appointments')}>View All</button>
          </div>
          <div style={{ padding: 20 }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No appointments scheduled for today.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {appointments.slice(0, 5).map(a => {
                  const p = patientsMap[a.patient_id];
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p?.name || 'Unknown Patient'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p?.uhid} · {a.time}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 20, fontWeight: 600, background: a.status === 'Completed' ? '#dcfce7' : a.status === 'Checked-In' ? '#e0e7ff' : '#f1f5f9', color: a.status === 'Completed' ? '#166534' : a.status === 'Checked-In' ? '#3730a3' : '#475569' }}>
                          {a.status || 'Scheduled'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {['Scheduled', 'Confirmed'].includes(a.status) && (
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11, minHeight: 24 }} onClick={() => updateAppointmentStatus(a.id, 'Checked-In')}>
                              Check-In
                            </button>
                          )}
                          {a.status === 'Checked-In' && (
                            <>
                              {user?.role === 'doctor' && (
                                <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11, minHeight: 24 }} onClick={() => onNavigate('new_encounter', { patientId: a.patient_id, appointmentId: a.id })}>
                                  Call Next
                                </button>
                              )}
                              <button className="btn btn-success btn-sm" style={{ padding: '2px 8px', fontSize: 11, minHeight: 24, background: '#166534', color: '#fff', border: 'none' }} onClick={() => updateAppointmentStatus(a.id, 'Completed')}>
                                Check-Out
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PENDING BILLING */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#fffbeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#b45309' }}>Action Required: Unpaid Bills</h3>
            <button className="btn btn-sm" onClick={() => onNavigate('billing')}>Go to Billing</button>
          </div>
          <div style={{ padding: 20 }}>
            {pendingBills.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>All clear! No pending bills.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingBills.slice(0, 5).map(b => {
                  const p = patientsMap[b.patient_id];
                  const due = b.net_amount - (b.paid_amount || 0);
                  return (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#92400e' }}>{p?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#b45309' }}>{new Date(b.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#b45309' }}>₹{due} Due</div>
                        <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Total: ₹{b.net_amount}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="modal-overlay" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Trigger Emergency Alert</div>
              <button className="modal-close" onClick={() => setShowEmergencyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendAlert}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Alert Doctor *</label>
                  <select
                    className="input"
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                    required
                  >
                    <option value="">— Select Doctor to Alert —</option>
                    {alertDoctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Patient (Optional)</label>
                  <select
                    className="input"
                    value={selectedPatId}
                    onChange={e => setSelectedPatId(e.target.value)}
                  >
                    <option value="">— Select Patient —</option>
                    {alertPatients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Emergency Message *</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Describe the emergency..."
                    value={alertMessage}
                    onChange={e => setAlertMessage(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ background: '#dc2626', color: '#fff', border: 'none' }} disabled={submittingAlert || !selectedDocId}>
                  {submittingAlert ? 'Sending Alert...' : '🚨 Send Emergency Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
