import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/UIHelpers';
import { PATIENTS, DOCTORS, DOCTOR_PATIENT_LINKS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatters';

export default function DoctorPatientsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const doctor = DOCTORS.find((d) => d.email === user?.email) ?? DOCTORS[0];

  const linkedIds = DOCTOR_PATIENT_LINKS
    .filter((l) => l.doctorId === doctor.id && l.status === 'Active')
    .map((l) => l.patientId);
  const myPatients = PATIENTS.filter((p) =>
    linkedIds.includes(p.id) &&
    (!search.trim() || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <View style={styles.root}>
      <AppHeader title="My Patients" subtitle={`${linkedIds.length} assigned`} onMenuPress={() => navigation.openDrawer()} />
      <View style={styles.searchWrap}>
        <Text>🔍</Text>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search patients…" placeholderTextColor={Colors.textLight} />
      </View>
      <FlatList
        data={myPatients} keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="👥" title="No patients yet" subtitle="Patients will appear after appointments are booked." />}
        renderItem={({ item: p }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: p.id })} activeOpacity={0.75}>
            <Avatar uri={p.photoURL} name={p.name} size={48} />
            <View style={styles.info}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.sub}>{p.age}y · {p.sex} · {p.bloodGroup}</Text>
              <Text style={styles.last}>Last visit: {formatDate(p.lastVisit)}</Text>
            </View>
            <View style={styles.viewBtn}><Text style={styles.viewText}>View</Text></View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, margin: 16, marginBottom: 8,
    borderRadius: Layout.radius, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Layout.radius, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 12, ...Layout.shadowSm,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  last: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  viewBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusSm,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  viewText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
