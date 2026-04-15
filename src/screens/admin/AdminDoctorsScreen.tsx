import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/UIHelpers';
import { DOCTORS } from '../../data/mockData';

export default function AdminDoctorsScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  const filtered = DOCTORS.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || d.status === filter;
    return matchSearch && matchFilter;
  });

  const renderDoctor = ({ item: d }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DoctorDetail', { doctorId: d.id })}
      activeOpacity={0.75}
    >
      <Avatar uri={d.photoURL} name={d.name} size={52} />
      <View style={styles.info}>
        <Text style={styles.name}>{d.name}</Text>
        <Text style={styles.spec}>{d.specialization}</Text>
        <Text style={styles.reg}>Reg: {d.regNumber}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>👥 {d.patientsCount} patients</Text>
          <Text style={styles.meta}>⏳ {d.experience} yrs exp.</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Badge label={d.status} variant={d.status === 'Active' ? 'success' : 'danger'} />
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Doctors"
        subtitle={`${DOCTORS.length} in team`}
        onMenuPress={() => navigation.openDrawer()}
        right={<Button label="+ Add" size="sm" onPress={() => navigation.navigate('AddEditDoctor')} />}
      />

      <View style={styles.searchWrap}>
        <Text>🔍</Text>
        <TextInput
          style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search by name or specialization…" placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.tabsRow}>
        {(['all', 'Active', 'Inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f} style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f === 'all' ? 'All' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered} keyExtractor={(d) => d.id} renderItem={renderDoctor}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="🩺" title="No doctors found" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    margin: 16, marginBottom: 8, borderRadius: Layout.radius,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: Layout.radiusSm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Layout.radius, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 12, ...Layout.shadowSm,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  spec: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  reg: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { fontSize: 11, color: Colors.textLight },
  right: { alignItems: 'flex-end', gap: 6 },
  arrow: { fontSize: 22, color: Colors.textLight },
});
