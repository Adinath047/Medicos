// client/src/pages/PatientsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';
import {
  validateRequired, validateEmail, validatePhone, validateNotFutureDate,
  validateRange, collectErrors, isValid, extractServerError, type FieldErrors,
} from '../utils/validation';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const ALLERGIES_COMMON = ['Penicillin','Sulfa drugs','Aspirin','Ibuprofen','Peanuts','Latex','Shellfish','Eggs','Milk'];
const CONDITIONS_COMMON = ['Hypertension','Type 2 Diabetes','Asthma','Hypothyroidism','COPD','Heart Disease','Chronic Kidney Disease','Arthritis'];

function AddPatientModal({ onClose, onDone }: { onClose: ()=>void; onDone: (p:any)=>void }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ name:'', dob:'', sex:'Male', blood_group:'', phone:'', email:'', address:'', ec_name:'', ec_phone:'', ec_relation:'', notes:'' });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    // Clear the field error as user types
    setFieldErrors(fe => { const n = { ...fe }; delete n[k]; return n; });
  };

  const age = form.dob ? Math.floor((Date.now() - new Date(form.dob).getTime()) / (365.25*24*3600*1000)) : null;

  function validate(): boolean {
    const errs = collectErrors({
      name:     validateRequired(form.name, 'Full name'),
      phone:    validatePhone(form.phone),
      email:    validateEmail(form.email),
      dob:      validateNotFutureDate(form.dob, 'Date of birth'),
      ec_phone: validatePhone(form.ec_phone),
    });
    setFieldErrors(errs);
    return isValid(errs);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setError('');
    const now = new Date().toISOString();
    const id  = uuid();
    const count = await db.patients.count();
    const uhid = `UHID-001-${String(count + 1).padStart(6,'0')}`;
    const payload = {
      id, uhid, hospital_id: user?.hospitalId || 'hsp-001',
      name: form.name.trim(), dob: form.dob || undefined, age: age ?? undefined,
      sex: form.sex as 'Male' | 'Female' | 'Other', blood_group: form.blood_group || undefined,
      phone: form.phone || undefined, email: form.email || undefined,
      address: form.address || undefined,
      allergies, chronic_conditions: conditions, current_medications: [],
      ec_name: form.ec_name || undefined, ec_phone: form.ec_phone || undefined, ec_relation: form.ec_relation || undefined,
      notes: form.notes || undefined, registered_by: user?.id,
      created_at: now, updated_at: now,
    };
    try {
      const res = await apiClient.post('/patients', payload);
      onDone(res.data);
    } catch (err) {
      const msg = extractServerError(err);
      // If it's a server-side validation error, show it; otherwise save offline
      const status = (err as any)?.response?.status;
      if (status === 422 || status === 400) {
        setError(msg);
        setSaving(false);
        return;
      }
      await markPending(db.patients, payload, 'create');
      onDone(payload);
    } finally { setSaving(false); }
  }

  const fieldStyle = (k: string): React.CSSProperties =>
    fieldErrors[k] ? { borderColor: 'var(--danger)' } : {};

  function FieldErr({ k }: { k: string }) {
    return fieldErrors[k] ? <div style={{ color:'var(--danger)', fontSize:11, marginTop:3 }}>⚠ {fieldErrors[k]}</div> : null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">👤 Register New Patient</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}} className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="Patient full name" value={form.name}
                  onChange={e=>set('name',e.target.value)}
                  style={fieldStyle('name')} />
                <FieldErr k="name" />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="input" type="date" value={form.dob}
                  onChange={e=>set('dob',e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={fieldStyle('dob')} />
                {age !== null && <span style={{fontSize:11,color:'var(--text-muted)'}}>Age: {age} years</span>}
                <FieldErr k="dob" />
              </div>
              <div className="form-group">
                <label className="form-label">Sex *</label>
                <select className="input" value={form.sex} onChange={e=>set('sex',e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="input" value={form.blood_group} onChange={e=>set('blood_group',e.target.value)}>
                  <option value="">— Select —</option>
                  {BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
          {/* Phone + Address row */}
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" type="tel" placeholder="+91 98765 43210" value={form.phone}
                  onChange={e=>set('phone',e.target.value)} style={fieldStyle('phone')} />
                <FieldErr k="phone" />
              </div>
              <div style={{gridColumn:'1/-1'}} className="form-group">
                <label className="form-label">Address</label>
                <input className="input" placeholder="Street, City, State" value={form.address} onChange={e=>set('address',e.target.value)} />
              </div>
            </div>

            {/* Allergies */}
            <div className="form-group">
              <label className="form-label">Allergies</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {ALLERGIES_COMMON.map(a=>(
                  <button type="button" key={a} className={`btn btn-sm ${allergies.includes(a)?'btn-danger':'btn-secondary'}`}
                    onClick={()=>setAllergies(x=>x.includes(a)?x.filter(i=>i!==a):[...x,a])}>
                    {a}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <input className="input" placeholder="Custom allergy…" value={customAllergyInput} onChange={e=>setCustomAllergyInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&customAllergyInput.trim()){ setAllergies(x=>[...x,customAllergyInput.trim()]); setCustomAllergyInput(''); e.preventDefault(); }}} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{ if(customAllergyInput.trim()){ setAllergies(x=>[...x,customAllergyInput.trim()]); setCustomAllergyInput(''); }}}>Add</button>
              </div>
              {allergies.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>{allergies.map(a=><span key={a} className="tag tag-red">{a} <button type="button" style={{background:'none',border:'none',cursor:'pointer',padding:0,marginLeft:3,color:'inherit'}} onClick={()=>setAllergies(x=>x.filter(i=>i!==a))}>✕</button></span>)}</div>}
            </div>

            {/* Chronic conditions */}
            <div className="form-group">
              <label className="form-label">Chronic Conditions</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {CONDITIONS_COMMON.map(c=>(
                  <button type="button" key={c} className={`btn btn-sm ${conditions.includes(c)?'btn-primary':'btn-secondary'}`}
                    onClick={()=>setConditions(x=>x.includes(c)?x.filter(i=>i!==c):[...x,c])}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency contact */}
            <div style={{background:'var(--surface-alt)',borderRadius:'var(--radius)',padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{gridColumn:'1/-1',fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:2}}>Emergency Contact</div>
              <div className="form-group"><label className="form-label">Name</label><input className="input" placeholder="Contact name" value={form.ec_name} onChange={e=>set('ec_name',e.target.value)} /></div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" placeholder="+91 …" value={form.ec_phone}
                  onChange={e=>set('ec_phone',e.target.value)}
                  style={fieldStyle('ec_phone')} />
                <FieldErr k="ec_phone" />
              </div>
              <div className="form-group"><label className="form-label">Relation</label><input className="input" placeholder="e.g. Spouse" value={form.ec_relation} onChange={e=>set('ec_relation',e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner spinner-sm"/>Saving…</> : '✓ Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatientsPage({ onNavigate, autoOpen }: { onNavigate: (p:string,d?:any)=>void; autoOpen?: boolean }) {
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';

  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(!!autoOpen && !isDoctor);
  const [loading, setLoading]   = useState(true);
  const [source, setSource]     = useState<'server'|'local'>('server');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/patients', { params: { q: search || undefined, limit: 200 } });
      setPatients(res.data.patients); setSource('server');
    } catch {
      let q = db.patients.toCollection();
      if (search) {
        const s = search.toLowerCase();
        q = db.patients.filter(p => p.name?.toLowerCase().includes(s) || p.phone?.includes(s) || p.uhid?.toLowerCase().includes(s));
      }
      setPatients(await q.reverse().limit(200).toArray()); setSource('local');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <>
      {showAdd && !isDoctor && <AddPatientModal onClose={()=>setShowAdd(false)} onDone={p=>{ setPatients(x=>[p,...x]); setShowAdd(false); }} />}
      <div className="page-header">
        <div>
          <div className="page-title">{isDoctor ? 'Select Patient' : 'Patients'}</div>
          <div className="page-sub">
            {isDoctor ? 'Click a patient to write prescription or encounter' : `${patients.length} records`}
            {source==='local'&&<span className="badge badge-warning" style={{marginLeft:8}}>📵 Offline</span>}
          </div>
        </div>
        {!isDoctor && <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Register Patient</button>}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{flex:1,maxWidth:400}}>
            <span style={{color:'var(--text-muted)'}}>🔍</span>
            <input placeholder="Search name, UHID, phone…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        {loading
          ? <div style={{padding:40,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
          : patients.length === 0
            ? <div className="empty-state"><span className="empty-icon">👥</span><h3>No patients found</h3><p>{search?'Try a different search.':'Register the first patient.'}</p></div>
            : <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Patient</th><th>UHID</th><th>Age / Sex</th><th>Blood</th><th>Phone</th>
                    {!isDoctor && <th>Conditions</th>}
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {patients.map(p=>(
                      <tr key={p.id} style={{cursor:'pointer'}}
                        onClick={()=> isDoctor ? onNavigate('patient_detail',{patientId:p.id}) : onNavigate('patient_detail',{patientId:p.id})}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="patient-avatar" style={{width:34,height:34,fontSize:14,borderRadius:10}}>{p.name?.charAt(0)}</div>
                            <div>
                              <div style={{fontWeight:700}}>{p.name}</div>
                              <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.phone||p.email||'—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{fontSize:12,color:'var(--primary)',fontWeight:700}}>{p.uhid}</td>
                        <td>{p.age||'—'} · {p.sex}</td>
                        <td>{p.blood_group?<span className="tag">{p.blood_group}</span>:'—'}</td>
                        <td style={{color:'var(--text-muted)'}}>{p.phone||'—'}</td>
                        {!isDoctor && (
                          <td>
                            {(Array.isArray(p.chronic_conditions)?p.chronic_conditions:JSON.parse(p.chronic_conditions||'[]')).slice(0,2).map((c:string)=>(
                              <span key={c} className="tag" style={{marginRight:4,marginBottom:2}}>{c}</span>
                            ))}
                          </td>
                        )}
                        <td>
                          {isDoctor ? (
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();onNavigate('new_prescription',{patientId:p.id});}}>
                                Prescribe
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();onNavigate('patient_detail',{patientId:p.id});}}>
                                View
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();onNavigate('patient_detail',{patientId:p.id});}}>View →</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        }
      </div>
    </>
  );
}
