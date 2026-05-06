// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { db } from '../db/localDB';
import { useAuthStore } from '../store/authStore';

interface Stats {
  totalPatients: number; todayEncounters: number;
  todayAppointments: number; checkedIn: number;
  totalDoctors: number; pendingBilling: number;
  recentPatients: any[]; todayQueue: any[];
}

const STATUS_COLOR: Record<string,string> = {
  'Scheduled':'badge-info','Confirmed':'badge-success','Checked-In':'badge-success',
  'Completed':'badge-neutral','Cancelled':'badge-danger','No-Show':'badge-warning',
};

const KPI_ICONS = {
  patients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  encounters: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  doctors: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  billing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

export default function Dashboard({ onNavigate }: { onNavigate: (p: string, d?: any) => void }) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'server'|'local'>('server');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/dashboard');
        setStats(res.data); setSource('server');
      } catch {
        const [patients, encounters, appointments] = await Promise.all([
          db.patients.where('hospital_id').equals(user?.hospitalId || 'hsp-001').count(),
          db.encounters.count(),
          db.appointments.count(),
        ]);
        const recent = await db.patients.orderBy('created_at').reverse().limit(5).toArray();
        setStats({ totalPatients: patients, todayEncounters: encounters, todayAppointments: appointments, checkedIn: 0, totalDoctors: 0, pendingBilling: 0, recentPatients: recent, todayQueue: [] });
        setSource('local');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="loading-screen" style={{height:'60vh'}}><div className="spinner"/></div>;

  const KPI = [
    { icon: KPI_ICONS.patients,   label: 'Total Patients',     value: stats?.totalPatients ?? 0,     color: '#0d9488', bg: '#f0fdfa' },
    { icon: KPI_ICONS.encounters, label: "Today's Encounters",  value: stats?.todayEncounters ?? 0,   color: '#2563eb', bg: '#eff6ff' },
    { icon: KPI_ICONS.calendar,   label: 'Appointments Today',  value: stats?.todayAppointments ?? 0, color: '#d97706', bg: '#fffbeb' },
    { icon: KPI_ICONS.check,      label: 'Checked In',          value: stats?.checkedIn ?? 0,         color: '#16a34a', bg: '#f0fdf4' },
    { icon: KPI_ICONS.doctors,    label: 'Active Doctors',      value: stats?.totalDoctors ?? 0,      color: '#7c3aed', bg: '#f5f3ff' },
    { icon: KPI_ICONS.billing,    label: 'Pending Billing',     value: stats?.pendingBilling ?? 0,    color: '#dc2626', bg: '#fef2f2' },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening';
  })();

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}, Dr. {user?.name?.split(' ')[0]}</div>
          <div className="page-sub">
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            {source === 'local' && <span className="badge badge-warning" style={{marginLeft:8}}>Offline data</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('patients', { autoOpen: true })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Patient
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {KPI.map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ width:32, height:32, borderRadius:8, background:k.bg, color:k.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {k.icon}
            </div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value.toLocaleString()}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column tables */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Today's Queue */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Today's Queue</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('appointments')}>View all</button>
          </div>
          {(stats?.todayQueue ?? []).length === 0
            ? <div className="empty-state" style={{padding:32}}><span className="empty-icon">📅</span><p>No appointments today</p></div>
            : <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
                  <tbody>
                    {stats!.todayQueue.map((a: any) => (
                      <tr key={a.id} onClick={() => onNavigate('patient_detail', { patientId: a.patient_id })}>
                        <td><div className="encounter-token">{a.token_number}</div></td>
                        <td>
                          <div style={{fontWeight:600}}>{a.patient_name}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{a.uhid}</div>
                        </td>
                        <td style={{fontSize:12,color:'var(--text-muted)'}}>{a.doctor_name}</td>
                        <td><span className={`badge ${STATUS_COLOR[a.status] ?? 'badge-neutral'}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Patients</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('patients')}>View all</button>
          </div>
          {(stats?.recentPatients ?? []).length === 0
            ? <div className="empty-state" style={{padding:32}}><span className="empty-icon">👥</span><p>No patients registered yet</p></div>
            : <div style={{display:'flex',flexDirection:'column'}}>
                {stats!.recentPatients.map((p: any) => (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid var(--border-light)',cursor:'pointer'}}
                    onClick={() => onNavigate('patient_detail', { patientId: p.id })}>
                    <div className="patient-avatar" style={{width:34,height:34,fontSize:13,borderRadius:9}}>
                      {p.name?.charAt(0)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.uhid} · {p.age}y {p.sex}</div>
                    </div>
                    {p.blood_group && <span className="tag">{p.blood_group}</span>}
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><div className="card-title">Quick Actions</div></div>
        <div className="card-body">
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[
              { label:'Register Patient',   page:'patients',         data:{ autoOpen: true } },
              { label:'New Encounter',      page:'new_encounter',    data: null },
              { label:'Write Prescription', page:'new_prescription', data: null },
              { label:'Record Vitals',      page:'new_vitals',       data: null },
              { label:'Book Appointment',   page:'appointments',     data:{ autoOpen: true } },
              { label:'New Bill',           page:'billing',          data:{ autoOpen: true } },
            ].map(a => (
              <button key={a.label} className="btn btn-secondary" onClick={() => onNavigate(a.page, a.data)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
