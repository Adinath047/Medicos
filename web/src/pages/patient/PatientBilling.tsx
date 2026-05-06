import React from 'react';
import { Badge } from '../../components/Badge';
import { useAuthStore } from '../../hooks/useAuthStore';
import { PATIENTS, BILLING_HEADERS, BILLING_ITEMS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  READY_FOR_CHECKOUT: 'Ready for Checkout',
  PAID: 'Paid',
};

export default function PatientBilling({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const patient = PATIENTS.find((p) => p.email === user?.email);

  if (!patient) {
    return (
      <div className="page-scroll">
        <div className="page-header"><div><div className="page-title">My Billing</div></div></div>
        <div className="card"><div className="empty-state" style={{ padding: 48 }}>
          <span className="empty-state-icon">🧾</span>
          <h3>No billing records</h3>
          <p>No billing has been generated for your account yet.</p>
        </div></div>
      </div>
    );
  }

  const bills = BILLING_HEADERS.filter((b) => b.patientId === patient.id);
  const totalDue = bills.reduce((s, b) => s + b.amountDue, 0);


  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">My Billing</div>
          <div className="page-subtitle">{bills.length} billing records</div>
        </div>
        {totalDue > 0 && (
          <div style={{
            background: 'var(--danger-bg)', borderRadius: 'var(--radius)', padding: '10px 16px',
            border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Outstanding Due</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)' }}>
              ₹{totalDue.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {bills.map((bill) => {
          const items = BILLING_ITEMS.filter((i) => i.billingHeaderId === bill.id);
          return (
            <div key={bill.id} className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Bill #{bill.id}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Dr. {bill.doctorName} · {formatDate(bill.createdAt)}
                  </div>
                </div>
                <Badge label={STATUS_LABEL[bill.status] ?? bill.status} variant={getStatusVariant(bill.status) as any} />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.description}</td>
                        <td><span className="tag">{item.category}</span></td>
                        <td>{item.quantity}</td>
                        <td>₹{item.rate.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600 }}>₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Subtotal', value: `₹${bill.subtotal.toLocaleString('en-IN')}`, color: 'var(--text)' },
                  { label: 'Tax (9%)', value: `₹${bill.tax.toLocaleString('en-IN')}`, color: 'var(--text-muted)' },
                  { label: 'Paid', value: `₹${bill.amountPaid.toLocaleString('en-IN')}`, color: 'var(--success)' },
                  { label: 'Due', value: `₹${bill.amountDue.toLocaleString('en-IN')}`, color: bill.amountDue > 0 ? 'var(--danger)' : 'var(--success)' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '8px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
