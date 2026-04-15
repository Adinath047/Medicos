import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant, formatBillingStatus } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SectionHeader, Divider } from '../../components/common/UIHelpers';
import {
  BILLING_HEADERS, BILLING_ITEMS, PATIENTS, DOCTORS,
} from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function BillingDetailScreen({ navigation, route }: any) {
  const { billId } = route.params;
  const bill = BILLING_HEADERS.find((b) => b.id === billId);
  if (!bill) return null;

  const items = BILLING_ITEMS.filter((i) => i.billingHeaderId === billId);
  const patient = PATIENTS.find((p) => p.id === bill.patientId);

  const [editMode, setEditMode] = useState(false);

  const handleStatusChange = (newStatus: typeof bill.status) => {
    Alert.alert(
      `Mark as ${formatBillingStatus(newStatus)}?`,
      newStatus === 'READY_FOR_CHECKOUT'
        ? 'This will lock the bill items. Continue?'
        : 'Record payment and mark as PAID?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'default', onPress: () => Alert.alert('Updated!') },
      ],
    );
  };

  const handleRecordPayment = () => {
    Alert.alert('Record Payment', 'Payment recording coming with Firebase integration.');
  };

  const handlePDF = () => {
    Alert.alert('📄 PDF Export', 'Bill PDF will be generated and shared.');
  };

  const CategoryColors: Record<string, string> = {
    Room: Colors.primary, Consultation: Colors.green, Lab: Colors.teal,
    Imaging: Colors.purple, Surgery: Colors.danger, Pharmacy: Colors.warning,
    Nursing: Colors.info, Misc: Colors.textMuted,
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Bill Detail"
        showBack onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handlePDF} style={styles.pdfBtn}>
            <Text style={styles.pdfBtnText}>📄 PDF</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.billHeader}>
          <View style={styles.billMeta}>
            <Text style={styles.billId}>Bill #{bill.id.toUpperCase()}</Text>
            <Badge
              label={formatBillingStatus(bill.status)}
              variant={getStatusBadgeVariant(bill.status)}
            />
          </View>
          <View style={styles.billParties}>
            <View style={styles.billParty}>
              <Text style={styles.partyLabel}>PATIENT</Text>
              <View style={styles.partyRow}>
                {patient && <Avatar uri={patient.photoURL} name={patient.name} size={28} />}
                <Text style={styles.partyName}>{bill.patientName}</Text>
              </View>
            </View>
            <View style={styles.billParty}>
              <Text style={styles.partyLabel}>DOCTOR</Text>
              <Text style={styles.partyName}>{bill.doctorName}</Text>
            </View>
            <View style={styles.billParty}>
              <Text style={styles.partyLabel}>DATE</Text>
              <Text style={styles.partyName}>{formatDate(bill.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* ── Line Items ── */}
        <SectionHeader
          title="Services & Charges"
          action={bill.status === 'IN_PROGRESS' ? (
            <Button label="+ Add Item" size="sm" variant="outline" onPress={() => {}} />
          ) : null}
        />

        <View style={styles.itemsTable}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemCell, { flex: 2 }]}>Description</Text>
            <Text style={[styles.itemCell, { flex: 0.6, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.itemCell, { flex: 1, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.itemCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={[styles.categoryChip, { backgroundColor: (CategoryColors[item.category] ?? Colors.textMuted) + '18' }]}>
                  <Text style={[styles.categoryText, { color: CategoryColors[item.category] ?? Colors.textMuted }]}>
                    {item.category}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemVal, { flex: 0.6, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.itemVal, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.rate)}</Text>
              <Text style={[styles.itemVal, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* ── Summary ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>{formatCurrency(bill.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (9%)</Text>
            <Text style={styles.summaryVal}>{formatCurrency(bill.tax)}</Text>
          </View>
          {bill.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: Colors.success }]}>Discount</Text>
              <Text style={[styles.summaryVal, { color: Colors.success }]}>− {formatCurrency(bill.discount)}</Text>
            </View>
          )}
          <Divider />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: '700', fontSize: 15 }]}>Grand Total</Text>
            <Text style={[styles.summaryVal, { fontWeight: '800', fontSize: 18, color: Colors.text }]}>{formatCurrency(bill.grandTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: Colors.success }]}>Amount Paid</Text>
            <Text style={[styles.summaryVal, { color: Colors.success, fontWeight: '600' }]}>{formatCurrency(bill.amountPaid)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.dueRow]}>
            <Text style={[styles.summaryLabel, { color: Colors.danger, fontWeight: '700' }]}>Amount Due</Text>
            <Text style={[styles.summaryVal, { color: Colors.danger, fontWeight: '800', fontSize: 16 }]}>{formatCurrency(bill.amountDue)}</Text>
          </View>
        </View>

        {/* ── Actions ── */}
        {bill.status !== 'PAID' && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Actions</Text>
            {bill.status === 'IN_PROGRESS' && (
              <Button
                label="Mark Ready for Checkout"
                onPress={() => handleStatusChange('READY_FOR_CHECKOUT')}
                variant="primary"
                fullWidth
                style={{ marginBottom: 10 }}
              />
            )}
            {bill.status === 'READY_FOR_CHECKOUT' && (
              <Button
                label="Mark as PAID"
                onPress={() => handleStatusChange('PAID')}
                variant="success"
                fullWidth
                style={{ marginBottom: 10 }}
              />
            )}
            <Button
              label="Record Payment"
              onPress={handleRecordPayment}
              variant="outline"
              fullWidth
            />
          </View>
        )}

        {bill.status === 'PAID' && (
          <View style={styles.paidBanner}>
            <Text style={styles.paidText}>✅ Bill fully paid on {formatDate(bill.createdAt)}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  pdfBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusSm,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  pdfBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  billHeader: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 18, borderWidth: 1, borderColor: Colors.border, ...Layout.shadow,
  },
  billMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  billId: { fontSize: 16, fontWeight: '700', color: Colors.text },
  billParties: { flexDirection: 'row', gap: 8 },
  billParty: { flex: 1, gap: 4 },
  partyLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partyName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  itemsTable: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row', backgroundColor: Colors.bgAlt,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemCell: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  itemDesc: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  categoryChip: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  categoryText: { fontSize: 10, fontWeight: '700' },
  itemVal: { fontSize: 13, color: Colors.textSecondary },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 10, ...Layout.shadowSm,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: Colors.textMuted },
  summaryVal: { fontSize: 14, color: Colors.text },
  dueRow: {
    backgroundColor: Colors.dangerBg, borderRadius: Layout.radiusSm,
    padding: 12, marginTop: 4,
  },
  actionsCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 18, borderWidth: 1, borderColor: Colors.border,
  },
  actionsTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  paidBanner: {
    backgroundColor: Colors.successBg, borderRadius: Layout.radius,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.success + '40',
  },
  paidText: { fontSize: 14, fontWeight: '600', color: Colors.success },
});
