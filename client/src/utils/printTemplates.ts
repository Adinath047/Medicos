// client/src/utils/printTemplates.ts
// Shared print helpers — open a styled popup window and trigger browser print

const BRAND = {
  name:    'Medicos Hospital',
  address: 'LAN Ward, Main Building',
  phone:   '+91-XXXX-XXXXXX',
  tagline: 'Compassionate Care · Advanced Medicine',
};

function openPrintWindow(html: string) {
  // Remove any stale print frame from a previous call
  const stale = document.getElementById('__medicos_print_frame__');
  if (stale) stale.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__medicos_print_frame__';
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { alert('Could not open print view. Please try again.'); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for iframe content (fonts, images) to load before printing
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Clean up after print dialog closes (generous timeout for slow dialogs)
      setTimeout(() => iframe.remove(), 2000);
    }, 150);
  };
}

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION SLIP
// ─────────────────────────────────────────────────────────────
export function printPrescriptionSlip(opts: {
  doctor:    { name: string; role: string; qualification?: string; regNo?: string };
  patient:   { name: string; uhid: string; age?: number; sex?: string; blood_group?: string };
  medicines: Array<{ name: string; strength?: string; dose: string; frequency: string; duration: string; instructions?: string }>;
  advice?:   string;
  followUp?: string;
  weight?:   string;
  slipToken: string;
}) {
  const { doctor, patient, medicines, advice, followUp, weight, slipToken } = opts;
  const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const time = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const medRows = medicines.map((m, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : ''}">
      <td class="num">${i + 1}</td>
      <td><strong>${m.name}</strong>${m.strength ? ` <span class="strength">${m.strength}</span>` : ''}</td>
      <td>${m.dose}</td>
      <td>${m.frequency}</td>
      <td>${m.duration}</td>
      <td class="note">${m.instructions || '—'}</td>
    </tr>`).join('');

  openPrintWindow(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Rx — ${patient.name}</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#0f172a; background:#fff; font-size:13px; }
  .page { padding:14mm 16mm 10mm; max-width:210mm; margin:0 auto; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:3px solid #1d4ed8; }
  .brand-name { font-size:22px; font-weight:900; color:#1d4ed8; letter-spacing:-0.5px; }
  .brand-sub  { font-size:10px; color:#64748b; margin-top:2px; }
  .brand-addr { font-size:10.5px; color:#475569; margin-top:4px; line-height:1.6; }
  .doctor-block { text-align:right; }
  .doctor-name  { font-size:16px; font-weight:800; color:#0f172a; }
  .doctor-sub   { font-size:10.5px; color:#64748b; margin-top:2px; }

  /* Patient box */
  .pt-box { display:flex; gap:0; margin:10px 0; border:1px solid #bfdbfe; border-radius:6px; overflow:hidden; }
  .pt-cell { flex:1; padding:8px 12px; background:#eff6ff; border-right:1px solid #bfdbfe; }
  .pt-cell:last-child { border-right:none; }
  .pt-lbl { font-size:9px; font-weight:700; text-transform:uppercase; color:#3b82f6; letter-spacing:.6px; }
  .pt-val { font-size:13.5px; font-weight:700; color:#0f172a; margin-top:2px; }

  /* Rx */
  .rx-line { display:flex; align-items:center; gap:10px; margin:14px 0 6px; }
  .rx-sym  { font-size:34px; font-style:italic; font-family:Georgia,serif; color:#1d4ed8; font-weight:700; line-height:1; }
  .rx-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:.8px; }

  /* Medicines table */
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  thead th { background:#1d4ed8; color:#fff; padding:7px 10px; text-align:left; font-size:10px; text-transform:uppercase; font-weight:700; letter-spacing:.5px; }
  thead th.num { width:28px; text-align:center; }
  tbody td { padding:7px 10px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  tbody .row-even td { background:#f8fafc; }
  .strength { font-size:11px; color:#3b82f6; font-weight:600; }
  .note { font-style:italic; color:#64748b; font-size:11.5px; }
  .num { text-align:center; color:#94a3b8; font-weight:700; }

  /* Advice */
  .advice-box { margin:12px 0; background:#fffbeb; border:1px solid #fcd34d; border-left:4px solid #f59e0b; border-radius:6px; padding:10px 14px; }
  .advice-lbl { font-size:10px; font-weight:700; text-transform:uppercase; color:#b45309; letter-spacing:.5px; margin-bottom:4px; }
  .advice-txt { font-size:12.5px; color:#0f172a; line-height:1.6; }

  /* Footer */
  .footer { display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px; padding-top:12px; border-top:1px dashed #cbd5e1; }
  .followup { font-size:12px; }
  .followup strong { color:#1d4ed8; }
  .sig-wrap { text-align:center; }
  .sig-line { border-bottom:1.5px solid #0f172a; width:150px; margin-bottom:5px; height:28px; }
  .sig-name { font-size:10.5px; color:#475569; font-weight:600; }

  /* Token + disclaimer */
  .bottom { margin-top:14px; display:flex; justify-content:space-between; align-items:center; }
  .token  { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:4px 12px; font-size:10px; font-weight:700; color:#64748b; font-family:monospace; }
  .disclaimer { font-size:9.5px; color:#94a3b8; font-style:italic; }

  @page { size:A4; margin:0; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">🏥 ${BRAND.name}</div>
      <div class="brand-sub">${BRAND.tagline}</div>
      <div class="brand-addr">${BRAND.address} &nbsp;|&nbsp; ${BRAND.phone}</div>
    </div>
    <div class="doctor-block">
      <div class="doctor-name">Dr. ${doctor.name}</div>
      <div class="doctor-sub">${doctor.qualification || doctor.role}${doctor.regNo ? `<br/>Reg. No: ${doctor.regNo}` : ''}</div>
      <div class="doctor-sub" style="margin-top:4px;color:#94a3b8">${date} &nbsp;·&nbsp; ${time}</div>
    </div>
  </div>

  <div class="pt-box">
    <div class="pt-cell"><div class="pt-lbl">Patient</div><div class="pt-val">${patient.name}</div></div>
    <div class="pt-cell"><div class="pt-lbl">UHID</div><div class="pt-val">${patient.uhid}</div></div>
    <div class="pt-cell"><div class="pt-lbl">Age / Sex</div><div class="pt-val">${patient.age ?? '?'}y &nbsp;${patient.sex ?? ''}</div></div>
    <div class="pt-cell"><div class="pt-lbl">Blood Group</div><div class="pt-val">${patient.blood_group || '—'}</div></div>
    ${weight ? `<div class="pt-cell"><div class="pt-lbl">Weight</div><div class="pt-val">${weight}</div></div>` : ''}
  </div>

  <div class="rx-line"><div class="rx-sym">℞</div><div class="rx-label">Prescription</div></div>

  <table>
    <thead><tr>
      <th class="num">#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Notes</th>
    </tr></thead>
    <tbody>${medRows}</tbody>
  </table>

  ${advice ? `<div class="advice-box"><div class="advice-lbl">Doctor's Instructions</div><div class="advice-txt">${advice}</div></div>` : ''}

  <div class="footer">
    <div class="followup">
      ${followUp
        ? `<strong>Follow-up:</strong> ${new Date(followUp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`
        : 'Next visit: _______________'}
    </div>
    <div class="sig-wrap">
      <div class="sig-line"></div>
      <div class="sig-name">Dr. ${doctor.name} &nbsp;·&nbsp; Signature &amp; Stamp</div>
    </div>
  </div>

  <div class="bottom">
    <div class="token">Rx Token: ${slipToken}</div>
    <div class="disclaimer">Computer-generated prescription. Valid only with doctor's signature &amp; stamp.</div>
  </div>
</div>
</body></html>`);
}


// ─────────────────────────────────────────────────────────────
// BILLING INVOICE
// ─────────────────────────────────────────────────────────────
export function printInvoice(opts: {
  invoice:   { id: string; invoice_number?: string; created_at: string; payment_mode: string; payment_status: string };
  patient:   { name: string; uhid?: string; phone?: string };
  items:     Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  totals:    { total: number; discount: number; net: number; paid: number };
  billedBy?: string;
  notes?:    string;
}) {
  const { invoice, patient, items, totals, billedBy, notes } = opts;
  const date = new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const invoiceNo = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const outstanding = Math.max(0, totals.net - totals.paid);

  const statusColors: Record<string, string> = {
    Paid: '#10b981', Partial: '#f59e0b', Pending: '#ef4444', Waived: '#64748b',
  };
  const statusColor = statusColors[invoice.payment_status] || '#64748b';

  const itemRows = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : ''}">
      <td class="num">${i + 1}</td>
      <td>${item.description}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">₹${item.unit_price.toFixed(2)}</td>
      <td class="right amount">₹${(item.quantity * item.unit_price).toFixed(2)}</td>
    </tr>`).join('');

  openPrintWindow(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#0f172a; background:#fff; font-size:13px; }
  .page { padding:14mm 16mm 10mm; max-width:210mm; margin:0 auto; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:3px solid #1d4ed8; margin-bottom:18px; }
  .brand-name { font-size:22px; font-weight:900; color:#1d4ed8; }
  .brand-sub  { font-size:10px; color:#64748b; margin-top:2px; }
  .brand-addr { font-size:10.5px; color:#475569; margin-top:4px; line-height:1.7; }
  .inv-block  { text-align:right; }
  .inv-title  { font-size:24px; font-weight:900; text-transform:uppercase; color:#0f172a; letter-spacing:1px; }
  .inv-no     { font-size:13px; font-weight:700; color:#1d4ed8; margin-top:4px; font-family:monospace; }
  .inv-date   { font-size:11px; color:#64748b; margin-top:3px; }
  .inv-status { display:inline-block; margin-top:6px; padding:3px 12px; border-radius:99px; font-size:11px; font-weight:700; color:#fff; background:${statusColor}; }

  /* Bill to */
  .bill-section { display:flex; gap:0; margin-bottom:18px; }
  .bill-to    { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px 0 0 8px; padding:12px 16px; }
  .pay-info   { width:200px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:0 8px 8px 0; border-left:none; padding:12px 16px; }
  .section-lbl { font-size:9.5px; font-weight:700; text-transform:uppercase; color:#94a3b8; letter-spacing:.7px; margin-bottom:6px; }
  .patient-name { font-size:15px; font-weight:800; }
  .patient-sub  { font-size:11px; color:#64748b; margin-top:2px; line-height:1.6; }
  .pay-row { display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px; }
  .pay-val { font-weight:700; }

  /* Items table */
  table { width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:16px; }
  thead th { background:#1d4ed8; color:#fff; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
  thead th.right  { text-align:right; }
  thead th.center { text-align:center; }
  thead th.num    { width:28px; text-align:center; }
  tbody td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
  .row-even td { background:#fafafa; }
  .num    { text-align:center; color:#94a3b8; font-weight:600; }
  .center { text-align:center; }
  .right  { text-align:right; }
  .amount { font-weight:700; }

  /* Totals */
  .totals { display:flex; justify-content:flex-end; margin-bottom:18px; }
  .totals-box { width:260px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .tot-row { display:flex; justify-content:space-between; padding:7px 14px; font-size:12.5px; border-bottom:1px solid #f1f5f9; }
  .tot-row:last-child { border-bottom:none; }
  .tot-row.net { background:#1d4ed8; color:#fff; font-weight:800; font-size:14px; }
  .tot-row.outstanding { background:#fef2f2; color:#ef4444; font-weight:700; }
  .tot-row.paid-row { background:#ecfdf5; color:#10b981; font-weight:700; }

  /* Footer */
  .footer { display:flex; justify-content:space-between; align-items:flex-end; border-top:1px dashed #cbd5e1; padding-top:14px; }
  .notes-box { flex:1; font-size:11.5px; color:#475569; }
  .notes-lbl { font-size:9.5px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:3px; }
  .sig-wrap { text-align:center; }
  .sig-line { border-bottom:1.5px solid #0f172a; width:150px; margin-bottom:5px; height:28px; }
  .sig-name { font-size:10.5px; color:#475569; font-weight:600; }
  .disclaimer { text-align:center; margin-top:16px; font-size:9.5px; color:#94a3b8; font-style:italic; }

  @page { size:A4; margin:0; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">🏥 ${BRAND.name}</div>
      <div class="brand-sub">${BRAND.tagline}</div>
      <div class="brand-addr">${BRAND.address} &nbsp;|&nbsp; ${BRAND.phone}</div>
    </div>
    <div class="inv-block">
      <div class="inv-title">Invoice</div>
      <div class="inv-no">${invoiceNo}</div>
      <div class="inv-date">${date}</div>
      <div class="inv-status">${invoice.payment_status}</div>
    </div>
  </div>

  <div class="bill-section">
    <div class="bill-to">
      <div class="section-lbl">Bill To</div>
      <div class="patient-name">${patient.name}</div>
      <div class="patient-sub">
        ${patient.uhid ? `UHID: <strong>${patient.uhid}</strong>` : ''}
        ${patient.phone ? `&nbsp;|&nbsp; ${patient.phone}` : ''}
      </div>
    </div>
    <div class="pay-info">
      <div class="section-lbl">Payment</div>
      <div class="pay-row"><span>Mode</span><span class="pay-val">${invoice.payment_mode}</span></div>
      <div class="pay-row"><span>Status</span><span class="pay-val" style="color:${statusColor}">${invoice.payment_status}</span></div>
      ${billedBy ? `<div class="pay-row"><span>Billed by</span><span class="pay-val">${billedBy}</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr>
      <th class="num">#</th>
      <th>Description</th>
      <th class="center">Qty</th>
      <th class="right">Rate</th>
      <th class="right">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="tot-row"><span>Subtotal</span><span>₹${totals.total.toFixed(2)}</span></div>
      ${totals.discount > 0 ? `<div class="tot-row"><span>Discount</span><span style="color:#10b981">− ₹${totals.discount.toFixed(2)}</span></div>` : ''}
      <div class="tot-row net"><span>Net Total</span><span>₹${totals.net.toFixed(2)}</span></div>
      <div class="tot-row paid-row"><span>Paid</span><span>₹${totals.paid.toFixed(2)}</span></div>
      ${outstanding > 0 ? `<div class="tot-row outstanding"><span>Outstanding</span><span>₹${outstanding.toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  <div class="footer">
    <div class="notes-box">
      ${notes ? `<div class="notes-lbl">Notes</div><div>${notes}</div>` : ''}
    </div>
    <div class="sig-wrap">
      <div class="sig-line"></div>
      <div class="sig-name">Authorised Signatory</div>
    </div>
  </div>

  <div class="disclaimer">This is a computer-generated invoice. Thank you for choosing ${BRAND.name}.</div>
</div>
</body></html>`);
}
