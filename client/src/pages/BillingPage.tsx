// client/src/pages/BillingPage.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { db, markPending } from '../db/localDB';
import { useAuthStore } from '../store/authStore';
import { v4 as uuid } from 'uuid';
import { printInvoice } from '../utils/printTemplates';

const PAY_MODES = ['Cash','Card','UPI','Insurance','Online'];
const STATUS_COLOR: Record<string,string> = { 'Paid':'badge-success','Partial':'badge-warning','Pending':'badge-danger','Waived':'badge-neutral' };

const EMPTY_ITEM = { description:'', quantity:1, unit_price:0, amount:0 };

export default function BillingPage({ onNavigate }: { onNavigate:(p:string,d?:any)=>void }) {
  const { user } = useAuthStore();
  const [bills, setBills]       = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [patientId, setPatientId] = useState('');
  const [items, setItems]       = useState([{ ...EMPTY_ITEM }]);
  const [discount, setDiscount] = useState('0');
  const [payMode, setPayMode]   = useState('Cash');
  const [paidAmount, setPaid]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('All');

  const total    = items.reduce((s,i)=>s+(i.quantity*i.unit_price),0);
  const net      = Math.max(0, total - parseFloat(discount||'0'));
  const paid     = parseFloat(paidAmount||'0');

  const setItem  = (i:number, k:string, v:any) => setItems(ms=>ms.map((m,j)=>j===i ? { ...m, [k]:v, amount: k==='quantity'||k==='unit_price' ? (k==='quantity'?v:m.quantity) * (k==='unit_price'?v:m.unit_price) : m.amount } : m));

  useEffect(()=>{
    (async()=>{
      try { const r=await apiClient.get('/billing'); setBills(r.data); }
      catch { setBills(await db.billing.toArray()); }
      finally { setLoading(false); }
    })();
    (async()=>{
      try { const r=await apiClient.get('/patients',{params:{limit:200}}); setPatients(r.data.patients); }
      catch { setPatients(await db.patients.toArray()); }
    })();
  },[]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!patientId) return;
    setSaving(true);
    const now=new Date().toISOString(); const id=uuid();
    const payload:any={
      id, hospital_id:user?.hospitalId||'hsp-001', patient_id:patientId,
      items:items.map(i=>({...i,amount:i.quantity*i.unit_price})),
      total_amount:total, discount:parseFloat(discount||'0'), net_amount:net,
      paid_amount:paid, payment_mode:payMode,
      payment_status: paid>=net?'Paid':paid>0?'Partial':'Pending',
      notes:notes||null, billed_by:user?.id, created_at:now,
    };
    try { const r=await apiClient.post('/billing',payload); setBills(b=>[r.data,...b]); }
    catch { await markPending(db.billing,payload,'create'); await db.billing.put(payload); setBills(b=>[payload,...b]); }
    finally { setSaving(false); setShowAdd(false); setItems([{...EMPTY_ITEM}]); setPatientId(''); setPaid(''); }
  }

  const filtered = filter==='All' ? bills : bills.filter(b=>b.payment_status===filter);

  function handlePrint(b: any) {
    const patient = patients.find((p: any) => p.id === b.patient_id);
    const items   = Array.isArray(b.items) ? b.items : [];
    const total   = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
    printInvoice({
      invoice: { id: b.id, invoice_number: b.invoice_number, created_at: b.created_at, payment_mode: b.payment_mode, payment_status: b.payment_status },
      patient: { name: b.patient_name || patient?.name || '—', uhid: b.uhid || patient?.uhid, phone: patient?.phone },
      items,
      totals: { total, discount: b.discount || 0, net: b.net_amount || total, paid: b.paid_amount || 0 },
      billedBy: user?.name,
      notes: b.notes,
    });
  }

  return (
    <>
      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">🧾 New Invoice</div><button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button></div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Patient *</label>
                  <select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)} required>
                    <option value="">— Select —</option>
                    {patients.map(p=><option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
                  </select>
                </div>

                {/* Items */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div className="section-label">Line Items</div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setItems(i=>[...i,{...EMPTY_ITEM}])}>+ Add Row</button>
                  </div>
                  {items.map((item,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 60px 90px 80px 30px',gap:8,marginBottom:8,alignItems:'center'}}>
                      <input className="input" placeholder="Description" value={item.description} onChange={e=>setItem(i,'description',e.target.value)} />
                      <input className="input" type="number" min={1} placeholder="Qty" value={item.quantity} onChange={e=>setItem(i,'quantity',parseInt(e.target.value)||1)} />
                      <input className="input" type="number" min={0} placeholder="Rate ₹" value={item.unit_price} onChange={e=>setItem(i,'unit_price',parseFloat(e.target.value)||0)} />
                      <div style={{textAlign:'right',fontWeight:700,fontSize:14}}>₹{(item.quantity*item.unit_price).toFixed(0)}</div>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={()=>setItems(x=>x.filter((_,j)=>j!==i))} disabled={items.length===1}>✕</button>
                    </div>
                  ))}
                  <div style={{borderTop:'2px solid var(--border)',paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text-muted)'}}>Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'var(--text-muted)'}}>Discount</span>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <span>₹</span><input className="input" type="number" min={0} max={total} value={discount} onChange={e=>setDiscount(e.target.value)} style={{width:90}} />
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:16}}><span>Net Total</span><span style={{color:'var(--primary)'}}>₹{net.toFixed(2)}</span></div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="input" value={payMode} onChange={e=>setPayMode(e.target.value)}>
                      {PAY_MODES.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid ₹</label>
                    <input className="input" type="number" min={0} max={net} placeholder={`Max ₹${net.toFixed(0)}`} value={paidAmount} onChange={e=>setPaid(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="input" placeholder="Any billing notes…" value={notes} onChange={e=>setNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'✓ Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">🏥 Billing</div>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ New Invoice</button>
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {['All','Pending','Partial','Paid'].map(f=>(
          <button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading
        ? <div style={{padding:48,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
        : filtered.length===0
          ? <div className="card"><div className="empty-state"><span className="empty-icon">🧾</span><h3>No invoices</h3></div></div>
          : <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Mode</th><th>Status</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map((b:any)=>(
                      <tr key={b.id}>
                        <td style={{fontWeight:700,color:'var(--primary)',fontSize:12}}>{b.invoice_number||b.id.slice(0,8)}</td>
                        <td>
                          <div style={{fontWeight:600,cursor:'pointer'}} onClick={()=>onNavigate('patient_detail',{patientId:b.patient_id})}>{b.patient_name||'—'}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>{b.uhid||''}</div>
                        </td>
                        <td style={{fontWeight:700}}>₹{b.net_amount?.toFixed(2)||'0.00'}</td>
                        <td style={{color:'var(--success)',fontWeight:600}}>₹{b.paid_amount?.toFixed(2)||'0.00'}</td>
                        <td style={{fontSize:12}}>{b.payment_mode}</td>
                        <td><span className={`badge ${STATUS_COLOR[b.payment_status]||'badge-neutral'}`}>{b.payment_status}</span></td>
                        <td style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => handlePrint(b)} title="Print Invoice">🖨️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',gap:24}}>
                <div style={{fontSize:13}}><strong>Total Billed:</strong> ₹{filtered.reduce((s:number,b:any)=>s+(b.net_amount||0),0).toFixed(2)}</div>
                <div style={{fontSize:13,color:'var(--success)'}}><strong>Collected:</strong> ₹{filtered.reduce((s:number,b:any)=>s+(b.paid_amount||0),0).toFixed(2)}</div>
                <div style={{fontSize:13,color:'var(--danger)'}}><strong>Outstanding:</strong> ₹{filtered.reduce((s:number,b:any)=>s+Math.max(0,(b.net_amount||0)-(b.paid_amount||0)),0).toFixed(2)}</div>
              </div>
            </div>
      }
    </>
  );
}
