// client/src/pages/PrescriptionsListPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { printPrescriptionSlip } from '../utils/printTemplates';

interface Rx {
  id: string; patient_name: string; uhid: string; doctor_name: string;
  medicines: any[]; advice: string; follow_up_date: string;
  slip_token: string; created_at: string;
}

export default function PrescriptionsListPage({ onNavigate }: { onNavigate: (p: string, d?: any) => void }) {
  const [rxList, setRxList]   = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [prePrinted, setPrePrinted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/prescriptions?limit=100');
      setRxList(res.data ?? []);
    } catch { setRxList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = rxList.filter(rx => {
    const q = search.toLowerCase();
    return !q || rx.patient_name?.toLowerCase().includes(q) || rx.uhid?.toLowerCase().includes(q) || rx.doctor_name?.toLowerCase().includes(q);
  });

  function printSlip(rx: Rx) {
    const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
    printPrescriptionSlip({
      doctor: {
        name: rx.doctor_name,
        role: (rx as any).doctor_role || 'Doctor',
        letterhead: (rx as any).doctor_letterhead || undefined
      },
      patient: {
        name: rx.patient_name,
        uhid: rx.uhid,
        age: (rx as any).age,
        sex: (rx as any).sex,
        blood_group: (rx as any).blood_group
      },
      medicines: meds.map(m => ({
        name: m.name,
        strength: m.strength || '',
        dose: m.dose || m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || (m.duration_days ? `${m.duration_days} days` : ''),
        instructions: m.instructions || ''
      })),
      advice: rx.advice,
      followUp: rx.follow_up_date,
      weight: (rx as any).weight,
      slipToken: rx.slip_token,
      prePrinted
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">💊 Prescriptions</div>
          <div className="page-sub">{visible.length} prescription{visible.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new_prescription')}>+ Write Prescription</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Search patient, UHID, doctor…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={prePrinted} onChange={e => setPrePrinted(e.target.checked)} />
            Print on pre-printed letterhead paper
          </label>
        </div>
      </div>

      <div className="card">
        {loading
          ? <div className="loading-screen" style={{ height: 200 }}><div className="spinner" /></div>
          : visible.length === 0
            ? <div className="empty-state"><span className="empty-icon">💊</span><p>No prescriptions found</p></div>
            : <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Slip #</th><th>Patient</th><th>Doctor</th><th>Medicines</th><th>Follow-up</th><th>Date</th><th></th></tr>
                  </thead>
                  <tbody>
                    {visible.map(rx => {
                      const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
                      return (
                        <tr key={rx.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('patient_detail', { patientId: rx.id })}>
                          <td><code style={{ fontSize: 11, background: 'var(--surface-alt)', padding: '2px 6px', borderRadius: 4 }}>{rx.slip_token}</code></td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{rx.patient_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rx.uhid}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{rx.doctor_name}</td>
                          <td style={{ fontSize: 12 }}>
                            {meds.slice(0, 2).map((m: any) => m.name).join(', ')}{meds.length > 2 ? ` +${meds.length - 2}` : ''}
                          </td>
                          <td style={{ fontSize: 12 }}>{rx.follow_up_date || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(rx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={ev => { ev.stopPropagation(); printSlip(rx); }}>
                              🖨 Print
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
        }
      </div>
    </>
  );
}
