import React, { useRef } from 'react';
import {
  PRESCRIPTIONS, PATIENTS, DOCTORS, HOSPITALS, LETTERHEADS,
  type Prescription, type Patient, type Doctor, type Hospital,
} from '../data/mockData';

interface Props {
  slipId?: string;
  prescriptionId?: string;
  onNavigate?: (page: string) => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Estimate validity from longest duration in prescription
function getValidUntil(prescription: Prescription): string {
  let maxDays = 7;
  prescription.medicines.forEach(m => {
    const match = m.duration.match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1]);
      const days = m.duration.toLowerCase().includes('week') ? n * 7 : n;
      if (days > maxDays) maxDays = days;
    }
  });
  return addDays(prescription.createdAt, maxDays);
}

export default function MedicationSlip({ slipId, prescriptionId, onNavigate }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  // Find prescription
  const prescription = prescriptionId
    ? PRESCRIPTIONS.find(p => p.id === prescriptionId)
    : slipId
      ? PRESCRIPTIONS.find(p => p.slipId === slipId)
      : PRESCRIPTIONS[PRESCRIPTIONS.length - 1];

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const text = prescription
      ? `Medication Slip for ${patient?.name ?? 'Patient'} from ${doctor?.name ?? 'Doctor'} at ${hospital?.name ?? 'Hospital'}. Valid until ${getValidUntil(prescription)}.`
      : 'Medication slip from Medicos';
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (!prescription) {
    return (
      <div className="page-scroll">
        <div className="empty-state" style={{ padding: 80 }}>
          <span className="empty-state-icon">💊</span>
          <h3>No prescription found</h3>
          <p>The medication slip you're looking for doesn't exist or has expired.</p>
          {onNavigate && (
            <button className="btn btn-primary" onClick={() => onNavigate('patient-prescriptions')}>
              My Prescriptions
            </button>
          )}
        </div>
      </div>
    );
  }

  const patient  : Patient  | undefined = PATIENTS.find(p => p.id === prescription.patientId);
  const doctor   : Doctor   | undefined = DOCTORS.find(d => d.id === prescription.doctorId);
  const hospital : Hospital | undefined = doctor ? HOSPITALS.find(h => h.id === doctor.hospitalId) : undefined;
  const letterhead = LETTERHEADS[prescription.doctorId];
  const validUntil = getValidUntil(prescription);
  const accentColor = letterhead?.headerColor ?? '#2563eb';

  return (
    <div className="page-scroll">
      {/* Action Bar (hidden in print) */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {onNavigate && (
          <button className="btn btn-secondary" onClick={() => onNavigate('patient-prescriptions')}>
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleWhatsApp} style={{ gap: 8 }}>
          <span>📱</span> Share on WhatsApp
        </button>
        <button className="btn btn-primary" onClick={handlePrint} style={{ gap: 8 }}>
          <span>🖨️</span> Print Slip
        </button>
      </div>

      {/* Medication Slip Card */}
      <div ref={printRef} style={{
        maxWidth: 760, margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 40px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        border: `1px solid ${accentColor}20`,
        fontFamily: 'Georgia, serif',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          padding: '24px 32px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div>
              {/* Hospital name */}
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'sans-serif' }}>
                {hospital?.name ?? letterhead?.clinicName ?? 'Medicos Hospital'}
              </div>
              {/* Doctor name */}
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
                {doctor?.name ?? prescription.doctorName}
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3 }}>
                {doctor?.qualifications ?? letterhead?.qualifications ?? ''}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                {doctor?.specialization}{doctor?.subSpecialization ? ` · ${doctor.subSpecialization}` : ''}
              </div>
              {doctor?.nmcNumber && (
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, fontFamily: 'monospace' }}>
                  NMC Reg: {doctor.nmcNumber} {doctor.nmcVerified ? '✓' : ''}
                </div>
              )}
            </div>

            {/* Logo / M badge */}
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, flexShrink: 0,
            }}>
              {letterhead?.logoInitials ?? 'M'}
            </div>
          </div>

          {/* Sub-header: address + contact */}
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', gap: 24, flexWrap: 'wrap',
            fontSize: 11, opacity: 0.85, fontFamily: 'sans-serif',
          }}>
            {hospital?.address && <span>📍 {hospital.address}, {hospital.city}</span>}
            {(doctor?.phone ?? hospital?.phone) && <span>📞 {doctor?.phone ?? hospital?.phone}</span>}
            {(doctor?.email ?? hospital?.email) && <span>✉️ {doctor?.email ?? hospital?.email}</span>}
          </div>
        </div>

        {/* ── Slip Meta Banner ── */}
        <div style={{
          background: '#f8fafc', borderBottom: `3px solid ${accentColor}`,
          padding: '10px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: accentColor, letterSpacing: 0.3, fontFamily: 'sans-serif' }}>
            💊 MEDICATION SLIP
          </div>
          <div style={{ fontFamily: 'sans-serif', display: 'flex', gap: 24, fontSize: 12 }}>
            <span><strong>Date:</strong> {formatDate(prescription.createdAt)}</span>
            {prescription.slipId && (
              <span><strong>Slip ID:</strong> <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{prescription.slipId}</code></span>
            )}
            <span style={{ color: '#ef4444', fontWeight: 700 }}>Valid until: {validUntil}</span>
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          {/* ── Patient Info ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12, marginBottom: 24,
            padding: 16, borderRadius: 10,
            background: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            {[
              { label: 'Patient Name', value: patient?.name ?? 'Unknown' },
              { label: 'Age / Sex',    value: patient ? `${patient.age} yrs · ${patient.sex}` : '—' },
              { label: 'Blood Group',  value: patient?.bloodGroup ?? '—' },
              { label: 'Weight',       value: prescription.patientWeight ?? patient?.weight ?? '—' },
            ].map(field => (
              <div key={field.label}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'sans-serif' }}>{field.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 3 }}>{field.value}</div>
              </div>
            ))}
          </div>

          {patient?.allergies && patient.allergies.length > 0 && (
            <div style={{
              background: '#fff1f2', border: '1.5px solid #fca5a5',
              borderRadius: 8, padding: '8px 14px',
              fontSize: 12, color: '#be123c', marginBottom: 20, fontFamily: 'sans-serif',
            }}>
              <strong>⚠️ Known Allergies:</strong> {patient.allergies.join(', ')}
            </div>
          )}

          {/* ── Medicines Table ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              color: '#64748b', marginBottom: 8, fontFamily: 'sans-serif',
            }}>Prescribed Medicines</div>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 13, fontFamily: 'sans-serif',
            }}>
              <thead>
                <tr style={{ background: accentColor, color: '#fff' }}>
                  {['#', 'Medicine', 'Strength', 'Dose', 'Frequency', 'Duration', 'Instructions'].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescription.medicines.map((med, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>{med.name}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{med.strength}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{med.dose}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{med.frequency}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{med.duration}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 11 }}>{med.instructions ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Advice ── */}
          {prescription.advice && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 24,
              background: '#f0fdf4', border: '1px solid #86efac', fontFamily: 'sans-serif',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                Doctor's Advice
              </div>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>{prescription.advice}</div>
            </div>
          )}

          {/* ── Follow-up ── */}
          {prescription.followUpDate && (
            <div style={{
              padding: '10px 16px', borderRadius: 8, marginBottom: 24,
              background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'sans-serif',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Follow-up Appointment</div>
                <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{formatDate(prescription.followUpDate)}</div>
              </div>
            </div>
          )}

          {/* ── QR Placeholder + Signature ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, fontFamily: 'sans-serif' }}>
            {/* QR Code placeholder */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, background: '#f1f5f9',
                border: '2px dashed #cbd5e1', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: '#94a3b8',
              }}>
                ▣
              </div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Scan to verify
              </div>
            </div>

            {/* Doctor signature area */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                borderTop: `2px solid ${accentColor}`,
                width: 200, paddingTop: 8, marginTop: 32,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{doctor?.name ?? prescription.doctorName}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{doctor?.qualifications ?? ''}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{doctor?.specialization ?? ''}</div>
                {doctor?.nmcNumber && (
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>NMC: {doctor.nmcNumber}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          background: '#f8fafc', borderTop: `3px solid ${accentColor}20`,
          padding: '12px 32px', fontFamily: 'sans-serif',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {letterhead?.footerNote ?? 'This prescription is valid only with the doctor\'s digital signature. · Powered by Medicos'}
          </div>
          <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: 'monospace' }}>
            medicos.app
          </div>
        </div>
      </div>

      {/* Bottom share actions */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={handleWhatsApp} style={{ gap: 8 }}>
          📱 Share via WhatsApp
        </button>
        <button className="btn btn-primary" onClick={handlePrint} style={{ gap: 8 }}>
          🖨️ Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
