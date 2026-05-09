// client/src/pages/AppointmentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';

const STATUS_FLOW: Record<string,string> = { 'Scheduled':'Confirmed','Confirmed':'Checked-In','Checked-In':'Completed' };
const STATUS_COLOR: Record<string,string> = { 'Scheduled':'badge-info','Confirmed':'badge-success','Checked-In':'badge-purple','Completed':'badge-neutral','Cancelled':'badge-danger','No-Show':'badge-warning' };

function today() { return new Date().toISOString().split('T')[0]; }

export default function AppointmentsPage({ onNavigate }: { onNavigate:(p:string,d?:any)=>void }) {
  const { user } = useAuthStore();
  const [appts, setAppts] = useState<any[]>([]);
  const [date, setDate]   = useState(today());
  const [patients, setPatients] = useState<any[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', date:today(), time:'09:00', reason:'' });
  const [saving, setSaving] = useState(false);
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/appointments', { params: { date } });
      setAppts(res.data);
    } catch {
      setAppts(await db.appointments.where('date').equals(date).toArray());
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      try { const r = await apiClient.get('/patients',{params:{limit:200}}); setPatients(r.data.patients); }
      catch { setPatients(await db.patients.toArray()); }
    })();
  }, []);

  async function bookAppt(e:React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const id = uuid(); const now = new Date().toISOString();
    const payload: any = { id, hospital_id: user?.hospitalId||'hsp-001', ...form, doctor_id: form.doctor_id||user?.id, status:'Scheduled', token_number: appts.length+1, created_at:now, updated_at:now };
    try { const r = await apiClient.post('/appointments', payload); setAppts(a=>[...a,r.data]); }
    catch { await markPending(db.appointments, payload,'create'); await db.appointments.put(payload); setAppts(a=>[...a,payload]); }
    finally { setSaving(false); setShowAdd(false); }
  }

  async function updateStatus(id:string, status:string) {
    try { const r = await apiClient.put(`/appointments/${id}/status`,{status}); setAppts(a=>a.map(x=>x.id===id?r.data:x)); }
    catch { await db.appointments.update(id,{status,_syncStatus:'pending'}); setAppts(a=>a.map(x=>x.id===id?{...x,status}:x)); }
  }

  const grouped = appts.reduce((acc:any,a:any)=>{ const k=a.doctor_name||'Doctor'; if(!acc[k])acc[k]=[]; acc[k].push(a); return acc; },{});

  return (
    <>
      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">📅 Book Appointment</div><button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button></div>
            <form onSubmit={bookAppt}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Patient *</label>
                  <select className="input" value={form.patient_id} onChange={e=>set('patient_id',e.target.value)} required>
                    <option value="">— Select —</option>
                    {patients.map(p=><option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor ID (optional)</label>
                  <input className="input" placeholder="Leave blank to assign yourself" value={form.doctor_id} onChange={e=>set('doctor_id',e.target.value)} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label className="form-label">Date</label><input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">Time</label><input className="input" type="time" value={form.time} onChange={e=>set('time',e.target.value)} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Reason</label><input className="input" placeholder="Reason for visit" value={form.reason} onChange={e=>set('reason',e.target.value)} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Booking…':'✓ Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">📅 Appointments</div>
          <div className="page-sub">{appts.length} for {new Date(date+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'auto'}} />
          {user?.role !== 'doctor' && (
            <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Book</button>
          )}
        </div>
      </div>

      {loading
        ? <div style={{padding:48,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
        : appts.length === 0
          ? <div className="card"><div className="empty-state"><span className="empty-icon">📅</span><h3>No appointments</h3>{user?.role !== 'doctor' && <button className="btn btn-primary" style={{marginTop:8}} onClick={()=>setShowAdd(true)}>+ Book First</button>}</div></div>
          : Object.entries(grouped).map(([doc,list]:any)=>(
              <div key={doc} className="card">
                <div className="card-header"><div className="card-title">👨‍⚕️ {doc}</div><span className="badge badge-info">{list.length}</span></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Patient</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {list.sort((a:any,b:any)=>a.token_number-b.token_number).map((a:any)=>(
                        <tr key={a.id}>
                          <td><div className="encounter-token">{a.token_number||'—'}</div></td>
                          <td>
                            <div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>onNavigate('patient_detail',{patientId:a.patient_id})}>{a.patient_name||'—'}</div>
                            <div style={{fontSize:11,color:'var(--text-muted)'}}>{a.uhid||''}</div>
                          </td>
                          <td style={{fontWeight:600}}>{a.time}</td>
                          <td style={{color:'var(--text-muted)',fontSize:12}}>{a.reason||'—'}</td>
                          <td><span className={`badge ${STATUS_COLOR[a.status]||'badge-neutral'}`}>{a.status}</span></td>
                          <td style={{display:'flex',gap:6}}>
                            {STATUS_FLOW[a.status]&&<button className="btn btn-primary btn-sm" onClick={()=>updateStatus(a.id,STATUS_FLOW[a.status])}>→ {STATUS_FLOW[a.status]}</button>}
                            {!['Cancelled','Completed'].includes(a.status)&&<button className="btn btn-ghost btn-sm" onClick={()=>updateStatus(a.id,'Cancelled')}>✕</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
      }
    </>
  );
}
