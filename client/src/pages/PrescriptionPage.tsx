// client/src/pages/PrescriptionPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';
import { printPrescriptionSlip } from '../utils/printTemplates';
import { searchMedicines, findMedicineByName, type Medicine } from '../utils/medicines';

const FREQ = ['Once daily','Twice daily','Thrice daily','Every 8h','Every 6h','At bedtime','Before meals','After meals','As needed','Weekly'];
const DUR  = ['1 day','3 days','5 days','7 days','10 days','14 days','1 month','2 months','3 months','Ongoing'];
const INST = ['After meals','Before meals','With meals','Empty stomach','At bedtime','In the morning','With warm water','With milk','Dissolve in water','As directed','Avoid in pregnancy','Avoid alcohol'];
const EMPTY_MED = { name:'', strength:'', dose:'1 tablet', frequency:'Once daily', duration:'7 days', instructions:'After meals' };

// Popular drugs shown when field is focused but empty
const POPULAR = ['Paracetamol','Amoxicillin','Azithromycin','Pantoprazole','Metformin','Amlodipine','Cetirizine','Ibuprofen','Atorvastatin','Omeprazole'];

// ── Highlight matched text ─────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background:'#fef08a', borderRadius:2, fontWeight:700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Drug search autocomplete ──────────────────────────────────────────
function MedAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (m: Medicine) => void;
}) {
  const [results, setResults]   = useState<Medicine[]>([]);
  const [popular, setPopular]   = useState<Medicine[]>([]);
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  // Load popular drugs once
  useEffect(() => {
    const p = POPULAR.map(n => searchMedicines(n)[0]).filter(Boolean) as Medicine[];
    setPopular(p);
  }, []);

  // Update search results whenever value changes
  useEffect(() => {
    if (value.trim().length === 0) {
      setResults([]);
    } else {
      setResults(searchMedicines(value));
    }
    setFocused(0);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${focused}"]`) as HTMLElement;
    if (el) el.scrollIntoView({ block:'nearest' });
  }, [focused]);

  const displayed = value.trim().length === 0 ? popular : results;
  const isPopular = value.trim().length === 0;

  function pick(m: Medicine) {
    onSelect(m);
    onChange(m.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open || displayed.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, displayed.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && displayed[focused]) { e.preventDefault(); pick(displayed[focused]); }
    if (e.key === 'Escape')    { setOpen(false); }
    if (e.key === 'Tab' && displayed[focused]) { pick(displayed[focused]); }
  }

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <input
        ref={inputRef}
        className="input"
        placeholder="Type drug name or brand… (e.g. Amox, Pan, Cetirizine)"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
        spellCheck={false}
        style={{ paddingRight: value ? 32 : undefined }}
      />
      {/* Clear button */}
      {value && (
        <button type="button"
          onClick={() => { onChange(''); setOpen(true); inputRef.current?.focus(); }}
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, lineHeight:1, padding:2 }}
        >✕</button>
      )}

      {/* Dropdown */}
      {open && (
        <div ref={listRef} style={{
          position:'absolute', top:'calc(100% + 3px)', left:0, right:0,
          background:'#fff', border:'1px solid #d1d5db',
          borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          zIndex:300, maxHeight:300, overflowY:'auto',
          animation:'fadeIn 0.08s ease',
        }}>
          {/* Section header */}
          <div style={{ padding:'6px 12px 4px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #f3f4f6', background:'#fafafa', borderRadius:'10px 10px 0 0' }}>
            {isPopular ? '⭐ Common drugs — or type to search' : `${displayed.length} result${displayed.length !== 1 ? 's' : ''} for "${value}"`}
          </div>

          {displayed.length === 0 && value.length > 0 ? (
            <div style={{ padding:'16px 12px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
              No drugs found for "<strong>{value}</strong>"<br/>
              <span style={{ fontSize:11 }}>You can still type the name manually.</span>
            </div>
          ) : (
            displayed.map((m, i) => (
              <div key={m.name}
                data-idx={i}
                onMouseDown={e => { e.preventDefault(); pick(m); }}
                onMouseEnter={() => setFocused(i)}
                style={{
                  padding:'9px 12px', cursor:'pointer',
                  background: i === focused ? '#f0fdf4' : '#fff',
                  borderBottom: i < displayed.length - 1 ? '1px solid #f3f4f6' : 'none',
                  transition:'background 0.08s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontWeight:600, fontSize:13, color: i === focused ? '#0d9488' : '#111827' }}>
                      <Highlight text={m.name} query={isPopular ? '' : value} />
                    </span>
                    <span style={{ fontSize:10, background: i===focused?'#d1fae5':'#f3f4f6', color: i===focused?'#065f46':'#6b7280', padding:'1px 7px', borderRadius:20, fontWeight:600, border: i===focused?'1px solid #a7f3d0':'1px solid #e5e7eb' }}>{m.category}</span>
                  </div>
                  <span style={{ fontSize:10, color:'#9ca3af', flexShrink:0 }}>{m.strengths[0]}</span>
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                  {m.generics.slice(0, 4).map((g, gi) => (
                    <span key={g}>
                      {gi > 0 && <span style={{ margin:'0 3px', color:'#d1d5db' }}>·</span>}
                      <Highlight text={g} query={isPopular ? '' : value} />
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}


// ── Medicine row ──────────────────────────────────────────────────────
function MedRow({ med, index, onUpdate, onDelete, canDelete }: {
  med: typeof EMPTY_MED; index: number;
  onUpdate: (k: string, v: string) => void;
  onDelete: () => void; canDelete: boolean;
}) {
  const drugInfo = findMedicineByName(med.name);

  function handleSelect(m: Medicine) {
    onUpdate('name', m.name);
    if (m.strengths.length > 0) onUpdate('strength', m.strengths[0]);
    onUpdate('dose', m.defaultDose);
  }

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10
    }}>
      {/* Row header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          Drug {index + 1}
        </span>
        {canDelete && (
          <button type="button" onClick={onDelete} style={{
            background:'none', border:'none', cursor:'pointer', color:'var(--danger)',
            fontSize:13, padding:'2px 6px', borderRadius:4
          }}>✕ Remove</button>
        )}
      </div>

      {/* Name + Strength + Dose */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10 }}>
        <div className="form-group">
          <label className="form-label">Medicine Name *</label>
          <MedAutocomplete
            value={med.name}
            onChange={v => onUpdate('name', v)}
            onSelect={handleSelect}
          />
          {drugInfo && (
            <div style={{ fontSize:10, color:'var(--primary)', marginTop:2 }}>
              ✓ {drugInfo.category} · Brands: {drugInfo.generics.slice(0,3).join(', ')}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Strength</label>
          {drugInfo && drugInfo.strengths.length > 1 ? (
            <select className="input" value={med.strength} onChange={e => onUpdate('strength', e.target.value)}>
              <option value="">— select —</option>
              {drugInfo.strengths.map(s => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <input className="input" placeholder="e.g. 500mg" value={med.strength} onChange={e => onUpdate('strength', e.target.value)} />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Dose</label>
          <input className="input" placeholder="1 tablet" value={med.dose} onChange={e => onUpdate('dose', e.target.value)} />
        </div>
      </div>

      {/* Frequency + Duration + Instructions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select className="input" value={med.frequency} onChange={e => onUpdate('frequency', e.target.value)}>
            {FREQ.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <select className="input" value={med.duration} onChange={e => onUpdate('duration', e.target.value)}>
            {DUR.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Instructions</label>
          <select className="input" value={med.instructions||''} onChange={e => onUpdate('instructions', e.target.value)}>
            <option value="">— select —</option>
            {INST.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function PrescriptionPage({ onNavigate, data }: { onNavigate:(p:string,d?:any)=>void; data?:any }) {
  const { user } = useAuthStore();
  const [patients, setPatients]     = useState<any[]>([]);
  const [patientId, setPatientId]   = useState(data?.patientId || '');
  const [patientSearch, setPatSearch] = useState('');
  const [patientWeight, setWeight]  = useState('');
  const [advice, setAdvice]         = useState('');
  const [followUp, setFollowUp]     = useState('');
  const [meds, setMeds]             = useState([{ ...EMPTY_MED }]);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState<any>(null);
  const [error, setError]           = useState('');

  const setMed = (i:number, k:string, v:string) => setMeds(ms => ms.map((m,j) => j===i ? {...m,[k]:v} : m));
  const addMed = () => setMeds(ms => [...ms, {...EMPTY_MED}]);
  const delMed = (i:number) => setMeds(ms => ms.filter((_,j) => j!==i));

  useEffect(() => {
    (async () => {
      try { const r = await apiClient.get('/patients',{params:{limit:500}}); setPatients(r.data.patients); }
      catch { setPatients(await db.patients.toArray()); }
    })();
  }, []);

  const filteredPatients = patientSearch
    ? patients.filter(p => p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || p.uhid?.includes(patientSearch) || p.phone?.includes(patientSearch))
    : patients;

  const selectedPatient = patients.find(p => p.id === patientId);

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient'); return; }
    if (meds.some(m => !m.name.trim())) { setError('All medicines need a name'); return; }
    setSaving(true); setError('');
    const now = new Date().toISOString();
    const id  = uuid();
    const slipToken = uuid().replace(/-/g,'').slice(0,12).toUpperCase();
    const payload: any = {
      id, hospital_id: user?.hospitalId||'hsp-001',
      patient_id: patientId, doctor_id: user?.id,
      medicines: meds.map(m => ({...m, name:m.name.trim()})),
      advice: advice||null, follow_up_date: followUp||null,
      patient_weight: patientWeight||null, slip_token: slipToken,
      created_by_role: user?.role||'doctor', created_at: now,
    };
    try {
      const res = await apiClient.post('/prescriptions', payload);
      setSuccess(res.data);
    } catch {
      await markPending(db.prescriptions, payload, 'create');
      await db.prescriptions.put(payload);
      setSuccess(payload);
    } finally { setSaving(false); }
  }

  function printSlip() {
    if (!success) return;
    const patient = patients.find((p: any) => p.id === patientId);
    printPrescriptionSlip({
      doctor:  { name: user?.name ?? 'Doctor', role: user?.role ?? '' },
      patient: { name: patient?.name ?? '—', uhid: patient?.uhid ?? '—', age: patient?.age, sex: patient?.sex, blood_group: patient?.blood_group },
      medicines: success.medicines, advice, followUp,
      weight: patientWeight, slipToken: success.slip_token,
    });
  }

  // ── Success screen ──
  if (success) return (
    <div className="card" style={{maxWidth:520, margin:'40px auto'}}>
      <div className="card-body" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:40,textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #86efac',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>✓</div>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:'var(--text)'}}>Prescription Saved</div>
          <div style={{color:'var(--text-muted)',fontSize:13,marginTop:4}}>Token: <strong>{success.slip_token}</strong></div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          <button className="btn btn-primary" onClick={printSlip}>🖨 Print Slip</button>
          <button className="btn btn-secondary" onClick={() => onNavigate('patient_detail', { patientId, ts: Date.now() })}>View Patient</button>
          <button className="btn btn-ghost" onClick={() => { setSuccess(null); setMeds([{...EMPTY_MED}]); setAdvice(''); setFollowUp(''); setPatientId(patientId); }}>+ New Prescription</button>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
      <div className="page-header">
        <div>
          <div className="page-title">Write Prescription</div>
          <div className="page-sub">{meds.length} medicine{meds.length!==1?'s':''} added</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate('prescriptions')}>← Back</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner spinner-sm"/>Saving…</> : 'Save & Print'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Patient selection */}
      <div className="card">
        <div className="card-header"><div className="card-title">Patient</div></div>
        <div className="card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}} className="form-group">
            <label className="form-label">Search Patient *</label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div className="search-bar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input placeholder="Name, UHID or phone…" value={patientSearch} onChange={e=>setPatSearch(e.target.value)} />
              </div>
              <select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)} required>
                <option value="">— Select patient —</option>
                {filteredPatients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
              </select>
            </div>
            {selectedPatient && (
              <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
                <span className="badge badge-info">{selectedPatient.age}y {selectedPatient.sex}</span>
                {selectedPatient.blood_group && <span className="badge badge-neutral">{selectedPatient.blood_group}</span>}
                {(selectedPatient.allergies||[]).length > 0 && (
                  <span className="badge badge-danger">⚠ Allergic: {(selectedPatient.allergies||[]).join(', ')}</span>
                )}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Patient Weight</label>
            <input className="input" placeholder="e.g. 72 kg" value={patientWeight} onChange={e=>setWeight(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Medicines */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Medicines</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addMed}>+ Add Medicine</button>
        </div>
        <div className="card-body" style={{display:'flex',flexDirection:'column',gap:12}}>
          {meds.map((m, i) => (
            <MedRow key={i} med={m} index={i}
              onUpdate={(k,v) => setMed(i,k,v)}
              onDelete={() => delMed(i)}
              canDelete={meds.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Advice & Follow-up */}
      <div className="card">
        <div className="card-header"><div className="card-title">Instructions & Follow-up</div></div>
        <div className="card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}} className="form-group">
            <label className="form-label">Doctor's Advice</label>
            <textarea className="input" rows={3} style={{resize:'vertical'}} placeholder="Dietary advice, rest, precautions…" value={advice} onChange={e=>setAdvice(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Date</label>
            <input className="input" type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingBottom:16}}>
        <button type="button" className="btn btn-ghost" onClick={() => onNavigate('patients')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><div className="spinner spinner-sm"/>Saving…</> : 'Save Prescription'}
        </button>
      </div>
    </form>
  );
}
