import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/UIHelpers';
import { PATIENTS, VISITS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';

type FilterTab = 'all' | 'admitted' | 'outpatient' | 'discharged';

export default function AdminPatientsScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = PATIENTS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.primaryDoctor.toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      const visitStatus = filter === 'admitted' ? 'Admitted' : filter === 'outpatient' ? 'OPD' : 'Discharged';
      const admittedIds = new Set(VISITS.filter((v) => v.status === visitStatus).map((v) => v.patientId));
      list = list.filter((p) => admittedIds.has(p.id));
    }
    return list;
  }, [search, filter]);

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: PATIENTS.length },
    { key: 'admitted', label: 'Admitted', count: VISITS.filter((v) => v.status === 'Admitted').length },
    { key: 'outpatient', label: 'Outpatient', count: VISITS.filter((v) => v.status === 'OPD').length },
    { key: 'discharged', label: 'Discharged', count: VISITS.filter((v) => v.status === 'Discharged').length },
  ];

  const renderPatient = ({ item: p }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PatientDetail', { patientId: p.id })}
      activeOpacity={0.75}
    >
      <Avatar uri={p.photoURL} name={p.name} size={48} />
      <View style={styles.info}>
        <Text style={styles.name}>{p.name}</Text>
        <Text style={styles.sub}>{p.age}y · {p.sex} · {p.bloodGroup}</Text>
        <Text style={styles.doctor}>Dr: {p.primaryDoctor}</Text>
        <Text style={styles.visit}>Last visit: {formatDate(p.lastVisit)}</Text>
      </View>
      <View style={styles.right}>
        {p.allergies.length > 0 && (
          <Badge label="⚠️ Allergy" variant="warning" />
        )}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Patients"
        subtitle={`${PATIENTS.length} registered`}
        onMenuPress={() => navigation.openDrawer()}
        right={
          <Button
            label="+ Add"
            onPress={() => navigation.navigate('AddEditPatient')}
            size="sm"
          />
        }
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, doctor…"
          placeholderTextColor={Colors.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ fontSize: 16, color: Colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            <Text style={[styles.tabCount, filter === t.key && styles.tabCountActive]}>
              {t.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderPatient}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="👥" title="No patients found" subtitle="Try adjusting your search or filter." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: Layout.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Layout.radiusSm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabCount: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  tabCountActive: { color: Colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Layout.shadowSm,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  doctor: { fontSize: 12, color: Colors.primary, marginTop: 3 },
  visit: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  arrow: { fontSize: 22, color: Colors.textLight },
});
