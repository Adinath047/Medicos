// client/src/pages/PrescriptionPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';
import { printPrescriptionSlip } from '../utils/printTemplates';
import { searchMedicines, findMedicineByName, MEDICINES, type Medicine } from '../utils/medicines';

// ── Allergy cross-check ───────────────────────────────────────────────
/**
 * Returns the matched allergy term if the drug (name + generics) conflicts
 * with any of the patient's known allergies, otherwise null.
 * Matching is case-insensitive and uses substring detection so
 * "Penicillin" allergy catches "Amoxicillin" (a penicillin antibiotic).
 */
function checkAllergyConflict(medName: string, allergies: string[]): string | null {
  if (!medName.trim() || allergies.length === 0) return null;

  // Gather all search terms: the drug name itself + all its brand/generic names
  const drug = MEDICINES.find(m =>
    m.name.toLowerCase() === medName.toLowerCase() ||
    m.generics.some(g => g.toLowerCase() === medName.toLowerCase())
  );
  const terms = drug
    ? [drug.name, ...drug.generics, drug.category]
    : [medName];

  const termsLower = terms.map(t => t.toLowerCase());

  for (const allergy of allergies) {
    const a = allergy.toLowerCase().trim();
    if (!a) continue;
    // Check if any drug term contains the allergy keyword OR allergy keyword contains a drug term
    for (const t of termsLower) {
      if (t.includes(a) || a.includes(t.split(' ')[0])) {
        return allergy; // return original casing
      }
    }
  }
  return null;
}

const FREQ = ['Once daily','Twice daily','Thrice daily','Every 8h','Every 6h','At bedtime','Before meals','After meals','As needed','Weekly'];
const DUR  = ['1 day','3 days','5 days','7 days','10 days','14 days','1 month','2 months','3 months','Ongoing'];
const INST = ['After meals','Before meals','With meals','Empty stomach','At bedtime','In the morning','With warm water','With milk','Dissolve in water','As directed','Avoid in pregnancy','Avoid alcohol'];
const EMPTY_MED = { name:'', strength:'', dose:'1 tablet', frequency:'Once daily', duration:'7 days', instructions:'After meals' };

// ── Tablet quantity calculator ─────────────────────────────────────────
/** How many times per day is a given frequency? */
function freqPerDay(freq: string): number | null {
  const f = freq.toLowerCase();
  if (f.includes('once') || f === 'at bedtime' || f.includes('morning')) return 1;
  if (f.includes('twice'))  return 2;
  if (f.includes('thrice') || f.includes('three')) return 3;
  if (f.includes('every 8h'))  return 3;
  if (f.includes('every 6h'))  return 4;
  if (f.includes('weekly'))    return 1 / 7;
  if (f.includes('as needed')) return null; // can't compute
  if (f.includes('before meals') || f.includes('after meals') || f.includes('with meals')) return 3; // assume 3 meals
  return null;
}

/** How many days does a duration string represent? */
function durationDays(dur: string): number | null {
  const d = dur.toLowerCase();
  if (d === 'ongoing') return null;
  const monthMatch = d.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1]) * 30;
  const dayMatch = d.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1]);
  return null;
}

/** How many units per dose (e.g. "1 tablet" → 1, "1½" → 1.5, "2 tablets" → 2) */
function doseUnits(dose: string): number | null {
  const d = dose.toLowerCase();
  // fractions like 1½, ½
  const frac = d.replace('½', '.5').replace('¼', '.25').replace('¾', '.75');
  const match = frac.match(/([\d.]+)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return isNaN(n) || n <= 0 ? null : n;
}

/** Returns a display string for total tablets/units, or null if not computable */
function calcTotalQty(dose: string, freq: string, dur: string): { qty: number; label: string } | null {
  const units = doseUnits(dose);
  const fpd   = freqPerDay(freq);
  const days  = durationDays(dur);
  if (units === null || fpd === null || days === null) return null;
  const qty = Math.ceil(units * fpd * days);
  // Detect unit type from dose string
  const d = dose.toLowerCase();
  const unit = d.includes('capsule') ? 'capsule' : d.includes('ml') ? 'ml' : d.includes('drop') ? 'drops' : 'tablet';
  const plural = qty !== 1 ? `${unit}s` : unit;
  return { qty, label: `${qty} ${plural}` };
}

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
function MedRow({ med, index, onUpdate, onDelete, canDelete, patientAllergies }: {
  med: typeof EMPTY_MED; index: number;
  onUpdate: (k: string, v: string) => void;
  onDelete: () => void; canDelete: boolean;
  patientAllergies: string[];
}) {
  const drugInfo = findMedicineByName(med.name);
  const allergyMatch = checkAllergyConflict(med.name, patientAllergies);

  function handleSelect(m: Medicine) {
    onUpdate('name', m.name);
    if (m.strengths.length > 0) onUpdate('strength', m.strengths[0]);
    onUpdate('dose', m.defaultDose);
  }

  return (
    <div style={{
      background: allergyMatch ? '#fff5f5' : 'var(--surface)',
      border: `1px solid ${allergyMatch ? '#fca5a5' : 'var(--border)'}`,
      borderRadius:'var(--radius-lg)', padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
      transition:'border-color 0.2s, background 0.2s',
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
          {allergyMatch && (
            <div style={{
              marginTop:6, padding:'8px 12px',
              background:'#fee2e2', border:'1px solid #fca5a5',
              borderRadius:8, display:'flex', alignItems:'flex-start', gap:8,
            }}>
              <span style={{ fontSize:16, lineHeight:1, flexShrink:0 }}>⚠️</span>
              <div>
                <div style={{ fontWeight:700, fontSize:12, color:'#991b1b' }}>
                  Allergy Conflict Detected
                </div>
                <div style={{ fontSize:11, color:'#7f1d1d', marginTop:2 }}>
                  Patient is allergic to <strong>{allergyMatch}</strong>.
                  This drug may cause an adverse reaction. Verify before prescribing.
                </div>
              </div>
            </div>
          )}
          {!allergyMatch && drugInfo && (
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

      {/* Total quantity calculation */}
      {(() => {
        const result = calcTotalQty(med.dose, med.frequency, med.duration);
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 12px', borderRadius: 8,
            background: result ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${result ? '#86efac' : '#e2e8f0'}`,
          }}>
            <span style={{ fontSize: 13 }}>🧮</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total quantity to dispense:
            </span>
            {result ? (
              <strong style={{ fontSize: 13, color: '#15803d', fontFamily: 'monospace' }}>
                {result.label}
              </strong>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                — (set dose, frequency &amp; duration to auto-calculate)
              </span>
            )}
            {result && (
              <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>
                {med.dose} × {freqPerDay(med.frequency)}×/day × {durationDays(med.duration)} days
              </span>
            )}
          </div>
        );
      })()}
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
  const [allergyOverride, setAllergyOverride] = useState(false);

  const setMed = (i:number, k:string, v:string) => {
    setMeds(ms => ms.map((m,j) => j===i ? {...m,[k]:v} : m));
    setAllergyOverride(false); // reset override when medicines change
  };
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

  // Parse allergies — stored as JSON string or already as array
  const patientAllergies: string[] = useMemo(() => {
    if (!selectedPatient) return [];
    const raw = selectedPatient.allergies;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    try { return JSON.parse(raw).filter(Boolean); } catch { return []; }
  }, [selectedPatient]);

  // Compute which medicine rows have allergy conflicts
  const allergyConflicts = useMemo(() =>
    meds.map(m => checkAllergyConflict(m.name, patientAllergies)),
  [meds, patientAllergies]);
  const hasAllergyConflict = allergyConflicts.some(Boolean);

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient'); return; }
    if (meds.some(m => !m.name.trim())) { setError('All medicines need a name'); return; }

    // ── Allergy guard ─────────────────────────────────────────────────
    if (hasAllergyConflict && !allergyOverride) {
      const conflictNames = allergyConflicts
        .map((c, i) => c ? `${meds[i].name} (allergic to ${c})` : null)
        .filter(Boolean)
        .join(', ');
      const confirmed = window.confirm(
        `⚠️ ALLERGY CONFLICT\n\n` +
        `The following medicines may conflict with the patient's known allergies:\n` +
        `${conflictNames}\n\n` +
        `Do you want to override and save anyway?\n` +
        `(Only do this if you have clinically evaluated the risk.)`
      );
      if (!confirmed) return;
      setAllergyOverride(true);
    }
    // ─────────────────────────────────────────────────────────────────

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
      allergy_override: hasAllergyConflict && allergyOverride, // log the override
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

      {/* Allergy conflict banner — shown when any medicine conflicts */}
      {hasAllergyConflict && (
        <div style={{
          padding:'12px 16px', borderRadius:10,
          background:'#fef2f2', border:'2px solid #f87171',
          display:'flex', alignItems:'flex-start', gap:12,
        }}>
          <span style={{ fontSize:20, flexShrink:0, lineHeight:1, marginTop:1 }}>🚨</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#991b1b', marginBottom:2 }}>
              Allergy Warning — Review Required
            </div>
            <div style={{ fontSize:12, color:'#7f1d1d', lineHeight:1.5 }}>
              {allergyConflicts.map((conflict, i) => conflict && (
                <span key={i} style={{ display:'block' }}>
                  • <strong>{meds[i].name || `Drug ${i+1}`}</strong> conflicts with known allergy: <strong>{conflict}</strong>
                </span>
              ))}
            </div>
            <div style={{ fontSize:11, color:'#6b7280', marginTop:6 }}>
              You will be asked to confirm before saving. Check the individual drug rows below for details.
            </div>
          </div>
        </div>
      )}

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
              patientAllergies={patientAllergies}
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
