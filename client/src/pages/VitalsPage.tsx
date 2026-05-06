// client/src/pages/VitalsPage.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';

const SUGAR_TYPES = ['Fasting','Random','Post-meal','HbA1c'];
const FLAG_COLOR = (val:number|undefined, low:number, high:number) =>
  !val ? 'var(--text)' : val > high ? 'var(--danger)' : val < low ? 'var(--info)' : 'var(--success)';

export default function VitalsPage({ onNavigate, data, mode }: { onNavigate:(p:string,d?:any)=>void; data?:any; mode?:string }) {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState(data?.patientId || '');
  const [form, setForm] = useState({ bp_s:'', bp_d:'', hr:'', temp:'', temp_unit:'F', spo2:'', weight:'', weight_unit:'kg', height:'', rr:'', sugar:'', sugar_type:'Random', pain:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  const bmi = form.weight && form.height
    ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height)/100, 2)).toFixed(1)
    : null;

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

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        const res = await apiClient.get('/vitals', { params: { patient_id: patientId, limit: 10 } });
        setHistory(res.data.reverse());
      } catch {
        const rows = await db.vitals.where('patient_id').equals(patientId).reverse().limit(10).toArray();
        setHistory(rows.reverse());
      }
    })();
  }, [patientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Select a patient'); return; }
    setSaving(true); setError('');
    const now = new Date().toISOString();
    const id  = uuid();
    const payload: any = {
      id, patient_id: patientId, hospital_id: user?.hospitalId || 'hsp-001',
      bp_systolic: form.bp_s ? parseInt(form.bp_s) : null,
      bp_diastolic: form.bp_d ? parseInt(form.bp_d) : null,
      heart_rate: form.hr ? parseInt(form.hr) : null,
      temperature: form.temp ? parseFloat(form.temp) : null,
      temperature_unit: form.temp_unit,
      spo2: form.spo2 ? parseInt(form.spo2) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      weight_unit: form.weight_unit,
      height: form.height ? parseFloat(form.height) : null,
      height_unit: 'cm',
      bmi: bmi ? parseFloat(bmi) : null,
      respiratory_rate: form.rr ? parseInt(form.rr) : null,
      blood_sugar: form.sugar ? parseFloat(form.sugar) : null,
      blood_sugar_type: form.sugar_type || null,
      pain_score: form.pain ? parseInt(form.pain) : null,
      notes: form.notes || null,
      recorded_by: user?.id || '',
      recorded_at: now,
    };
    try {
      await apiClient.post('/vitals', payload);
      setSuccess('Vitals recorded ✓');
      setHistory(h => [...h, payload]);
    } catch {
      await markPending(db.vitals, payload, 'create');
      setSuccess('Saved locally — will sync when online ✓');
      await db.vitals.put(payload);
      setHistory(h => [...h, payload]);
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">🩺 Record Vitals</div>
      </div>

      {success && <div className="alert alert-success">✅ {success}</div>}
      {error   && <div className="alert alert-danger">⚠️ {error}</div>}

      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Select Patient</div></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)} required>
                <option value="">— Select patient —</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Measurements</div></div>
          <div className="card-body">
            <div className="vitals-grid" style={{gap:16}}>
              {/* BP */}
              <div>
                <div className="form-label" style={{marginBottom:6}}>🫀 Blood Pressure (mmHg)</div>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" type="number" placeholder="Sys" min={50} max={250} value={form.bp_s} onChange={e=>set('bp_s',e.target.value)} />
                  <span style={{alignSelf:'center',color:'var(--text-muted)'}}/> 
                  <input className="input" type="number" placeholder="Dia" min={30} max={150} value={form.bp_d} onChange={e=>set('bp_d',e.target.value)} />
                </div>
              </div>
              {/* HR */}
              <div className="form-group">
                <label className="form-label">💓 Heart Rate (bpm)</label>
                <input className="input" type="number" placeholder="72" min={30} max={250} value={form.hr} onChange={e=>set('hr',e.target.value)} />
              </div>
              {/* Temp */}
              <div>
                <div className="form-label" style={{marginBottom:6}}>🌡️ Temperature</div>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" type="number" placeholder="98.6" step={0.1} value={form.temp} onChange={e=>set('temp',e.target.value)} />
                  <select className="input" style={{width:'auto',flexShrink:0}} value={form.temp_unit} onChange={e=>set('temp_unit',e.target.value)}>
                    <option>F</option><option>C</option>
                  </select>
                </div>
              </div>
              {/* SpO2 */}
              <div className="form-group">
                <label className="form-label">🫁 SpO₂ (%)</label>
                <input className="input" type="number" placeholder="98" min={50} max={100} value={form.spo2} onChange={e=>set('spo2',e.target.value)} />
              </div>
              {/* Weight */}
              <div>
                <div className="form-label" style={{marginBottom:6}}>⚖️ Weight</div>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" type="number" placeholder="70" step={0.1} value={form.weight} onChange={e=>set('weight',e.target.value)} />
                  <select className="input" style={{width:'auto',flexShrink:0}} value={form.weight_unit} onChange={e=>set('weight_unit',e.target.value)}>
                    <option>kg</option><option>lbs</option>
                  </select>
                </div>
              </div>
              {/* Height */}
              <div className="form-group">
                <label className="form-label">📏 Height (cm)</label>
                <input className="input" type="number" placeholder="170" value={form.height} onChange={e=>set('height',e.target.value)} />
                {bmi && <div style={{fontSize:11,marginTop:4,color:'var(--text-muted)'}}>BMI: <strong style={{color:parseFloat(bmi)<18.5?'var(--info)':parseFloat(bmi)>30?'var(--danger)':'var(--success)'}}>{bmi}</strong></div>}
              </div>
              {/* RR */}
              <div className="form-group">
                <label className="form-label">🌬️ Respiratory Rate</label>
                <input className="input" type="number" placeholder="16" min={5} max={60} value={form.rr} onChange={e=>set('rr',e.target.value)} />
              </div>
              {/* Blood sugar */}
              <div>
                <div className="form-label" style={{marginBottom:6}}>🩸 Blood Sugar (mg/dL)</div>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" type="number" placeholder="110" step={0.1} value={form.sugar} onChange={e=>set('sugar',e.target.value)} />
                  <select className="input" style={{width:'auto',flexShrink:0}} value={form.sugar_type} onChange={e=>set('sugar_type',e.target.value)}>
                    {SUGAR_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Pain */}
              <div className="form-group">
                <label className="form-label">😣 Pain Score (0-10)</label>
                <input className="input" type="number" placeholder="0" min={0} max={10} value={form.pain} onChange={e=>set('pain',e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{marginTop:14}}>
              <label className="form-label">Notes</label>
              <textarea className="input" rows={2} style={{resize:'vertical'}} placeholder="Any observations…" value={form.notes} onChange={e=>set('notes',e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button type="button" className="btn btn-secondary" onClick={()=>onNavigate('patients')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !!success}>
            {saving ? <><div className="spinner spinner-sm"/>Saving…</> : '✓ Record Vitals'}
          </button>
        </div>
      </form>

      {/* History */}
      {patientId && history.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">📈 Vitals History (last {history.length})</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>BP</th><th>HR</th><th>SpO₂</th><th>Temp</th><th>Weight</th><th>Sugar</th></tr></thead>
              <tbody>
                {history.map((v:any,i:number)=>(
                  <tr key={i}>
                    <td style={{fontSize:12}}>{new Date(v.recorded_at).toLocaleDateString('en-IN')}</td>
                    <td style={{color:FLAG_COLOR(v.bp_systolic,90,140),fontWeight:600}}>{v.bp_systolic&&v.bp_diastolic?`${v.bp_systolic}/${v.bp_diastolic}`:'—'}</td>
                    <td style={{color:FLAG_COLOR(v.heart_rate,60,100)}}>{v.heart_rate||'—'}</td>
                    <td style={{color:FLAG_COLOR(v.spo2,95,100)}}>{v.spo2?`${v.spo2}%`:'—'}</td>
                    <td>{v.temperature?`${v.temperature}°${v.temperature_unit}`:'—'}</td>
                    <td>{v.weight?`${v.weight}${v.weight_unit}`:'—'}</td>
                    <td>{v.blood_sugar?`${v.blood_sugar} (${v.blood_sugar_type})`:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
