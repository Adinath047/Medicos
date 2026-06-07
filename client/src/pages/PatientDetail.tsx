// client/src/pages/PatientDetail.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { db } from '../db/localDB';
import { useAuthStore } from '../store/authStore';

export default function PatientDetail({ onNavigate, data }: { onNavigate:(p:string,d?:any)=>void; data?:any }) {
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';
  const isReceptionist = user?.role === 'receptionist';

  const patientId = data?.patientId;
  const openedAt  = data?.ts ?? 0;   // timestamp passed by navigate() forces re-fetch
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(isDoctor ? 'Prescriptions' : 'Overview');

  const [uploads, setUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadsError, setUploadsError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Tabs differ by role
  const TABS = isDoctor
    ? ['Prescriptions', 'Encounters', 'Vitals', 'Overview', 'Documents']
    : isReceptionist
    ? ['Overview', 'Appointments', 'Documents']
    : ['Overview', 'Encounters', 'Vitals', 'Prescriptions', 'Appointments', 'Documents'];

  useEffect(() => {
    if (!patientId) return;
    setSummary(null);
    setLoading(true);
    (async () => {
      try {
        const res = await apiClient.get(`/patients/${patientId}/summary`);
        setSummary(res.data);
      } catch {
        const patient    = await db.patients.get(patientId);
        const encounters = await db.encounters.where('patient_id').equals(patientId).reverse().limit(20).toArray();
        const vitals     = await db.vitals.where('patient_id').equals(patientId).reverse().limit(1).toArray();
        const rxList     = await db.prescriptions.where('patient_id').equals(patientId).reverse().limit(30).toArray();
        const appts      = await db.appointments.where('patient_id').equals(patientId).reverse().limit(10).toArray();
        setSummary({ patient, encounters, latestVitals: vitals[0]||null, rxCount: rxList.length, prescriptions: rxList, apptUpcoming: appts });
      } finally { setLoading(false); }
    })();
  }, [patientId, openedAt]);

  useEffect(() => {
    if (tab === 'Documents' && patientId) {
      setLoadingUploads(true);
      setUploadsError('');
      apiClient.get(`/patient-uploads/${patientId}`)
        .then(res => setUploads(res.data))
        .catch(err => setUploadsError('Failed to load documents.'))
        .finally(() => setLoadingUploads(false));
    }
  }, [tab, patientId]);

  if (!patientId) return <div className="empty-state"><span className="empty-icon">👤</span><h3>No patient selected</h3></div>;
  if (loading)   return <div className="loading-screen" style={{height:'60vh'}}><div className="spinner"/></div>;
  if (!summary?.patient) return <div className="empty-state"><span className="empty-icon">❌</span><h3>Patient not found</h3></div>;

  const { patient: p, encounters = [], latestVitals: vit, rxCount, prescriptions = [], apptUpcoming = [] } = summary;
  const allergies  = Array.isArray(p.allergies)          ? p.allergies          : JSON.parse(p.allergies||'[]');
  const conditions = Array.isArray(p.chronic_conditions) ? p.chronic_conditions : JSON.parse(p.chronic_conditions||'[]');

  return (
    <>
      <button className="btn btn-ghost btn-sm no-print" style={{alignSelf:'flex-start',marginBottom:4}} onClick={()=>onNavigate('patients')}>
        ← Back to Patients
      </button>

      {/* ── Patient header card ── */}
      <div className="card">
        <div style={{padding:'16px 20px',display:'flex',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
          {/* Avatar */}
          <div style={{width:52,height:52,borderRadius:14,background:'var(--primary-grad)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,flexShrink:0}}>
            {p.name?.charAt(0)}
          </div>

          {/* Info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:20,fontWeight:900,color:'var(--text)'}}>{p.name}</div>
            <div style={{fontSize:12,color:'var(--primary)',fontWeight:700,marginTop:2}}>{p.uhid}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8,alignItems:'center'}}>
              {p.blood_group && <span className="tag">{p.blood_group}</span>}
              <span className="tag">{p.age||'?'} yrs · {p.sex}</span>
              {p.phone && <span style={{fontSize:12,color:'var(--text-muted)'}}>📞 {p.phone}</span>}
              {allergies.map((a:string)=>(
                <span key={a} style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:600}}>⚠ {a}</span>
              ))}
              {conditions.map((c:string)=>(
                <span key={c} style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',fontWeight:600}}>{c}</span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap',alignItems:'flex-start'}}>
            {isDoctor && (
              <>
                <button className="btn btn-primary btn-sm" onClick={()=>onNavigate('new_prescription',{patientId:p.id,patient:p})}>
                  + Prescription
                </button>
                <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate('new_encounter',{patientId:p.id,patient:p})}>
                  + Encounter
                </button>
              </>
            )}
            {(isDoctor || user?.role === 'nurse' || user?.role === 'lab_technician') && (
              <button className="btn btn-ghost btn-sm" onClick={()=>onNavigate('new_vitals',{patientId:p.id})}>
                + Vitals
              </button>
            )}
            {isReceptionist && (
              <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate('appointments', { showAdd: true, prefillPatient: p.id, reason: 'Consultation' })}>
                Book Appointment
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={()=>onNavigate('appointments', { showAdd: true, prefillPatient: p.id, reason: 'Follow-up' })}>
              ↺ Schedule Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* ── Latest vitals strip (doctor only) ── */}
      {isDoctor && vit && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:10}}>
          {[
            { label:'BP',     value: vit.bp_systolic ? `${vit.bp_systolic}/${vit.bp_diastolic}` : '—', unit:'mmHg' },
            { label:'HR',     value: vit.heart_rate  ?? '—', unit:'bpm' },
            { label:'SpO₂',  value: vit.spo2        ?? '—', unit:'%' },
            { label:'Temp',   value: vit.temperature ?? '—', unit: vit.temperature_unit||'F' },
            { label:'Weight', value: vit.weight      ?? '—', unit: vit.weight_unit||'kg' },
            { label:'BMI',    value: vit.bmi         ?? '—', unit:'' },
          ].map(v=>(
            <div key={v.label} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:'var(--primary)'}}>{v.value}</div>
              {v.unit && <div style={{fontSize:10,color:'var(--text-muted)'}}>{v.unit}</div>}
              <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginTop:2}}>{v.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{overflowX:'auto'}}>
        <div className="tabs" style={{width:'max-content'}}>
          {TABS.map(t=><button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</button>)}
        </div>
      </div>

      {/* ── Tab: Prescriptions ── */}
      {tab === 'Prescriptions' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Prescriptions</div>
            {isDoctor && <button className="btn btn-primary btn-sm" onClick={()=>onNavigate('new_prescription',{patientId:p.id,patient:p})}>+ Write Prescription</button>}
          </div>
          {prescriptions.length === 0
            ? <div className="empty-state"><span className="empty-icon">💊</span><h3>No prescriptions yet</h3><p>Click "+ Write Prescription" to create one.</p></div>
            : <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {prescriptions.map((rx:any)=>{
                  const meds = Array.isArray(rx.medicines) ? rx.medicines : JSON.parse(rx.medicines||'[]');
                  return (
                    <div key={rx.id} style={{padding:'14px 18px',borderBottom:'1px solid var(--border-light)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:6}}>
                            {meds.slice(0,4).map((m:any,i:number)=>(
                              <span key={i} style={{fontSize:12,padding:'2px 10px',borderRadius:20,background:'#f0fdf4',color:'#065f46',border:'1px solid #a7f3d0',fontWeight:600}}>
                                {m.name} {m.strength}
                              </span>
                            ))}
                            {meds.length > 4 && <span style={{fontSize:12,color:'var(--text-muted)'}}>+{meds.length-4} more</span>}
                          </div>
                          {rx.advice && <div style={{fontSize:12,color:'var(--text-muted)'}}>Advice: {rx.advice}</div>}
                          {rx.follow_up_date && <div style={{fontSize:12,color:'var(--primary)',marginTop:2}}>Follow-up: {new Date(rx.follow_up_date).toLocaleDateString('en-IN')}</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(rx.created_at).toLocaleDateString('en-IN')}</div>
                          {rx.slip_token && <div style={{fontSize:10,color:'var(--text-light)',marginTop:2}}>#{rx.slip_token}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── Tab: Encounters ── */}
      {tab === 'Encounters' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Encounters ({encounters.length})</div>
            {isDoctor && <button className="btn btn-primary btn-sm" onClick={()=>onNavigate('new_encounter',{patientId:p.id,patient:p})}>+ New</button>}
          </div>
          {encounters.length === 0
            ? <div className="empty-state"><span className="empty-icon">📋</span><h3>No encounters yet</h3></div>
            : <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {encounters.map((enc:any)=>(
                  <div key={enc.id} style={{padding:'14px 18px',borderBottom:'1px solid var(--border-light)',display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:36,height:36,borderRadius:10,background:'var(--primary-light)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>
                      {enc.token_number||'—'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{enc.chief_complaint||'General visit'}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                        {enc.encounter_type} · {enc.doctor_name||user?.name} · {new Date(enc.created_at).toLocaleDateString('en-IN')}
                      </div>
                      {enc.diagnosis && (Array.isArray(enc.diagnosis)?enc.diagnosis:JSON.parse(enc.diagnosis||'[]')).slice(0,2).map((d:any,i:number)=>(
                        <span key={i} className="tag" style={{marginRight:4,marginTop:4}}>{d.name}</span>
                      ))}
                      <div style={{marginTop: 6}}>
                        <button className="btn btn-ghost btn-sm" style={{fontSize: 11, padding: '2px 6px', minHeight: 24}} onClick={()=>onNavigate('appointments', { showAdd: true, prefillPatient: p.id, prefillDoctor: enc.doctor_id, reason: 'Follow-up to ' + (enc.chief_complaint || 'Encounter') })}>
                          ↺ Book Follow-up
                        </button>
                      </div>
                    </div>
                    <span className={`badge ${enc.status==='Completed'?'badge-success':enc.status==='Active'?'badge-info':'badge-neutral'}`}>{enc.status}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Tab: Vitals ── */}
      {tab === 'Vitals' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Vitals</div>
            {(isDoctor || user?.role === 'nurse' || user?.role === 'lab_technician') && <button className="btn btn-primary btn-sm" onClick={()=>onNavigate('new_vitals',{patientId:p.id})}>+ Record</button>}
          </div>
          {!vit
            ? <div className="empty-state"><span className="empty-icon">📊</span><h3>No vitals recorded</h3></div>
            : <div className="card-body">
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:12}}>Last recorded: {new Date(vit.recorded_at).toLocaleString('en-IN')}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
                  {[
                    { label:'Blood Pressure', value: vit.bp_systolic ? `${vit.bp_systolic}/${vit.bp_diastolic}` : '—', unit:'mmHg' },
                    { label:'Heart Rate',     value: vit.heart_rate  ?? '—', unit:'bpm' },
                    { label:'SpO₂',           value: vit.spo2        ?? '—', unit:'%' },
                    { label:'Temperature',    value: vit.temperature ?? '—', unit: vit.temperature_unit||'F' },
                    { label:'Weight',         value: vit.weight      ?? '—', unit: vit.weight_unit||'kg' },
                    { label:'Height',         value: vit.height      ?? '—', unit: vit.height_unit||'cm' },
                    { label:'BMI',            value: vit.bmi         ?? '—', unit:'' },
                    { label:'Blood Sugar',    value: vit.blood_sugar ?? '—', unit:'mg/dL' },
                    { label:'Resp. Rate',     value: vit.respiratory_rate ?? '—', unit:'bpm' },
                    { label:'Pain Score',     value: vit.pain_score  ?? '—', unit:'/10' },
                  ].map(v=>(
                    <div key={v.label} style={{background:'var(--surface-alt)',borderRadius:'var(--radius)',padding:'12px',textAlign:'center',border:'1px solid var(--border)'}}>
                      <div style={{fontSize:20,fontWeight:700,color:'var(--primary)'}}>{v.value}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)'}}>{v.unit}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginTop:4}}>{v.label}</div>
                    </div>
                  ))}
                </div>
                {vit.notes && <div style={{marginTop:12,padding:'10px 12px',background:'var(--surface-alt)',borderRadius:'var(--radius)',fontSize:12,color:'var(--text-muted)'}}>Notes: {vit.notes}</div>}
              </div>
          }
        </div>
      )}

      {/* ── Tab: Appointments ── */}
      {tab === 'Appointments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Appointments</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate('appointments')}>+ Book</button>
          </div>
          {apptUpcoming.length === 0
            ? <div className="empty-state"><span className="empty-icon">📅</span><h3>No appointments</h3></div>
            : <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {apptUpcoming.map((a:any)=>(
                  <div key={a.id} style={{padding:'12px 18px',borderBottom:'1px solid var(--border-light)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{a.date} · {a.time}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{a.reason||'General'} · Dr. {a.doctor_name||'—'}</div>
                    </div>
                    <span className={`badge ${a.status==='Completed'?'badge-success':a.status==='Scheduled'?'badge-info':'badge-neutral'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Tab: Overview ── */}
      {tab === 'Overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Patient Details */}
          <div className="card">
            <div className="card-header"><div className="card-title">Patient Details</div></div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                ['Date of Birth', p.dob ? new Date(p.dob).toLocaleDateString('en-IN') : `~${p.age} yrs`],
                ['Gender', p.sex],
                ['Blood Group', p.blood_group||'Not recorded'],
                ['Phone', p.phone||'—'],
                ['Email', p.email||'—'],
                ['Address', p.address||'—'],
                ['Insurance', p.insurance_provider ? `${p.insurance_provider} · ${p.insurance_number}` : '—'],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'7px 0',borderBottom:'1px solid var(--border-light)',gap:12}}>
                  <span style={{color:'var(--text-muted)',fontSize:12,flexShrink:0}}>{l}</span>
                  <span style={{fontWeight:600,fontSize:12,textAlign:'right'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Summary */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card">
              <div className="card-header"><div className="card-title">Clinical Summary</div></div>
              <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  ['Encounters', encounters.length],
                  ['Prescriptions', rxCount],
                  ['Appointments', apptUpcoming.length],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border-light)'}}>
                    <span style={{color:'var(--text-muted)',fontSize:13}}>{l}</span>
                    <span style={{fontWeight:800,fontSize:18,color:'var(--primary)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Emergency Contact</div></div>
              <div className="card-body">
                {p.ec_name
                  ? <>
                      <div style={{fontWeight:700,fontSize:14}}>{p.ec_name}</div>
                      <div style={{color:'var(--text-muted)',fontSize:12,marginTop:2}}>{p.ec_relation}</div>
                      <div style={{marginTop:8}}><a href={`tel:${p.ec_phone}`} className="btn btn-secondary btn-sm">📞 {p.ec_phone}</a></div>
                    </>
                  : <div style={{color:'var(--text-muted)',fontSize:13}}>No emergency contact recorded</div>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Documents ── */}
      {tab === 'Documents' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Patient Documents & History</div>
          </div>
          <div className="card-body">
            {loadingUploads ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : uploadsError ? (
              <div className="alert alert-danger">{uploadsError}</div>
            ) : uploads.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📁</span>
                <h3>No documents uploaded</h3>
                <p>Saved prescriptions and other patient records will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {uploads.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="card"
                    style={{
                      margin: 0,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => setPreviewDoc(doc)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 24 }}>
                          {doc.file_type?.includes('pdf') ? '📄' : '🖼️'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                      {doc.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 32 }}>
                          {doc.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal" style={{ maxWidth: 800, width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{previewDoc.title}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {previewDoc.file_url.startsWith('data:application/pdf') && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const printWindow = window.open();
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head><title>${previewDoc.title}</title></head>
                            <body style="margin:0;">
                              <embed width="100%" height="100%" src="${previewDoc.file_url}" type="application/pdf" />
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.focus();
                          printWindow.print();
                        }, 500);
                      }
                    }}
                  >
                    🖨 Print
                  </button>
                )}
                <button className="modal-close" onClick={() => setPreviewDoc(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {previewDoc.file_url.startsWith('data:application/pdf') ? (
                <iframe
                  title="Document Preview"
                  src={previewDoc.file_url}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              ) : previewDoc.file_url.startsWith('data:image') ? (
                <img
                  src={previewDoc.file_url}
                  alt={previewDoc.title}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <p>Preview not supported for this file type.</p>
                  <a href={previewDoc.file_url} download={previewDoc.title} className="btn btn-primary">Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
