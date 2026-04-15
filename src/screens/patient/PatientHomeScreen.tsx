import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import {
  PATIENTS, APPOINTMENTS, VISITS, VITALS, BEDS,
} from '../../data/mockData';
import { formatDate, formatTime, timeAgo } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color } from '../../utils/vitalsColor';

export default function PatientHomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const patient = PATIENTS.find((p) => p.email === user?.email) ?? PATIENTS[0];
  const myAppts = APPOINTMENTS.filter((a) => a.patientId === patient.id);
  const nextAppt = myAppts.find((a) => a.status !== 'Cancelled' && a.status !== 'Completed') ?? myAppts[0];
  const lastVisit = VISITS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())[0];
  const latestVitals = VITALS.filter((v) => v.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const bed = BEDS.find((b) => b.patientId === patient.id && b.status === 'Occupied');

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={Colors.primary} />}
      >
        {/* Greeting header */}
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <Text style={styles.hello}>Hello, 👋</Text>
            <Text style={styles.patientName}>{patient.name.split(' ')[0]}</Text>
            <Text style={styles.date}>{formatDate(new Date().toISOString())}</Text>
          </View>
          <Avatar uri={patient.photoURL} name={patient.name} size={56}
            onPress={() => navigation.navigate('PatientProfile')} />
        </View>

        {/* Admission banner */}
        {bed && (
          <View style={styles.admitBanner}>
            <Text style={styles.admitIcon}>🏥</Text>
            <View style={styles.admitInfo}>
              <Text style={styles.admitTitle}>Currently Admitted</Text>
              <Text style={styles.admitSub}>Bed {bed.bedNumber} · {bed.ward} · {bed.doctorName}</Text>
            </View>
          </View>
        )}

        {/* Next appointment card */}
        <Text style={styles.sectionLabel}>NEXT APPOINTMENT</Text>
        {nextAppt ? (
          <TouchableOpacity
            style={styles.apptCard}
            onPress={() => navigation.navigate('PatientAppointments')}
            activeOpacity={0.8}
          >
            <View style={styles.apptCardLeft}>
              <View style={styles.apptDateBox}>
                <Text style={styles.apptDay}>
                  {new Date(nextAppt.date).toLocaleDateString('en-IN', { day: '2-digit' })}
                </Text>
                <Text style={styles.apptMonth}>
                  {new Date(nextAppt.date).toLocaleDateString('en-IN', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.apptInfo}>
                <Text style={styles.apptDoctor}>{nextAppt.doctorName}</Text>
                <Text style={styles.apptSpec}>{nextAppt.doctorSpecialization}</Text>
                <Text style={styles.apptTime}>⏰ {nextAppt.time}</Text>
                <Text style={styles.apptReason}>{nextAppt.reason}</Text>
              </View>
            </View>
            <Badge label={nextAppt.status} variant={getStatusBadgeVariant(nextAppt.status)} />
          </TouchableOpacity>
        ) : (
          <View style={styles.noApptCard}>
            <Text style={styles.noApptText}>No upcoming appointments</Text>
            <Button
              label="Book Now"
              size="sm"
              onPress={() => navigation.navigate('PatientAppointments')}
            />
          </View>
        )}

        {/* Latest vitals */}
        <Text style={styles.sectionLabel}>RECENT VITALS</Text>
        {latestVitals ? (
          <View style={styles.vitalsCard}>
            <View style={styles.vitalsHeader}>
              <Text style={styles.vitalsTitle}>Last Checkup</Text>
              <Text style={styles.vitalsTime}>{timeAgo(latestVitals.recordedAt)}</Text>
            </View>
            <View style={styles.vitalsGrid}>
              {[
                { label: 'BP', val: `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`, color: getBPColor(latestVitals.bp_systolic) },
                { label: 'HR', val: `${latestVitals.heartRate} bpm`, color: getHRColor(latestVitals.heartRate) },
                { label: 'SpO₂', val: `${latestVitals.spo2}%`, color: getSPO2Color(latestVitals.spo2) },
                { label: 'Temp', val: `${latestVitals.temperature}°C`, color: Colors.primary },
              ].map((v) => (
                <View key={v.label} style={styles.vitalItem}>
                  <Text style={[styles.vitalVal, { color: v.color }]}>{v.val}</Text>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>No vitals recorded yet.</Text>
        )}

        {/* Last visit */}
        <Text style={styles.sectionLabel}>LAST VISIT</Text>
        {lastVisit ? (
          <View style={styles.visitCard}>
            <View style={styles.visitRow}>
              <Text style={styles.visitDoctor}>{lastVisit.doctorName}</Text>
              <Badge label={lastVisit.status} variant={getStatusBadgeVariant(lastVisit.status)} />
            </View>
            <Text style={styles.visitDate}>{formatDate(lastVisit.admissionDate)}</Text>
            <Text style={styles.visitReason}>{lastVisit.reason}</Text>
            <Text style={styles.visitDiag}>Diagnosis: {lastVisit.diagnosis}</Text>
          </View>
        ) : (
          <Text style={styles.noData}>No visits yet.</Text>
        )}

        {/* Big CTA */}
        <Button
          label="📅  Book an Appointment"
          onPress={() => navigation.navigate('PatientAppointments')}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingTop: 56, gap: 4 },
  greeting: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  greetingText: { gap: 2 },
  hello: { fontSize: 14, color: Colors.textMuted },
  patientName: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  date: { fontSize: 12, color: Colors.textMuted },
  admitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radius,
    padding: 14, borderWidth: 1, borderColor: Colors.primaryMid, marginBottom: 12,
  },
  admitIcon: { fontSize: 28 },
  admitInfo: { flex: 1 },
  admitTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  admitSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  apptCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    ...Layout.shadow,
  },
  apptCardLeft: { flexDirection: 'row', gap: 14, flex: 1 },
  apptDateBox: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radius,
    padding: 10, alignItems: 'center', minWidth: 52,
    borderWidth: 1, borderColor: Colors.primaryMid,
  },
  apptDay: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  apptMonth: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  apptInfo: { flex: 1, gap: 3 },
  apptDoctor: { fontSize: 15, fontWeight: '700', color: Colors.text },
  apptSpec: { fontSize: 12, color: Colors.primary },
  apptTime: { fontSize: 12, color: Colors.textMuted },
  apptReason: { fontSize: 12, color: Colors.textSecondary },
  noApptCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  noApptText: { fontSize: 14, color: Colors.textMuted },
  vitalsCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 16, borderWidth: 1, borderColor: Colors.border, ...Layout.shadowSm,
  },
  vitalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vitalsTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  vitalsTime: { fontSize: 12, color: Colors.textMuted },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  vitalItem: { alignItems: 'center', gap: 4 },
  vitalVal: { fontSize: 17, fontWeight: '700' },
  vitalLabel: { fontSize: 11, color: Colors.textMuted },
  visitCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 5,
  },
  visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitDoctor: { fontSize: 14, fontWeight: '700', color: Colors.text },
  visitDate: { fontSize: 12, color: Colors.textMuted },
  visitReason: { fontSize: 13, color: Colors.textSecondary },
  visitDiag: { fontSize: 13, color: Colors.primary },
  noData: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
});
