import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BEDS, PATIENTS, DOCTORS, Bed } from '../../data/mockData';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const TYPE_COLOR: Record<string, string> = {
  ICU: 'danger', Private: 'purple', 'Semi-Private': 'warning', General: 'neutral',
};

const WARDS = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'ICU', 'Pediatrics', 'Maternity', 'Emergency'];
const BED_TYPES = ['General', 'Private', 'Semi-Private', 'ICU'] as const;

function AddBedModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Bed) => void }) {
  const [form, setForm] = useState({
    bedNumber: '', ward: 'General', room: '', type: 'General' as Bed['type'],
    status: 'Available' as Bed['status'],
    patientId: '', doctorId: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bedNumber.trim() || !form.room.trim()) {
      setError('Bed number and room are required.');
      return;
    }
    if (BEDS.some(b => b.bedNumber === form.bedNumber.trim())) {
      setError(`Bed "${form.bedNumber}" already exists.`);
      return;
    }
    const patient = form.patientId ? PATIENTS.find(p => p.id === form.patientId) : undefined;
    const doctor = form.doctorId ? DOCTORS.find(d => d.id === form.doctorId) : undefined;
    const isOccupied = form.status === 'Occupied' && patient;

    const newBed: Bed = {
      id: `b${Date.now()}`,
      hospitalId: 'hsp-001',
      bedNumber: form.bedNumber.trim(),
      ward: form.ward,
      room: form.room.trim(),
      type: form.type,
      status: isOccupied ? 'Occupied' : form.status,
      ...(isOccupied && patient ? {
        patientId: patient.id,
        patientName: patient.name,
        patientPhoto: patient.photoURL,
        admittedAt: new Date().toISOString(),
      } : {}),
      ...(doctor ? { doctorId: doctor.id, doctorName: doctor.name } : {}),
    };
    onAdd(newBed);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🛏️ Add New Bed</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Bed Number *</label>
                <input className="input" placeholder="e.g. A-101" value={form.bedNumber} onChange={e => set('bedNumber', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Room *</label>
                <input className="input" placeholder="e.g. Room 101" value={form.room} onChange={e => set('room', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Ward</label>
                <select className="select-input" value={form.ward} onChange={e => set('ward', e.target.value)}>
                  {WARDS.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="select-input" value={form.type} onChange={e => set('type', e.target.value)}>
                  {BED_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['Available', 'Occupied', 'Maintenance'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => set('status', s)}
                      className={`btn ${form.status === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {form.status === 'Occupied' && (
                <>
                  <div>
                    <label className="form-label">Assign Patient</label>
                    <select className="select-input" value={form.patientId} onChange={e => set('patientId', e.target.value)}>
                      <option value="">— Select patient —</option>
                      {PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Assign Doctor</label>
                    <select className="select-input" value={form.doctorId} onChange={e => set('doctorId', e.target.value)}>
                      <option value="">— Select doctor —</option>
                      {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Add Bed</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBeds({ onNavigate }: Props) {
  const [filter, setFilter] = useState<'all' | 'Occupied' | 'Available' | 'Maintenance'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [, forceRender] = useState(0);

  const handleAdd = (b: Bed) => {
    BEDS.push(b);
    setShowAdd(false);
    forceRender(n => n + 1);
  };

  const filtered = filter === 'all' ? BEDS : BEDS.filter((b) => b.status === filter);

  const stats = {
    occupied: BEDS.filter(b => b.status === 'Occupied').length,
    available: BEDS.filter(b => b.status === 'Available').length,
    maintenance: BEDS.filter(b => b.status === 'Maintenance').length,
  };

  return (
    <div className="page-scroll">
      {showAdd && <AddBedModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      <div className="page-header">
        <div>
          <div className="page-title">Beds &amp; Wards</div>
          <div className="page-subtitle">{BEDS.length} total beds in system</div>
        </div>
        <button className="btn btn-primary" id="add-bed-btn" onClick={() => setShowAdd(true)}>
          + Add Bed
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Occupied', count: stats.occupied, color: 'var(--info)', bg: 'var(--info-bg)' },
          { label: 'Available', count: stats.available, color: 'var(--success)', bg: 'var(--success-bg)' },
          { label: 'Maintenance', count: stats.maintenance, color: 'var(--warning)', bg: 'var(--warning-bg)' },
        ].map((s) => (
          <div key={s.label} style={{
            padding: '12px 20px', borderRadius: 'var(--radius)', background: s.bg,
            border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-tabs" style={{ width: 'fit-content' }}>
        {(['all', 'Occupied', 'Available', 'Maintenance'] as const).map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '🛏️ All' : f}
          </button>
        ))}
      </div>

      {/* Beds Grid or Empty */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 56 }}>
            <span className="empty-state-icon">🛏️</span>
            <h3>{filter === 'all' ? 'No beds added yet' : `No ${filter.toLowerCase()} beds`}</h3>
            <p>{filter === 'all' ? 'Click "+ Add Bed" to add your first bed.' : 'Try a different filter.'}</p>
          </div>
        </div>
      ) : (
        <div className="bed-grid">
          {filtered.map((bed) => (
            <div
              key={bed.id}
              className={`bed-card ${bed.status.toLowerCase()}`}
              onClick={() => bed.patientId && onNavigate('admin-patient-detail', { patientId: bed.patientId })}
              style={{ cursor: bed.patientId ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{bed.bedNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bed.ward} · {bed.room}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Badge label={bed.type} variant={(TYPE_COLOR[bed.type] ?? 'neutral') as any} />
                  <Badge label={bed.status} variant={getStatusVariant(bed.status) as any} />
                </div>
              </div>

              {bed.status === 'Occupied' && bed.patientName ? (
                <div style={{
                  background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  border: '1px solid var(--primary-mid)',
                }}>
                  <Avatar uri={bed.patientPhoto} name={bed.patientName} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bed.patientName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Dr: {bed.doctorName}</div>
                  </div>
                </div>
              ) : bed.status === 'Available' ? (
                <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
                  ✅ Available for admission
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--warning)', fontSize: 13, fontWeight: 600 }}>
                  🔧 Under maintenance
                </div>
              )}

              {bed.status === 'Occupied' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); onNavigate('admin-vitals', { bedId: bed.id }); }}
                  >
                    💊 Enter Vitals
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
