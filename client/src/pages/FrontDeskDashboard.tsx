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
                      <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 20, fontWeight: 600, background: a.status === 'Completed' ? '#dcfce7' : '#f1f5f9', color: a.status === 'Completed' ? '#166534' : '#475569' }}>
                        {a.status || 'Scheduled'}
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
    </div>
  );
}
