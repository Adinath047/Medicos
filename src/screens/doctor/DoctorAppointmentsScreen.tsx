import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/UIHelpers';
import { APPOINTMENTS, DOCTORS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatters';

export default function DoctorAppointmentsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const doctor = DOCTORS.find((d) => d.email === user?.email) ?? DOCTORS[0];
  const myAppts = APPOINTMENTS.filter((a) => a.doctorId === doctor.id);

  return (
    <View style={styles.root}>
      <AppHeader title="Appointments" subtitle={`${myAppts.length} total`} onMenuPress={() => navigation.openDrawer()} />
      <FlatList
        data={myAppts} keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="📅" title="No appointments" />}
        renderItem={({ item: a }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Avatar uri={a.patientPhoto} name={a.patientName} size={44} />
              <View style={styles.info}>
                <Text style={styles.patient}>{a.patientName}</Text>
                <Text style={styles.reason}>{a.reason}</Text>
                <Text style={styles.datetime}>{formatDate(a.date)} at {a.time}</Text>
              </View>
              <Badge label={a.status} variant={getStatusBadgeVariant(a.status)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  patient: { fontSize: 15, fontWeight: '700', color: Colors.text },
  reason: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  datetime: { fontSize: 12, color: Colors.primary, marginTop: 2 },
});
