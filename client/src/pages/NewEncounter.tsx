// client/src/pages/NewEncounter.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';

const ENC_TYPES = ['OPD','Emergency','Follow-up','IPD','Tele'];

export default function NewEncounter({ onNavigate, data }: { onNavigate:(p:string,d?:any)=>void; data?:any }) {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState(data?.patientId || '');
  const [form, setForm] = useState({ encounter_type:'OPD', chief_complaint:'', history:'', past_history:'', examination:'', impression:'', plan:'', advice:'', follow_up_date:'', refer_to:'' });
  const [diagnoses, setDiagnoses] = useState<{name:string;code?:string;type?:string}[]>([]);
  const [diagInput, setDiagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/patients', { params: { limit: 200 } });
        setPatients(res.data.patients);
      } catch {
        setPatients(await db.patients.toArray());
      }
    })();
  }, []);

  function addDiag() {
    const n = diagInput.trim();
    if (!n) return;
    setDiagnoses(d => [...d, { name: n }]);
    setDiagInput('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient'); return; }
    setSaving(true); setError('');
    const now = new Date().toISOString();
    const id  = uuid();
    const payload: any = {
      id, hospital_id: user?.hospitalId || 'hsp-001',
      patient_id: patientId, doctor_id: user?.id,
      encounter_type: form.encounter_type, token_number: null, status: 'Active',
      chief_complaint: form.chief_complaint || null,
      history: form.history || null, past_history: form.past_history || null,
      examination: form.examination || null,
      diagnosis: diagnoses, impression: form.impression || null,
      plan: form.plan || null, advice: form.advice || null,
      follow_up_date: form.follow_up_date || null, refer_to: form.refer_to || null,
      created_at: now, updated_at: now,
    };
    try {
      const res = await apiClient.post('/encounters', payload);
      await db.encounters.put({ ...res.data, _syncStatus: 'synced' });
      setSuccess('Encounter saved to server ✓');
    } catch {
      await markPending(db.encounters, payload, 'create');
      setSuccess('Saved locally — will sync when online ✓');
    } finally { setSaving(false); }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>onNavigate('patients')}>← Back</button>
      <div className="page-header">
        <div className="page-title">📋 New Clinical Encounter</div>
      </div>

      {success && <div className="alert alert-success">✅ {success}<button className="btn btn-primary btn-sm" style={{marginLeft:12}} onClick={()=>onNavigate('patients')}>Back to Patients</button></div>}
      {error   && <div className="alert alert-danger">⚠️ {error}</div>}

      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Patient & Type</div></div>
          <div className="card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{gridColumn:'1/-1'}} className="form-group">
              <label className="form-label">Patient *</label>
              <select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)} required>
                <option value="">— Select patient —</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Encounter Type</label>
              <select className="input" value={form.encounter_type} onChange={e=>set('encounter_type',e.target.value)}>
                {ENC_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chief Complaint</label>
              <input className="input" placeholder="e.g. Fever and headache for 3 days" value={form.chief_complaint} onChange={e=>set('chief_complaint',e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">📝 SOAP Notes</div></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              {k:'history',label:'History of Presenting Illness (HPI)',ph:'Describe onset, duration, associated symptoms…'},
              {k:'past_history',label:'Past Medical History',ph:'Previous illnesses, surgeries, hospitalizations…'},
              {k:'examination',label:'Physical Examination',ph:'General appearance, vital signs, systemic examination findings…'},
              {k:'impression',label:'Clinical Impression / Assessment',ph:'Your clinical assessment…'},
              {k:'plan',label:'Treatment Plan',ph:'Medications, investigations, procedures ordered…'},
              {k:'advice',label:'Patient Advice / Instructions',ph:'Lifestyle advice, precautions, follow-up instructions…'},
            ].map(f=>(
              <div key={f.k} className="form-group">
                <label className="form-label">{f.label}</label>
                <textarea className="input" rows={3} style={{resize:'vertical'}} placeholder={f.ph}
                  value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">🔬 Diagnosis</div></div>
          <div className="card-body">
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input className="input" placeholder="Type diagnosis name (e.g. Viral fever, Hypertension)…" value={diagInput}
                onChange={e=>setDiagInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ addDiag(); e.preventDefault(); }}} />
              <button type="button" className="btn btn-primary btn-sm" onClick={addDiag}>+ Add</button>
            </div>
            {diagnoses.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {diagnoses.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:'var(--primary-light)',border:'1px solid var(--primary-mid)',borderRadius:'var(--radius-full)',padding:'4px 12px'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--primary)'}}>{d.name}</span>
                    <button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontSize:14}} onClick={()=>setDiagnoses(x=>x.filter((_,j)=>j!==i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">📅 Follow-up & Referral</div></div>
          <div className="card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input className="input" type="date" value={form.follow_up_date} onChange={e=>set('follow_up_date',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Refer to Specialist</label>
              <input className="input" placeholder="e.g. Cardiologist, Neurologist" value={form.refer_to} onChange={e=>set('refer_to',e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button type="button" className="btn btn-secondary" onClick={()=>onNavigate('patients')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !!success}>
            {saving ? <><div className="spinner spinner-sm"/>Saving…</> : '✓ Save Encounter'}
          </button>
        </div>
      </form>
    </>
  );
}
