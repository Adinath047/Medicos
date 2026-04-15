import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant, formatBillingStatus } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/UIHelpers';
import { BILLING_HEADERS, PATIENTS } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function AdminBillingScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'IN_PROGRESS' | 'READY_FOR_CHECKOUT' | 'PAID'>('all');

  const filtered = filter === 'all'
    ? BILLING_HEADERS
    : BILLING_HEADERS.filter((b) => b.status === filter);

  const totals = {
    inProgress: BILLING_HEADERS.filter((b) => b.status === 'IN_PROGRESS').length,
    ready: BILLING_HEADERS.filter((b) => b.status === 'READY_FOR_CHECKOUT').length,
    paid: BILLING_HEADERS.filter((b) => b.status === 'PAID').length,
  };

  const renderBill = ({ item: bill }: any) => {
    const patient = PATIENTS.find((p) => p.id === bill.patientId);
    return (
      <TouchableOpacity
        style={styles.billCard}
        onPress={() => navigation.navigate('BillingDetail', { billId: bill.id })}
        activeOpacity={0.75}
      >
        <View style={styles.billTop}>
          <View style={styles.billLeft}>
            {patient && <Avatar uri={patient.photoURL} name={patient.name} size={42} />}
            <View style={styles.billInfo}>
              <Text style={styles.billPatient}>{bill.patientName}</Text>
              <Text style={styles.billDoctor}>{bill.doctorName}</Text>
              <Text style={styles.billDate}>{formatDate(bill.createdAt)}</Text>
            </View>
          </View>
          <Badge
            label={formatBillingStatus(bill.status)}
            variant={getStatusBadgeVariant(bill.status)}
          />
        </View>
        <View style={styles.billBottom}>
          <View style={styles.amtBlock}>
            <Text style={styles.amtLabel}>Total</Text>
            <Text style={styles.amtVal}>{formatCurrency(bill.grandTotal)}</Text>
          </View>
          <View style={styles.amtBlock}>
            <Text style={styles.amtLabel}>Paid</Text>
            <Text style={[styles.amtVal, { color: Colors.success }]}>{formatCurrency(bill.amountPaid)}</Text>
          </View>
          <View style={styles.amtBlock}>
            <Text style={styles.amtLabel}>Due</Text>
            <Text style={[styles.amtVal, { color: bill.amountDue > 0 ? Colors.danger : Colors.success }]}>
              {formatCurrency(bill.amountDue)}
            </Text>
          </View>
          <Text style={styles.viewMore}>View →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Billing"
        subtitle="Hospital finances"
        onMenuPress={() => navigation.openDrawer()}
      />

      {/* Status summary */}
      <View style={styles.summaryBar}>
        <View style={styles.sumItem}>
          <Text style={[styles.sumVal, { color: Colors.warning }]}>{totals.inProgress}</Text>
          <Text style={styles.sumLabel}>In Progress</Text>
        </View>
        <View style={styles.sumDivider} />
        <View style={styles.sumItem}>
          <Text style={[styles.sumVal, { color: Colors.purple }]}>{totals.ready}</Text>
          <Text style={styles.sumLabel}>For Checkout</Text>
        </View>
        <View style={styles.sumDivider} />
        <View style={styles.sumItem}>
          <Text style={[styles.sumVal, { color: Colors.success }]}>{totals.paid}</Text>
          <Text style={styles.sumLabel}>Paid</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {([
          { key: 'all', label: 'All Bills' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'READY_FOR_CHECKOUT', label: 'For Checkout' },
          { key: 'PAID', label: 'Paid' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key} style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered} keyExtractor={(b) => b.id} renderItem={renderBill}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="🧾" title="No bills found" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  summaryBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    margin: 16, marginBottom: 0, borderRadius: Layout.radius,
    borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  sumItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  sumVal: { fontSize: 22, fontWeight: '700' },
  sumLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sumDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 12 },
  tabsScroll: { marginTop: 12 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: Layout.radiusFull,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  list: { padding: 16, paddingBottom: 24 },
  billCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  billLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  billInfo: { flex: 1 },
  billPatient: { fontSize: 15, fontWeight: '700', color: Colors.text },
  billDoctor: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  billDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  billBottom: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm, padding: 10,
  },
  amtBlock: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  amtVal: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 2 },
  viewMore: { fontSize: 20, color: Colors.textLight, paddingLeft: 8 },
});
