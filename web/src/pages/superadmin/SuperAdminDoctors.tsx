import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import {
  DOCTORS, DOCTOR_VERIFICATIONS, HOSPITALS, type DoctorVerification,
} from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

export default function SuperAdminDoctors({ onNavigate }: Props) {
  const [verifications, setVerifications] = useState<DoctorVerification[]>(DOCTOR_VERIFICATIONS);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleApprove = (id: string) => {
    setVerifications(prev => prev.map(v =>
      v.id === id ? { ...v, status: 'Approved', reviewedAt: new Date().toISOString(), reviewedBy: 'Vikram Anand' } : v
    ));
    const idx = DOCTOR_VERIFICATIONS.findIndex(v => v.id === id);
    if (idx !== -1) {
      DOCTOR_VERIFICATIONS[idx].status = 'Approved';
      DOCTOR_VERIFICATIONS[idx].reviewedAt = new Date().toISOString();
    }
    // Mark doctor as verified
    const dv = DOCTOR_VERIFICATIONS.find(v => v.id === id);
    if (dv) {
      const doc = DOCTORS.find(d => d.id === dv.doctorId);
      if (doc) { doc.nmcVerified = true; doc.status = 'Active'; }
    }
    showToast('✅ Doctor NMC verified and approved!');
  };

  const handleReject = () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setVerifications(prev => prev.map(v =>
      v.id === rejectModal.id
        ? { ...v, status: 'Rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString(), reviewedBy: 'Vikram Anand' }
        : v
    ));
    const idx = DOCTOR_VERIFICATIONS.findIndex(v => v.id === rejectModal.id);
    if (idx !== -1) {
      DOCTOR_VERIFICATIONS[idx].status = 'Rejected';
      DOCTOR_VERIFICATIONS[idx].rejectionReason = rejectReason;
    }
    showToast('❌ Verification rejected. Doctor will be notified.');
    setRejectModal(null);
    setRejectReason('');
  };

  const filtered = verifications.filter(v => {
    const matchTab    = tab === 'all' || v.status === 'Pending';
    const matchSearch = !search || v.doctorName.toLowerCase().includes(search.toLowerCase()) || v.nmcNumber.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const pending = verifications.filter(v => v.status === 'Pending').length;

  return (
    <div className="page-scroll">
      {toast && <div className="alert alert-success" style={{ marginBottom: 8 }}>{toast}</div>}

      <div className="page-header">
        <div>
          <div className="page-title">Doctor Verification</div>
          <div className="page-subtitle">NMC / SMC registration review queue</div>
        </div>
        {pending > 0 && <span className="badge badge-danger pulse" style={{ fontSize: 13, padding: '6px 14px' }}>{pending} pending</span>}
      </div>

      {/* Tabs + Search */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="filter-tabs">
              <button className={`filter-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
                ⏳ Pending ({pending})
              </button>
              <button className={`filter-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
                📋 All Reviews
              </button>
            </div>
            <input
              className="input" style={{ flex: 1 }}
              placeholder="🔍 Search by doctor name or NMC number…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Verification Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 48 }}>
              <span className="empty-state-icon">{tab === 'pending' ? '✅' : '🔍'}</span>
              <h3>{tab === 'pending' ? 'No pending verifications!' : 'No results found'}</h3>
              <p>{tab === 'pending' ? 'All NMC submissions have been reviewed.' : 'Try adjusting your search.'}</p>
            </div>
          </div>
        ) : filtered.map(v => {
          const doctor = DOCTORS.find(d => d.id === v.doctorId);
          return (
            <div key={v.id} className="card" style={{
              border: v.status === 'Pending' ? '1.5px solid #fbbf24'
                : v.status === 'Approved' ? '1.5px solid #6ee7b7'
                : '1.5px solid #fca5a5',
            }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <Avatar uri={doctor?.photoURL} name={v.doctorName} size={52} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{v.doctorName}</div>
                      <Badge
                        label={v.status}
                        variant={v.status === 'Pending' ? 'warning' : v.status === 'Approved' ? 'success' : 'danger'}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 20px' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>NMC Number</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{v.nmcNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Qualifications</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{v.qualifications}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hospital</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{v.hospitalName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Submitted</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{formatDate(v.submittedAt)}</div>
                      </div>
                      {doctor && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Specialization</div>
                          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{doctor.specialization}</div>
                        </div>
                      )}
                      {v.reviewedAt && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reviewed</div>
                          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{formatDate(v.reviewedAt)} by {v.reviewedBy}</div>
                        </div>
                      )}
                    </div>
                    {v.rejectionReason && (
                      <div className="alert alert-danger" style={{ marginTop: 10, fontSize: 12 }}>
                        <strong>Rejection Reason:</strong> {v.rejectionReason}
                      </div>
                    )}
                    {doctor?.achievements && doctor.achievements.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Achievements</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {doctor.achievements.map((a, i) => (
                            <li key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {v.status === 'Pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApprove(v.id)}
                      >✓ Approve</button>
                      <button
                        className="btn btn-secondary"
                        style={{ borderColor: '#fca5a5', color: '#ef4444' }}
                        onClick={() => setRejectModal({ id: v.id, name: v.doctorName })}
                      >✕ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Doctors list */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🩺 All Registered Doctors</div>
          <span className="badge badge-info">{DOCTORS.length} doctors</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>NMC Number</th>
                <th>Specialization</th>
                <th>Hospital</th>
                <th>NMC Status</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {DOCTORS.map(d => {
                const hospital = HOSPITALS.find(h => h.id === d.hospitalId);
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar uri={d.photoURL} name={d.name} size={34} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.qualifications}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 11 }}>{d.nmcNumber}</code></td>
                    <td>{d.specialization}</td>
                    <td style={{ fontSize: 12 }}>{hospital?.name ?? d.hospitalId}</td>
                    <td>
                      {d.nmcVerified
                        ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Verified</span>
                        : <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ Pending</span>}
                    </td>
                    <td><Badge label={d.status} variant={d.status === 'Active' ? 'success' : d.status === 'Inactive' ? 'danger' : 'warning'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Reject Verification</div>
              <button className="modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                You are rejecting <strong>{rejectModal.name}</strong>'s NMC verification. They will be notified.
              </div>
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="input" rows={4}
                  placeholder="e.g. NMC number not found in registry, documents are incomplete…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn btn-primary" style={{ background: '#ef4444' }}
                onClick={handleReject} disabled={!rejectReason.trim()}
              >Reject Verification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
