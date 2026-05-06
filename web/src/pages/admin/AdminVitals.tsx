import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BEDS, VITALS } from '../../data/mockData';
import { formatDate, timeAgo, minutesSince } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color, getTempColor } from '../../utils/colors';

interface Props { initialBedId?: string; onNavigate: (page: string, data?: unknown) => void; }

export default function AdminVitals({ initialBedId, onNavigate }: Props) {
  const occupiedBeds = BEDS.filter((b) => b.status === 'Occupied');
  const [selectedBedId, setSelectedBedId] = useState(initialBedId ?? occupiedBeds[0]?.id ?? '');
  const [saved, setSaved] = useState(false);

  const selectedBed = BEDS.find((b) => b.id === selectedBedId);
  const bedVitals = VITALS.filter((v) => v.bedId === selectedBedId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const lastVitals = bedVitals[0];

  // Form state (pre-filled from last vitals)
  const [form, setForm] = useState({
    bp_systolic: lastVitals?.bp_systolic ?? 120,
    bp_diastolic: lastVitals?.bp_diastolic ?? 80,
    heartRate: lastVitals?.heartRate ?? 72,
    respRate: lastVitals?.respRate ?? 16,
    temperature: lastVitals?.temperature ?? 37.0,
    spo2: lastVitals?.spo2 ?? 98,
    bloodSugar: lastVitals?.bloodSugar ?? 100,
    notes: '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, field, unit, min, max, step = 1, colorFn }: {
    label: string; field: keyof typeof form; unit: string;
    min: number; max: number; step?: number; colorFn?: (v: number) => string;
  }) => {
    const val = form[field] as number;
    const color = colorFn ? colorFn(val) : 'var(--primary)';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="form-label">{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number" min={min} max={max} step={step}
            className="input"
            value={val}
            onChange={(e) => {
              const n = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
              setForm((f) => ({ ...f, [field]: n }));
            }}
            style={{ borderColor: color }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 40 }}>{unit}</span>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">Vitals Entry</div>
          <div className="page-subtitle">Record patient vital signs</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, alignItems: 'start' }}>
        {/* Bed selector */}
        <div className="card">
          <div className="card-header"><div className="card-title">🛏️ Select Bed</div></div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {occupiedBeds.map((bed) => {
              const mins = VITALS.filter(v => v.bedId === bed.id).length > 0
                ? minutesSince(VITALS.filter(v => v.bedId === bed.id)
                    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]?.recordedAt)
                : 9999;
              const isOverdue = mins >= 30;
              return (
                <div
                  key={bed.id}
                  onClick={() => { setSelectedBedId(bed.id); setSaved(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: `1.5px solid ${bed.id === selectedBedId ? 'var(--primary)' : (isOverdue ? '#fecaca' : 'var(--border)')}`,
                    background: bed.id === selectedBedId ? 'var(--primary-light)' : (isOverdue ? 'var(--danger-bg)' : 'var(--surface)'),
                    transition: 'all var(--transition)',
                  }}
                >
                  <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{bed.bedNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bed.patientName}
                    </div>
                  </div>
                  {isOverdue && <span className="badge badge-danger">⚠️</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                {selectedBed ? `${selectedBed.bedNumber} – ${selectedBed.patientName}` : 'Select a bed'}
              </div>
              {lastVitals && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Last recorded: {timeAgo(lastVitals.recordedAt)}
                </div>
              )}
            </div>
          </div>
          <div className="card-body">
            {saved && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                ✅ Vitals saved successfully!
              </div>
            )}
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Systolic BP" field="bp_systolic" unit="mmHg" min={60} max={220} colorFn={getBPColor} />
              <Field label="Diastolic BP" field="bp_diastolic" unit="mmHg" min={40} max={140} />
              <Field label="Heart Rate" field="heartRate" unit="bpm" min={30} max={200} colorFn={getHRColor} />
              <Field label="Resp. Rate" field="respRate" unit="/min" min={8} max={40} />
              <Field label="Temperature" field="temperature" unit="°C" min={34} max={42} step={0.1} colorFn={getTempColor} />
              <Field label="SpO₂" field="spo2" unit="%" min={70} max={100} colorFn={getSPO2Color} />
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Blood Sugar" field="bloodSugar" unit="mg/dL" min={40} max={500} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Clinical notes…"
                />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => onNavigate('admin-dashboard')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg">
                  💾 Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* History */}
      {bedVitals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Vitals History – {selectedBed?.patientName}</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>BP</th>
                  <th>Heart Rate</th>
                  <th>SpO₂</th>
                  <th>Temp</th>
                  <th>Blood Sugar</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {bedVitals.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(v.recordedAt)}</td>
                    <td style={{ fontWeight: 700, color: getBPColor(v.bp_systolic) }}>{v.bp_systolic}/{v.bp_diastolic}</td>
                    <td style={{ color: getHRColor(v.heartRate) }}>{v.heartRate} bpm</td>
                    <td style={{ color: getSPO2Color(v.spo2) }}>{v.spo2}%</td>
                    <td style={{ color: getTempColor(v.temperature) }}>{v.temperature}°C</td>
                    <td>{v.bloodSugar} mg/dL</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
