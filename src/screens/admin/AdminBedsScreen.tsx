import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { BEDS, VITALS } from '../../data/mockData';
import { timeAgo, minutesSince, formatBP } from '../../utils/formatters';
import { getBPColor, getHRColor } from '../../utils/vitalsColor';

export default function AdminBedsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'Occupied' | 'Available' | 'Maintenance'>('all');

  const filtered = filter === 'all' ? BEDS : BEDS.filter((b) => b.status === filter);

  const getLastVitals = (bedId: string) =>
    VITALS.filter((v) => v.bedId === bedId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  const stats = {
    total: BEDS.length,
    occupied: BEDS.filter((b) => b.status === 'Occupied').length,
    available: BEDS.filter((b) => b.status === 'Available').length,
    maintenance: BEDS.filter((b) => b.status === 'Maintenance').length,
  };

  const renderBed = ({ item: bed }: any) => {
    const last = bed.status === 'Occupied' ? getLastVitals(bed.id) : null;
    const overdue = last ? minutesSince(last.recordedAt) >= 30 : bed.status === 'Occupied';

    return (
      <View style={[styles.card, overdue && bed.status === 'Occupied' && styles.cardOverdue]}>
        <View style={styles.cardTop}>
          <View style={styles.bedLabel}>
            <Text style={styles.bedNum}>🛏️ {bed.bedNumber}</Text>
            <Text style={styles.bedWard}>{bed.ward} · {bed.room}</Text>
            <Text style={styles.bedType}>{bed.type}</Text>
          </View>
          <Badge label={bed.status} variant={getStatusBadgeVariant(bed.status)} />
        </View>

        {bed.status === 'Occupied' && (
          <>
            <View style={styles.patientRow}>
              <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={38} />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{bed.patientName}</Text>
                <Text style={styles.doctorName}>{bed.doctorName}</Text>
              </View>
            </View>

            {last ? (
              <View style={styles.vitalsRow}>
                <Text style={[styles.vitalsItem, { color: getBPColor(last.bp_systolic) }]}>
                  BP {last.bp_systolic}/{last.bp_diastolic}
                </Text>
                <Text style={[styles.vitalsItem, { color: getHRColor(last.heartRate) }]}>
                  HR {last.heartRate}
                </Text>
                <Text style={styles.vitalsItem}>SpO₂ {last.spo2}%</Text>
                <Text style={[styles.vitalsTime, overdue && { color: Colors.danger }]}>
                  {timeAgo(last.recordedAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.noVitals}>⚠️ No vitals recorded</Text>
            )}

            <Button
              label="Enter Vitals →"
              onPress={() => navigation.navigate('VitalsEntry', { bedId: bed.id })}
              size="sm"
              variant="primary"
              style={{ marginTop: 10, alignSelf: 'flex-end' }}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Beds & Vitals"
        subtitle={`${stats.occupied}/${stats.total} occupied`}
        onMenuPress={() => navigation.openDrawer()}
        right={<Button label="+ Bed" size="sm" onPress={() => {}} />}
      />

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {[
          { label: 'Total', val: stats.total, color: Colors.primary },
          { label: 'Occupied', val: stats.occupied, color: Colors.warning },
          { label: 'Available', val: stats.available, color: Colors.success },
          { label: 'Maintenance', val: stats.maintenance, color: Colors.danger },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'Occupied', 'Available', 'Maintenance'] as const).map((f) => (
          <TouchableOpacity
            key={f} style={[styles.fTab, filter === f && styles.fTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.fTabText, filter === f && styles.fTabTextActive]}>
              {f === 'all' ? 'All' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered} keyExtractor={(b) => b.id} renderItem={renderBed}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12, borderRadius: Layout.radius,
    borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  fTab: {
    flex: 1, paddingVertical: 7, borderRadius: Layout.radiusSm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  fTabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  fTabText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  fTabTextActive: { color: Colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  cardOverdue: { borderColor: Colors.danger + '60', backgroundColor: '#fff5f5' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bedLabel: { gap: 2 },
  bedNum: { fontSize: 16, fontWeight: '700', color: Colors.text },
  bedWard: { fontSize: 12, color: Colors.textMuted },
  bedType: { fontSize: 11, color: Colors.primary },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  doctorName: { fontSize: 12, color: Colors.textMuted },
  vitalsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm, padding: 10 },
  vitalsItem: { fontSize: 13, fontWeight: '600', color: Colors.text },
  vitalsTime: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  noVitals: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
});
