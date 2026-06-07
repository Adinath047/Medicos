// client/src/pages/BedsPage.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Bed {
  id: string;
  bed_number: string;
  room: string;
  ward: string;
  type: string;
  status: 'Available' | 'Occupied';
  patient_id: string | null;
  patient_name: string | null;
  patient_uhid: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  admitted_at: string | null;
  vitals: any | null;
}

export default function BedsPage() {
  const { user } = useAuthStore();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering
  const [selectedWard, setSelectedWard] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Occupied'>('All');
  
  // Modals state
  const [allocateBed, setAllocateBed] = useState<Bed | null>(null);
  const [recordVitalsBed, setRecordVitalsBed] = useState<Bed | null>(null);
  
  // Allocation Form State
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [submittingAlloc, setSubmittingAlloc] = useState(false);
  
  // Vitals Form State
  const [vitalsForm, setVitalsForm] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    temperature: '',
    spo2: '',
    respiratory_rate: '',
    blood_sugar: '',
    blood_sugar_type: 'Random',
    notes: '',
  });
  const [submittingVitals, setSubmittingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState('');

  // Fetch beds on mount
  useEffect(() => {
    fetchBeds();
  }, []);

  // Fetch patients/doctors only when allocation modal opens
  useEffect(() => {
    if (allocateBed) {
      setPatientSearch('');
      setSelectedPatientId('');
      setSelectedDoctorId('');
      
      apiClient.get('/patients?limit=500')
        .then(res => setPatients(res.data.patients || []))
        .catch(() => {});
        
      apiClient.get('/users/doctors')
        .then(res => setDoctors(res.data || []))
        .catch(() => {});
    }
  }, [allocateBed]);

  // Load vitals form when vitals modal opens
  useEffect(() => {
    if (recordVitalsBed) {
      setVitalsForm({
        bp_systolic: recordVitalsBed.vitals?.bp_systolic || '',
        bp_diastolic: recordVitalsBed.vitals?.bp_diastolic || '',
        heart_rate: recordVitalsBed.vitals?.heart_rate || '',
        temperature: recordVitalsBed.vitals?.temperature || '',
        spo2: recordVitalsBed.vitals?.spo2 || '',
        respiratory_rate: recordVitalsBed.vitals?.respiratory_rate || '',
        blood_sugar: recordVitalsBed.vitals?.blood_sugar || '',
        blood_sugar_type: recordVitalsBed.vitals?.blood_sugar_type || 'Random',
        notes: '',
      });
      setVitalsError('');
    }
  }, [recordVitalsBed]);

  async function fetchBeds() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/beds');
      setBeds(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load beds.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Allocation Submit
  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocateBed) return;
    if (!selectedPatientId) {
      alert('Please select a patient.');
      return;
    }
    
    setSubmittingAlloc(true);
    try {
      await apiClient.put(`/beds/${allocateBed.id}/allocate`, {
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId || undefined,
      });
      setAllocateBed(null);
      await fetchBeds();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Allocation failed.');
    } finally {
      setSubmittingAlloc(false);
    }
  }

  // Handle Release Bed
  async function handleRelease(bedId: string) {
    if (!confirm('Are you sure you want to release / vacate this bed?')) return;
    try {
      await apiClient.put(`/beds/${bedId}/release`);
      await fetchBeds();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to release bed.');
    }
  }

  // Handle Vitals Submit
  async function handleSaveVitals(e: React.FormEvent) {
    e.preventDefault();
    if (!recordVitalsBed || !recordVitalsBed.patient_id) return;
    
    setSubmittingVitals(true);
    setVitalsError('');
    try {
      const payload: any = {
        patient_id: recordVitalsBed.patient_id,
        temperature_unit: 'F',
        weight_unit: 'kg',
        height_unit: 'cm',
      };
      
      // Parse values or send null
      if (vitalsForm.bp_systolic) payload.bp_systolic = parseInt(vitalsForm.bp_systolic);
      if (vitalsForm.bp_diastolic) payload.bp_diastolic = parseInt(vitalsForm.bp_diastolic);
      if (vitalsForm.heart_rate) payload.heart_rate = parseInt(vitalsForm.heart_rate);
      if (vitalsForm.temperature) payload.temperature = parseFloat(vitalsForm.temperature);
      if (vitalsForm.spo2) payload.spo2 = parseInt(vitalsForm.spo2);
      if (vitalsForm.respiratory_rate) payload.respiratory_rate = parseInt(vitalsForm.respiratory_rate);
      if (vitalsForm.blood_sugar) payload.blood_sugar = parseInt(vitalsForm.blood_sugar);
      if (vitalsForm.blood_sugar_type) payload.blood_sugar_type = vitalsForm.blood_sugar_type;
      if (vitalsForm.notes) payload.notes = vitalsForm.notes;
      
      await apiClient.post('/vitals', payload);
      setRecordVitalsBed(null);
      await fetchBeds();
    } catch (err: any) {
      setVitalsError(err?.response?.data?.error || err?.response?.data?.details?.join(', ') || 'Failed to save vitals.');
    } finally {
      setSubmittingVitals(false);
    }
  }

  // Grouping list of Wards
  const wardsList = ['All', ...Array.from(new Set(beds.map(b => b.ward)))];

  // Filtering Logic
  const filteredBeds = beds.filter(bed => {
    const wardMatch = selectedWard === 'All' || bed.ward === selectedWard;
    const statusMatch = statusFilter === 'All' || bed.status === statusFilter;
    return wardMatch && statusMatch;
  });

  const filteredPatientsForSelect = patientSearch
    ? patients.filter(p => p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || p.uhid?.includes(patientSearch))
    : patients;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Bed Allocation Management</div>
          <div className="page-sub">Monitor and allocate hospital beds & patient vitals</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchBeds} disabled={loading}>
          {loading ? <div className="spinner spinner-sm" /> : '🔄 Refresh Status'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Ward Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <div className="tabs" style={{ width: 'max-content', marginBottom: 0 }}>
          {wardsList.map(ward => (
            <button
              key={ward}
              className={`tab${selectedWard === ward ? ' active' : ''}`}
              onClick={() => setSelectedWard(ward)}
            >
              {ward}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['All', 'Available', 'Occupied'] as const).map(status => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(status)}
            style={{ borderRadius: 20 }}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filteredBeds.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🛏️</span>
          <h3>No beds found</h3>
          <p>No beds match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredBeds.map(bed => {
            const isOccupied = bed.status === 'Occupied';
            return (
              <div
                key={bed.id}
                className="card"
                style={{
                  margin: 0,
                  border: `1px solid ${isOccupied ? '#fca5a5' : 'var(--border)'}`,
                  background: isOccupied ? 'rgba(254, 242, 242, 0.4)' : 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 16,
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Bed Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{bed.room}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 6 }}>({bed.bed_number})</span>
                  </div>
                  <span
                    className={`badge ${isOccupied ? 'badge-danger' : 'badge-success'}`}
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    {bed.status}
                  </span>
                </div>

                {/* Bed Meta */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {bed.type} Bed
                  </span>
                  <span className="badge badge-info">{bed.ward}</span>
                </div>

                {/* Occupant Detail */}
                {isOccupied ? (
                  <div style={{ borderTop: '1px solid #fee2e2', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>PATIENT DETAILS</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>{bed.patient_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>UHID: <strong>{bed.patient_uhid}</strong></div>
                    {bed.doctor_name && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Attending: <strong>Dr. {bed.doctor_name}</strong></div>
                    )}
                    {bed.admitted_at && (
                      <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>Admitted: {new Date(bed.admitted_at).toLocaleString('en-IN')}</div>
                    )}

                    {/* Vitals Summary */}
                    {bed.vitals ? (
                      <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 8, padding: 8, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', letterSpacing: 0.5 }}>LATEST VITALS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                          {bed.vitals.bp_systolic && (
                            <div>BP: <strong>{bed.vitals.bp_systolic}/{bed.vitals.bp_diastolic}</strong> mmHg</div>
                          )}
                          {bed.vitals.heart_rate && (
                            <div>HR: <strong>{bed.vitals.heart_rate}</strong> bpm</div>
                          )}
                          {bed.vitals.spo2 && (
                            <div>SpO₂: <strong>{bed.vitals.spo2}</strong>%</div>
                          )}
                          {bed.vitals.temperature && (
                            <div>Temp: <strong>{bed.vitals.temperature}</strong>°{bed.vitals.temperature_unit || 'F'}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontStyle: 'italic', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        No vitals recorded since admission.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    🛏️ Bed is clean & vacant
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: isOccupied ? 'none' : '1px solid var(--border-light)' }}>
                  {isOccupied ? (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => setRecordVitalsBed(bed)}
                      >
                        📊 Record Vitals
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleRelease(bed.id)}
                      >
                        Vacate
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => setAllocateBed(bed)}
                    >
                      Allocate Bed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Allocation Modal */}
      {allocateBed && (
        <div className="modal-overlay" onClick={() => setAllocateBed(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Allocate {allocateBed.room} ({allocateBed.bed_number})</div>
              <button className="modal-close" onClick={() => setAllocateBed(null)}>✕</button>
            </div>
            <form onSubmit={handleAllocate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Search Patient *</label>
                  <input
                    className="input"
                    placeholder="Search patient by name or UHID..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Patient *</label>
                  <select
                    className="input"
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    required
                  >
                    <option value="">— Select Patient —</option>
                    {filteredPatientsForSelect.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Attending Doctor (Optional)</label>
                  <select
                    className="input"
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">— Select Attending Doctor —</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization || 'General'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setAllocateBed(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingAlloc}>
                  {submittingAlloc ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Vitals Modal */}
      {recordVitalsBed && (
        <div className="modal-overlay" onClick={() => setRecordVitalsBed(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Record Vitals - {recordVitalsBed.patient_name}</div>
              <button className="modal-close" onClick={() => setRecordVitalsBed(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveVitals}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {vitalsError && <div className="alert alert-danger">{vitalsError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">BP (Systolic)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 120"
                      value={vitalsForm.bp_systolic}
                      onChange={e => setVitalsForm(f => ({ ...f, bp_systolic: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">BP (Diastolic)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 80"
                      value={vitalsForm.bp_diastolic}
                      onChange={e => setVitalsForm(f => ({ ...f, bp_diastolic: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Heart Rate (bpm)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 72"
                      value={vitalsForm.heart_rate}
                      onChange={e => setVitalsForm(f => ({ ...f, heart_rate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SpO₂ (%)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 98"
                      value={vitalsForm.spo2}
                      onChange={e => setVitalsForm(f => ({ ...f, spo2: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temperature (°F)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 98.6"
                      value={vitalsForm.temperature}
                      onChange={e => setVitalsForm(f => ({ ...f, temperature: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resp. Rate (/min)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 16"
                      value={vitalsForm.respiratory_rate}
                      onChange={e => setVitalsForm(f => ({ ...f, respiratory_rate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Sugar (mg/dL)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 110"
                      value={vitalsForm.blood_sugar}
                      onChange={e => setVitalsForm(f => ({ ...f, blood_sugar: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sugar Type</label>
                    <select
                      className="input"
                      value={vitalsForm.blood_sugar_type}
                      onChange={e => setVitalsForm(f => ({ ...f, blood_sugar_type: e.target.value }))}
                    >
                      <option value="Random">Random</option>
                      <option value="Fasting">Fasting</option>
                      <option value="Post-meal">Post-meal</option>
                      <option value="HbA1c">HbA1c</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Notes</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="General status, complaints, notes..."
                    value={vitalsForm.notes}
                    onChange={e => setVitalsForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRecordVitalsBed(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingVitals}>
                  {submittingVitals ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
