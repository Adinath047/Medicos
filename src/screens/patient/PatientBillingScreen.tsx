import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Badge, getStatusBadgeVariant, formatBillingStatus } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/UIHelpers';
import { BILLING_HEADERS, BILLING_ITEMS, PATIENTS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PatientBillingScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const patient = PATIENTS.find((p) => p.email === user?.email) ?? PATIENTS[0];
  const myBills = BILLING_HEADERS.filter((b) => b.patientId === patient.id);

  const handleDownload = () => {
    Alert.alert('📄 Receipt', 'Receipt download/share will be available here.');
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bills</Text>
        <Text style={styles.subtitle}>{myBills.length} bills</Text>
      </View>

      <FlatList
        data={myBills}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="🧾" title="No bills yet" subtitle="Your hospital bills will appear here." />
        }
        renderItem={({ item: bill }) => {
          const items = BILLING_ITEMS.filter((i) => i.billingHeaderId === bill.id);
          return (
            <View style={styles.billCard}>
              <View style={styles.billTop}>
                <View>
                  <Text style={styles.billDoctor}>{bill.doctorName}</Text>
                  <Text style={styles.billDate}>{formatDate(bill.createdAt)}</Text>
                </View>
                <Badge label={formatBillingStatus(bill.status)} variant={getStatusBadgeVariant(bill.status)} />
              </View>

              {/* Category summary */}
              <View style={styles.catRow}>
                {[...new Set(items.map((i) => i.category))].map((cat) => (
                  <View key={cat} style={styles.catChip}>
                    <Text style={styles.catText}>{cat}</Text>
                  </View>
                ))}
              </View>

              {/* Amounts */}
              <View style={styles.amtsRow}>
                <View style={styles.amtBlock}>
                  <Text style={styles.amtLabel}>Total</Text>
                  <Text style={styles.amtVal}>{formatCurrency(bill.grandTotal)}</Text>
                </View>
                <View style={styles.amtBlock}>
                  <Text style={[styles.amtLabel, { color: Colors.success }]}>Paid</Text>
                  <Text style={[styles.amtVal, { color: Colors.success }]}>{formatCurrency(bill.amountPaid)}</Text>
                </View>
                <View style={styles.amtBlock}>
                  <Text style={[styles.amtLabel, { color: bill.amountDue > 0 ? Colors.danger : Colors.success }]}>Due</Text>
                  <Text style={[styles.amtVal, { color: bill.amountDue > 0 ? Colors.danger : Colors.success }]}>
                    {formatCurrency(bill.amountDue)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.billActions}>
                {bill.status === 'READY_FOR_CHECKOUT' && (
                  <TouchableOpacity style={styles.payBtn}
                    onPress={() => Alert.alert('💳 Payment', 'Payment gateway integration coming soon!')}>
                    <Text style={styles.payBtnText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
                {bill.status === 'PAID' && (
                  <TouchableOpacity style={styles.receiptBtn} onPress={handleDownload}>
                    <Text style={styles.receiptBtnText}>📄 Download Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  billCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
    overflow: 'hidden', ...Layout.shadow,
  },
  billTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  billDoctor: { fontSize: 15, fontWeight: '700', color: Colors.text },
  billDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, paddingBottom: 8 },
  catChip: {
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusFull,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  amtsRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgAlt,
  },
  amtBlock: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  amtVal: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 3 },
  billActions: { padding: 12, gap: 8 },
  payBtn: {
    backgroundColor: Colors.primary, borderRadius: Layout.radius,
    padding: 12, alignItems: 'center',
  },
  payBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textInverse },
  receiptBtn: {
    backgroundColor: Colors.successBg, borderRadius: Layout.radius,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.success + '40',
  },
  receiptBtnText: { fontSize: 14, fontWeight: '600', color: Colors.success },
});
