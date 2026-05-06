import React, { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BILLING_HEADERS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';
import { getStatusVariant } from '../../utils/colors';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

const BILLING_LABEL: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  READY_FOR_CHECKOUT: 'Ready for Checkout',
  PAID: 'Paid',
};

export default function AdminBilling({ onNavigate }: Props) {
  return (
    <div className="page-scroll">
      <div className="page-header">
        <div>
          <div className="page-title">Billing</div>
          <div className="page-subtitle">All patient billing records</div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Revenue', value: `₹${BILLING_HEADERS.reduce((s, b) => s + b.amountPaid, 0).toLocaleString('en-IN')}`, color: 'var(--success)', bg: 'var(--success-bg)' },
          { label: 'Outstanding', value: `₹${BILLING_HEADERS.reduce((s, b) => s + b.amountDue, 0).toLocaleString('en-IN')}`, color: 'var(--danger)', bg: 'var(--danger-bg)' },
          { label: 'Active Bills', value: BILLING_HEADERS.filter(b => b.status !== 'PAID').length, color: 'var(--warning)', bg: 'var(--warning-bg)' },
        ].map((s) => (
          <div key={s.label} style={{
            padding: '16px 20px', borderRadius: 'var(--radius)', background: s.bg,
            border: `1px solid ${s.color}40`, minWidth: 160,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Billing Records</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {BILLING_HEADERS.map((bill) => (
                <tr key={bill.id} style={{ cursor: 'pointer' }}
                  onClick={() => onNavigate('admin-billing-detail', { billId: bill.id })}>
                  <td style={{ fontWeight: 600 }}>{bill.patientName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{bill.doctorName}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(bill.createdAt)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>₹{bill.grandTotal.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{bill.amountPaid.toLocaleString('en-IN')}</td>
                  <td style={{ color: bill.amountDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                    ₹{bill.amountDue.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <Badge
                      label={BILLING_LABEL[bill.status] ?? bill.status}
                      variant={getStatusVariant(bill.status) as any}
                    />
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate('admin-billing-detail', { billId: bill.id }); }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
