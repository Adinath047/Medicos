// client/src/pages/AppointmentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';
import { validatePhone, validateRequired, isValidPhone, extractServerError } from '../utils/validation';

const STATUS_FLOW: Record<string,string> = { 'Scheduled':'Confirmed','Confirmed':'Checked-In','Checked-In':'Completed' };
const STATUS_COLOR: Record<string,string> = { 'Scheduled':'badge-info','Confirmed':'badge-success','Checked-In':'badge-purple','Completed':'badge-neutral','Cancelled':'badge-danger','No-Show':'badge-warning' };

function today() { return new Date().toISOString().split('T')[0]; }

export default function AppointmentsPage({ onNavigate, data }: { onNavigate:(p:string,d?:any)=>void; data?:any }) {
  const { user } = useAuthStore();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);
  const [date, setDate]   = useState(today());
  const [patients, setPatients] = useState<any[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', date:today(), time:'09:00', reason:'' });
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState<{name:string; phone:string; sex:'Male'|'Female'|'Other'}>({ name: '', phone: '', sex: 'Male' });
  const [patientSearch, setPatientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [bookError, setBookError] = useState('');
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
    (async () => {
      try { const r = await apiClient.get('/users/doctors'); setDoctors(r.data); }
      catch { /* ignore offline docs for now */ }
    })();
  }, []);

  useEffect(() => {
    if (data?.showAdd) {
      setShowAdd(true);
      if (data?.prefillPatient) set('patient_id', data.prefillPatient);
      if (data?.prefillDoctor) set('doctor_id', data.prefillDoctor);
      if (data?.reason) set('reason', data.reason);
    }
  }, [data]);

  async function bookAppt(e:React.FormEvent) {
    e.preventDefault();
    setBookError('');

    // Client-side validation
    if (!isNewPatient && !form.patient_id) {
      setBookError('Please select a patient.');
      return;
    }
    if (isNewPatient) {
      if (!newPatient.name.trim()) { setBookError('Patient name is required.'); return; }
      if (newPatient.phone && !isValidPhone(newPatient.phone)) {
        setBookError('Please enter a valid phone number.'); return;
      }
    }
    if (!form.doctor_id) { setBookError('Please select a doctor.'); return; }
    if (!form.date)      { setBookError('Date is required.'); return; }
    if (!form.time)      { setBookError('Time is required.'); return; }
    // Prevent booking more than 1 year ahead
    const apptDate = new Date(form.date);
    const daysForward = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysForward > 365) { setBookError('Cannot book more than 1 year in advance.'); return; }

    setSaving(true);
    
    let finalPatientId = form.patient_id;
    if (isNewPatient) {
      try {
        const pRes = await apiClient.post('/patients', newPatient);
        finalPatientId = pRes.data.id;
        setPatients(p => [...p, pRes.data]);
      } catch (err) {
        const status = (err as any)?.response?.status;
        if (status === 422 || status === 400) {
          setBookError(extractServerError(err));
          setSaving(false);
          return;
        }
        const pId = uuid();
        const payload = { id: pId, uhid: 'UHID-001-' + Math.floor(Math.random()*1000000), hospital_id: user?.hospitalId||'hsp-001', ...newPatient, allergies: [], chronic_conditions: [], current_medications: [], is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await markPending(db.patients, payload, 'create');
        await db.patients.put(payload);
        finalPatientId = pId;
        setPatients(p => [...p, payload]);
      }
    }

    const id = uuid(); const now = new Date().toISOString();
    const payload: any = { id, hospital_id: user?.hospitalId||'hsp-001', ...form, patient_id: finalPatientId, doctor_id: form.doctor_id||user?.id, status:'Scheduled', token_number: appts.length+1, created_at:now, updated_at:now };
    try {
      const r = await apiClient.post('/appointments', payload);
      setAppts(a=>[...a,r.data]);
    } catch (err) {
      const status = (err as any)?.response?.status;
      if (status === 422 || status === 400 || status === 409) {
        setBookError(extractServerError(err));
        setSaving(false);
        return;
      }
      await markPending(db.appointments, payload,'create');
      await db.appointments.put(payload);
      setAppts(a=>[...a,payload]);
    } finally { setSaving(false); setShowAdd(false); setIsNewPatient(false); }
  }

  const filteredPatients = patients.filter(p => !patientSearch || p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone?.includes(patientSearch) || p.uhid?.includes(patientSearch));

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
                {bookError && <div className="alert alert-danger" style={{marginBottom:12}}>⚠️ {bookError}</div>}
                <div style={{display:'flex',gap:10,marginBottom:12}}>
                  <label style={{display:'flex',gap:4,alignItems:'center'}}>
                    <input type="radio" checked={!isNewPatient} onChange={()=>setIsNewPatient(false)} /> Existing Patient
                  </label>
                  <label style={{display:'flex',gap:4,alignItems:'center'}}>
                    <input type="radio" checked={isNewPatient} onChange={()=>setIsNewPatient(true)} /> New Patient (Caller)
                  </label>
                </div>
                
                {!isNewPatient ? (
                  <div className="form-group">
                    <label className="form-label">Search Patient (Name, Phone, UHID) *</label>
                    <input className="input" placeholder="Search..." value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} style={{marginBottom:8}} />
                    <select className="input" value={form.patient_id} onChange={e=>set('patient_id',e.target.value)} required>
                      <option value="">— Select Patient —</option>
                      {filteredPatients.map(p=><option key={p.id} value={p.id}>{p.name} - {p.phone||'No Phone'} ({p.uhid})</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12, marginBottom:12}}>
                    <div className="form-group"><label className="form-label">Name *</label><input className="input" required value={newPatient.name} onChange={e=>setNewPatient({...newPatient,name:e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Phone *</label><input className="input" required value={newPatient.phone} onChange={e=>setNewPatient({...newPatient,phone:e.target.value})} /></div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Doctor *</label>
                  <select className="input" value={form.doctor_id} onChange={e=>set('doctor_id',e.target.value)} required>
                    <option value="">— Select Doctor —</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}</option>)}
                    {user?.role === 'doctor' && !doctors.find(d=>d.id===user.id) && <option value={user.id}>Dr. {user.name} (Me)</option>}
                  </select>
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
                            {a.status === 'Checked-In' && (
                              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('new_encounter', { patientId: a.patient_id, appointmentId: a.id })}>
                                Call Next / Encounter
                              </button>
                            )}
                            {a.status !== 'Checked-In' && STATUS_FLOW[a.status] && (
                              <button className="btn btn-secondary btn-sm" onClick={()=>updateStatus(a.id,STATUS_FLOW[a.status])}>→ {STATUS_FLOW[a.status]}</button>
                            )}
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
