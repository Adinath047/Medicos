import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import {
  PRESCRIPTIONS, PATIENTS, DOCTORS,
  Prescription, Medicine, DoctorLetterhead, LETTERHEADS,
} from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'Every 6 hours', 'At night', 'Before meals', 'After meals', 'As needed'];
const DURATIONS   = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing'];
const HEADER_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#d97706', '#0369a1', '#15803d', '#9333ea'];
const EMPTY_MED: Medicine = { name: '', strength: '', dose: '1 tablet', frequency: 'Once daily', duration: '7 days' };

// ─── Print Prescription ───────────────────────────────────────────────────────
function printPrescription(rx: Prescription, letterhead?: DoctorLetterhead) {
  const patient = PATIENTS.find(p => p.id === rx.patientId);
  const doctor  = DOCTORS.find(d => d.id === rx.doctorId);
  const lh = letterhead;
  const accent = lh?.headerColor ?? '#1d4ed8';
  const today  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Prescription – ${patient?.name ?? 'Patient'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; }

  /* ── Letterhead top strip ── */
  .lh-strip { background: ${accent}; height: 6px; width: 100%; }

  /* ── Header ── */
  .lh-header {
    padding: 20px 28px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 2px solid ${accent};
    gap: 16px;
  }
  .lh-left { display: flex; align-items: center; gap: 14px; }
  .lh-logo {
    width: 60px; height: 60px;
    background: ${accent};
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 22px; font-weight: 800;
    flex-shrink: 0;
    font-family: 'Libre Baskerville', serif;
  }
  .lh-doc-name {
    font-size: 22px; font-weight: 800; color: ${accent};
    font-family: 'Libre Baskerville', serif;
    letter-spacing: -0.3px; line-height: 1.1;
  }
  .lh-qualif { font-size: 11.5px; color: #444; font-weight: 600; margin-top: 3px; }
  .lh-tagline { font-size: 11px; color: #666; margin-top: 2px; font-style: italic; }
  .lh-reg    { font-size: 10px; color: #888; margin-top: 4px; }

  .lh-contact { text-align: right; font-size: 11px; color: #444; line-height: 1.8; }
  .lh-contact strong { color: ${accent}; font-weight: 700; }
  .lh-clinic-name { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }

  /* ── Patient bar ── */
  .patient-bar {
    margin: 14px 28px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid ${accent};
    border-radius: 6px;
    padding: 10px 16px;
    display: flex; gap: 24px; align-items: center; flex-wrap: wrap;
  }
  .pf { display: flex; flex-direction: column; gap: 2px; }
  .pf-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 700; }
  .pf-value { font-size: 13px; font-weight: 700; color: #1a1a1a; }
  .date-stamp { margin-left: auto; font-size: 12px; color: #555; }

  /* ── Rx Body ── */
  .rx-body { padding: 20px 28px; }
  .rx-symbol {
    font-family: 'Libre Baskerville', serif;
    font-size: 36px; font-style: italic; color: ${accent};
    line-height: 1; margin-bottom: 14px; font-weight: 700;
  }
  .rx-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 8px; }

  /* Medicines */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: #fff;
    background: ${accent}; padding: 8px 12px; text-align: left;
  }
  tbody tr { border-bottom: 1px solid #e8ecf0; }
  tbody tr:nth-child(even) { background: #f8faff; }
  tbody td { padding: 10px 12px; font-size: 12.5px; color: #1a1a1a; vertical-align: middle; }
  .med-name { font-weight: 700; }
  .med-strength { color: #555; font-size: 11.5px; }

  /* Advice */
  .advice-box {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-left: 4px solid #f59e0b;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 12.5px;
    line-height: 1.6;
    color: #444;
    margin-bottom: 28px;
  }
  .advice-box .advice-label { font-weight: 700; color: #b45309; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Signature / Footer */
  .footer-row {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-top: 1px dashed #ccc; padding-top: 14px; margin-top: 20px;
  }
  .next-visit { font-size: 11px; color: #555; }
  .sig-block { text-align: right; }
  .sig-line { border-bottom: 1px solid #1a1a1a; width: 160px; margin-bottom: 4px; }
  .sig-label { font-size: 10px; color: #555; }

  .footer-note {
    text-align: center; font-size: 10px; color: #999;
    border-top: 1px solid #e2e8f0; padding: 8px 28px;
    font-style: italic;
  }

  .lh-strip-bottom { background: ${accent}; height: 4px; width: 100%; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="lh-strip"></div>

  <div class="lh-header">
    <div class="lh-left">
      <div class="lh-logo">${lh?.logoInitials ?? doctor?.name?.charAt(0) ?? 'D'}</div>
      <div>
        <div class="lh-doc-name">${doctor?.name ?? rx.doctorName}</div>
        <div class="lh-qualif">${lh?.qualifications ?? doctor?.specialization ?? ''}</div>
        <div class="lh-tagline">${lh?.tagline ?? ''}</div>
        <div class="lh-reg">Reg. No: ${lh?.regNumber ?? doctor?.nmcNumber ?? '—'}</div>
      </div>
    </div>
    <div class="lh-contact">
      ${lh?.clinicName ? `<div class="lh-clinic-name">${lh.clinicName}</div>` : ''}
      ${lh?.address  ? `<div>${lh.address.replace(/\n/g, '<br/>')}</div>` : ''}
      ${lh?.phone    ? `<div><strong>📞</strong> ${lh.phone}</div>` : `<div>📞 ${doctor?.phone ?? ''}</div>`}
      ${lh?.email    ? `<div><strong>✉</strong> ${lh.email}</div>` : ''}
      ${lh?.timings  ? `<div><strong>⏱</strong> ${lh.timings}</div>` : ''}
    </div>
  </div>

  <div class="patient-bar">
    <div class="pf"><div class="pf-label">Patient</div><div class="pf-value">${patient?.name ?? '—'}</div></div>
    <div class="pf"><div class="pf-label">Age</div><div class="pf-value">${patient?.age ?? '—'} yrs</div></div>
    <div class="pf"><div class="pf-label">Sex</div><div class="pf-value">${patient?.sex ?? '—'}</div></div>
    <div class="pf"><div class="pf-label">Weight</div><div class="pf-value">${rx.patientWeight ?? '—'}</div></div>
    <div class="pf"><div class="pf-label">Blood Group</div><div class="pf-value">${patient?.bloodGroup ?? '—'}</div></div>
    <div class="date-stamp">Date: <strong>${today}</strong></div>
  </div>

  <div class="rx-body">
    <div class="rx-symbol">℞</div>

    <div class="rx-label">Prescribed Medicines</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Medicine</th><th>Strength</th><th>Dose</th><th>Frequency</th><th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${rx.medicines.map((m, i) => `
          <tr>
            <td style="color:#888;font-size:11px">${i + 1}</td>
            <td><span class="med-name">${m.name}</span></td>
            <td><span class="med-strength">${m.strength}</span></td>
            <td>${m.dose}</td>
            <td>${m.frequency}</td>
            <td>${m.duration}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${rx.advice ? `
    <div class="advice-box">
      <div class="advice-label">📋 Instructions / Advice</div>
      ${rx.advice}
    </div>` : ''}

    <div class="footer-row">
      <div class="next-visit">Next visit: ______________________________</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${doctor?.name ?? rx.doctorName}<br/>${lh?.qualifications ?? doctor?.specialization ?? ''}</div>
      </div>
    </div>
  </div>

  <div class="footer-note">${lh?.footerNote ?? 'This prescription is computer generated and valid only with the doctor\'s signature.'}</div>
  <div class="lh-strip-bottom"></div>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Setup Letterhead Modal ───────────────────────────────────────────────────
function SetupLetterheadModal({
  doctorId, existing, onClose, onSave,
}: {
  doctorId: string;
  existing?: DoctorLetterhead;
  onClose: () => void;
  onSave: (lh: DoctorLetterhead) => void;
}) {
  const doctor = DOCTORS.find(d => d.id === doctorId);
  const [form, setForm] = useState<DoctorLetterhead>(existing ?? {
    doctorId,
    clinicName:     '',
    qualifications: doctor?.specialization ?? '',
    tagline:        '',
    regNumber:      doctor?.nmcNumber ?? '',
    address:        '',
    phone:          doctor?.phone ?? '',
    email:          doctor?.email ?? '',
    timings:        'Mon–Sat: 9 AM – 1 PM, 5 PM – 8 PM',
    headerColor:    '#1d4ed8',
    logoInitials:   doctor?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'DR',
    footerNote:     "This prescription is computer generated and valid only with the doctor's signature.",
  });

  const set = (k: keyof DoctorLetterhead, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🎨 Prescription Letterhead — {doctor?.name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Live preview strip */}
          <div style={{
            border: `2px solid ${form.headerColor}`,
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            marginBottom: 4,
          }}>
            <div style={{ height: 5, background: form.headerColor }} />
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: form.headerColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0,
                }}>{form.logoInitials || 'DR'}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: form.headerColor }}>{doctor?.name}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{form.qualifications}</div>
                  <div style={{ fontSize: 10, color: '#777', fontStyle: 'italic' }}>{form.tagline}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#555', lineHeight: 1.7 }}>
                {form.clinicName && <div style={{ fontWeight: 700, fontSize: 12 }}>{form.clinicName}</div>}
                {form.phone && <div>📞 {form.phone}</div>}
                {form.timings && <div>⏱ {form.timings}</div>}
              </div>
            </div>
            <div style={{ height: 3, background: form.headerColor }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>↑ Live preview</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinic / Hospital Name</label>
              <input className="input" placeholder="e.g. City Heart Clinic" value={form.clinicName} onChange={e => set('clinicName', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Qualifications</label>
              <input className="input" placeholder="e.g. MBBS, MD (Cardiology)" value={form.qualifications} onChange={e => set('qualifications', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Tagline / Speciality Line</label>
              <input className="input" placeholder="e.g. Specialist in Heart Diseases" value={form.tagline} onChange={e => set('tagline', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Registration Number</label>
              <input className="input" placeholder="e.g. MED-2018-4521" value={form.regNumber} onChange={e => set('regNumber', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Logo Initials (1–2 letters)</label>
              <input className="input" maxLength={2} placeholder="e.g. PS" value={form.logoInitials} onChange={e => set('logoInitials', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="dr@clinic.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Consultation Timings</label>
              <input className="input" placeholder="e.g. Mon–Sat: 9 AM – 1 PM, 5 PM – 8 PM" value={form.timings} onChange={e => set('timings', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinic Address</label>
              <textarea className="input" rows={2} style={{ resize: 'vertical' }}
                placeholder="Full address..." value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Footer Note</label>
              <input className="input" value={form.footerNote} onChange={e => set('footerNote', e.target.value)} />
            </div>

            {/* Colour picker */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ marginBottom: 8 }}>Header Accent Colour</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HEADER_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => set('headerColor', c)}
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: c, border: form.headerColor === c ? '3px solid #1a1a1a' : '3px solid transparent',
                      cursor: 'pointer', outline: form.headerColor === c ? '2px solid #fff' : 'none',
                      outlineOffset: -4,
                      transition: 'transform 0.15s',
                      transform: form.headerColor === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
                <input type="color" value={form.headerColor}
                  onChange={e => set('headerColor', e.target.value)}
                  title="Custom colour"
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 2 }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>✓ Save Letterhead</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Prescription Modal ───────────────────────────────────────────────────
function AddPrescriptionModal({
  onClose, onAdd,
}: { onClose: () => void; onAdd: (rx: Prescription) => void }) {
  const [patientId, setPatientId]   = useState('');
  const [doctorId, setDoctorId]     = useState('');
  const [patientWeight, setWeight]  = useState('');
  const [advice, setAdvice]         = useState('');
  const [meds, setMeds]             = useState<Medicine[]>([{ ...EMPTY_MED }]);
  const [error, setError]           = useState('');

  const setMed = (i: number, k: keyof Medicine, v: string) =>
    setMeds(ms => ms.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const addMed    = () => setMeds(ms => [...ms, { ...EMPTY_MED }]);
  const removeMed = (i: number) => setMeds(ms => ms.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient.'); return; }
    if (!doctorId)  { setError('Please select a prescribing doctor.'); return; }
    if (meds.some(m => !m.name.trim())) {
      setError('All medicine rows must have a name. Remove empty rows or fill them in.');
      return;
    }
    const doctor = DOCTORS.find(d => d.id === doctorId)!;
    const newRx: Prescription = {
      id: `rx${Date.now()}`,
      hospitalId: 'hsp-001',
      patientId, doctorId,
      doctorName:    doctor.name,
      visitId:       '',
      medicines:     meds.map(m => ({ ...m, name: m.name.trim() })),
      advice:        advice.trim(),
      patientWeight: patientWeight.trim() || undefined,
      createdByRole: 'Admin',
      createdAt:     new Date().toISOString(),
      hasFile:       false,
    };
    onAdd(newRx);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">💉 New Prescription</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 14 }}>
              <div>
                <label className="form-label">Patient *</label>
                <select className="select-input" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">— Select patient —</option>
                  {PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Prescribing Doctor *</label>
                <select className="select-input" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  <option value="">— Select doctor —</option>
                  {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Weight</label>
                <input className="input" placeholder="e.g. 72 kg" value={patientWeight} onChange={e => setWeight(e.target.value)} />
              </div>
            </div>

            {/* Medicines */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="section-label">Medicines</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMed}>+ Add Medicine</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {meds.map((m, i) => (
                  <div key={i} style={{
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '12px 14px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label className="form-label">Medicine Name *</label>
                        <input className="input" placeholder="e.g. Aspirin" value={m.name} onChange={e => setMed(i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Strength</label>
                        <input className="input" placeholder="e.g. 75mg" value={m.strength} onChange={e => setMed(i, 'strength', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Dose</label>
                        <input className="input" placeholder="e.g. 1 tablet" value={m.dose} onChange={e => setMed(i, 'dose', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                      <div>
                        <label className="form-label">Frequency</label>
                        <select className="select-input" value={m.frequency} onChange={e => setMed(i, 'frequency', e.target.value)}>
                          {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Duration</label>
                        <select className="select-input" value={m.duration} onChange={e => setMed(i, 'duration', e.target.value)}>
                          {DURATIONS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <button type="button" className="btn btn-danger btn-sm"
                        disabled={meds.length === 1} onClick={() => removeMed(i)} style={{ alignSelf: 'flex-end' }}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Doctor's Advice / Notes</label>
              <textarea className="input" rows={3} style={{ resize: 'vertical' }}
                placeholder="e.g. Avoid spicy food. Rest for 3 days. Follow up in a week."
                value={advice} onChange={e => setAdvice(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Save Prescription</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPrescriptions({ onNavigate }: Props) {
  const [showAdd, setShowAdd]             = useState(false);
  const [letterheadFor, setLetterheadFor] = useState<string | null>(null);
  const [, forceRender]                   = useState(0);
  const [search, setSearch]               = useState('');

  const handleAdd = (rx: Prescription) => {
    PRESCRIPTIONS.push(rx);
    setShowAdd(false);
    forceRender(n => n + 1);
  };

  const handleSaveLetterhead = (lh: DoctorLetterhead) => {
    LETTERHEADS[lh.doctorId] = lh;
    setLetterheadFor(null);
    forceRender(n => n + 1);
  };

  const filtered = PRESCRIPTIONS.filter(rx => {
    const patient = PATIENTS.find(p => p.id === rx.patientId);
    return !search ||
      patient?.name.toLowerCase().includes(search.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="page-scroll">
      {showAdd && <AddPrescriptionModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {letterheadFor && (
        <SetupLetterheadModal
          doctorId={letterheadFor}
          existing={LETTERHEADS[letterheadFor]}
          onClose={() => setLetterheadFor(null)}
          onSave={handleSaveLetterhead}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Prescriptions</div>
          <div className="page-subtitle">{PRESCRIPTIONS.length} prescriptions on record</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Letterhead setup per-doctor */}
          {DOCTORS.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                className="select-input"
                style={{ paddingRight: 32 }}
                value=""
                onChange={e => { if (e.target.value) setLetterheadFor(e.target.value); }}
              >
                <option value="">🎨 Setup Letterhead…</option>
                {DOCTORS.map(d => (
                  <option key={d.id} value={d.id}>
                    {LETTERHEADS[d.id] ? '✓ ' : ''}{d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-primary" id="add-prescription-btn" onClick={() => setShowAdd(true)}>
            + New Prescription
          </button>
        </div>
      </div>

      {/* Doctors with letterhead info */}
      {DOCTORS.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {DOCTORS.map(d => (
            <button
              key={d.id}
              className="btn btn-secondary btn-sm"
              onClick={() => setLetterheadFor(d.id)}
              style={{ gap: 6 }}
            >
              {LETTERHEADS[d.id]
                ? <span style={{ color: 'var(--success)' }}>✓</span>
                : <span style={{ color: 'var(--warning)' }}>○</span>
              }
              {d.name} letterhead
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 15 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by patient or doctor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="badge badge-info">{filtered.length} results</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">💉</span>
            <h3>{search ? 'No matching prescriptions' : 'No prescriptions yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Click "+ New Prescription" to create the first one.'}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((rx) => {
            const patient     = PATIENTS.find(p => p.id === rx.patientId);
            const lh          = LETTERHEADS[rx.doctorId];
            const hasLH       = !!lh;
            const accentColor = lh?.headerColor ?? '#2563eb';

            return (
              <div key={rx.id} className="card" style={{ borderTop: `3px solid ${accentColor}` }}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar uri={patient?.photoURL} name={patient?.name ?? '?'} size={38} />
                    <div>
                      <div className="card-title">
                        {patient?.name ?? 'Unknown Patient'}
                        {rx.patientWeight && (
                          <span className="badge badge-neutral" style={{ marginLeft: 8 }}>
                            ⚖ {rx.patientWeight}
                          </span>
                        )}
                        <span style={{ marginLeft: 8 }}>
                          <Badge label={rx.createdByRole} variant="info" />
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        By {rx.doctorName} · {formatDate(rx.createdAt)}
                        {hasLH && (
                          <span style={{ marginLeft: 8, color: accentColor, fontWeight: 600, fontSize: 11 }}>
                            · {lh.clinicName || 'Letterhead set'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      title={hasLH ? 'Print with letterhead' : 'Print (no letterhead set — use Setup above)'}
                      onClick={() => printPrescription(rx, lh)}
                    >
                      🖨️ Print
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onNavigate('admin-patient-detail', { patientId: rx.patientId })}
                    >
                      View Patient →
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-wrap">
                    <table style={{ marginBottom: rx.advice ? 14 : 0 }}>
                      <thead>
                        <tr>
                          {['Medicine', 'Strength', 'Dose', 'Frequency', 'Duration'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rx.medicines.map((m, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td>{m.strength}</td>
                            <td>{m.dose}</td>
                            <td>{m.frequency}</td>
                            <td>{m.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rx.advice && (
                    <div className="alert alert-info" style={{ marginTop: 8 }}>
                      📝 {rx.advice}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
