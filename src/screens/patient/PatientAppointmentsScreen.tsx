import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/UIHelpers';
import { APPOINTMENTS, PATIENTS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatters';

export default function PatientAppointmentsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const patient = PATIENTS.find((p) => p.email === user?.email) ?? PATIENTS[0];

  const all = APPOINTMENTS.filter((a) => a.patientId === patient.id);
  const upcoming = all.filter((a) => a.status === 'Pending' || a.status === 'Confirmed');
  const past = all.filter((a) => a.status === 'Completed' || a.status === 'Cancelled');
  const data = tab === 'upcoming' ? upcoming : past;

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment?', 'This action cannot be undone.', [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => Alert.alert('Cancelled') },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <Button
          label="+ Book"
          size="sm"
          onPress={() =>
            Alert.alert('Book Appointment', 'Choose a doctor from the Doctors tab.')
          }
        />
      </View>

      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            subtitle={tab === 'upcoming' ? 'Book from the Doctors tab.' : ''}
            action={
              tab === 'upcoming' ? (
                <Button label="Find a Doctor" size="sm" variant="outline"
                  onPress={() => navigation.navigate('PatientDoctors')} />
              ) : undefined
            }
          />
        }
        renderItem={({ item: a }) => (
          <View style={styles.card}>
            <View style={styles.dateStrip}>
              <Text style={styles.dateDay}>
                {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit' })}
              </Text>
              <Text style={styles.dateMon}>
                {new Date(a.date).toLocaleDateString('en-IN', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.docName}>{a.doctorName}</Text>
              <Text style={styles.spec}>{a.doctorSpecialization}</Text>
              <Text style={styles.time}>⏰ {a.time}</Text>
              <Text style={styles.reason}>{a.reason}</Text>
              <View style={styles.bottomRow}>
                <Badge label={a.status} variant={getStatusBadgeVariant(a.status)} />
                {a.status === 'Pending' || a.status === 'Confirmed' ? (
                  <TouchableOpacity onPress={() => handleCancel(a.id)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textInverse },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', gap: 14, backgroundColor: Colors.surface,
    borderRadius: Layout.radiusLg, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  dateStrip: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radius,
    padding: 10, alignItems: 'center', minWidth: 48,
    borderWidth: 1, borderColor: Colors.primaryMid,
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  dateMon: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  info: { flex: 1, gap: 3 },
  docName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  spec: { fontSize: 12, color: Colors.primary },
  time: { fontSize: 12, color: Colors.textMuted },
  reason: { fontSize: 12, color: Colors.textSecondary },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cancelText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
});
