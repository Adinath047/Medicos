import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { useAuthStore } from '../../store/authStore';
import {
  DOCTORS, PATIENTS, VISITS, VITALS, APPOINTMENTS, DOCTOR_PATIENT_LINKS,
} from '../../data/mockData';
import { formatDate, timeAgo } from '../../utils/formatters';
import {
  getBPColor, getHRColor, getTempColor, getSPO2Color, isCriticalPatient,
} from '../../utils/vitalsColor';

export default function DoctorDashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [patientFilter, setPatientFilter] = useState<'today' | 'week' | 'all'>('week');

  // Find current doctor record
  const doctor = DOCTORS.find((d) => d.email === user?.email) ?? DOCTORS[0];

  // Patients linked to this doctor
  const linkedIds = DOCTOR_PATIENT_LINKS
    .filter((l) => l.doctorId === doctor.id && l.status === 'Active')
    .map((l) => l.patientId);
  const myPatients = PATIENTS.filter((p) => linkedIds.includes(p.id));

  // Latest vitals for each patient
  const getLatestVitals = (patientId: string) =>
    VITALS.filter((v) => v.patientId === patientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  // Critical patients (vitals thresholds)
  const criticalPatients = myPatients.filter((p) => {
    const v = getLatestVitals(p.id);
    return v && isCriticalPatient(v);
  });

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  const VitalDot = ({ value, color }: { value: string; color: string }) => (
    <View style={[styles.vDot, { backgroundColor: color + '20', borderColor: color + '60' }]}>
      <Text style={[styles.vDotText, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="My Dashboard"
        subtitle={`Dr. ${doctor.name.replace('Dr. ', '')} · ${doctor.specialization}`}
        onMenuPress={() => navigation.openDrawer()}
        right={
          <Avatar uri={user?.photoURL} name={user?.name ?? 'D'} size={36}
            onPress={() => navigation.navigate('DoctorProfile')} />
        }
      />

      <ScrollView
        style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Critical Patients ── */}
        {criticalPatients.length > 0 && (
          <>
            <View style={styles.criticalHeader}>
              <View style={styles.criticalDot} />
              <Text style={styles.criticalTitle}>Critical Patients</Text>
              <Text style={styles.criticalCount}>{criticalPatients.length}</Text>
            </View>
            {criticalPatients.map((p) => {
              const v = getLatestVitals(p.id)!;
              return (
                <TouchableOpacity
                  key={p.id} style={styles.criticalCard}
                  onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: p.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.criticalTop}>
                    <Avatar uri={p.photoURL} name={p.name} size={46} />
                    <View style={styles.criticalInfo}>
                      <Text style={styles.criticalName}>{p.name}</Text>
                      <Text style={styles.criticalSub}>{p.age}y · {p.sex}</Text>
                    </View>
                    <View style={styles.criticalBadge}>
                      <Text style={styles.criticalBadgeText}>🔴 Critical</Text>
                    </View>
                  </View>
                  <View style={styles.criticalVitals}>
                    <VitalDot value={`${v.bp_systolic}/${v.bp_diastolic}`} color={getBPColor(v.bp_systolic)} />
                    <VitalDot value={`HR ${v.heartRate}`} color={getHRColor(v.heartRate)} />
                    <VitalDot value={`SpO₂ ${v.spo2}%`} color={getSPO2Color(v.spo2)} />
                    <VitalDot value={`${v.temperature}°C`} color={getTempColor(v.temperature)} />
                    <Text style={styles.criticalTime}>{timeAgo(v.recordedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── My Patients ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>MY PATIENTS</Text>
          <View style={styles.filterPills}>
            {(['today', 'week', 'all'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, patientFilter === f && styles.pillActive]}
                onPress={() => setPatientFilter(f)}
              >
                <Text style={[styles.pillText, patientFilter === f && styles.pillTextActive]}>
                  {f === 'today' ? 'Today' : f === 'week' ? '7 Days' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {myPatients.length === 0 ? (
          <Text style={styles.noData}>No patients assigned yet.</Text>
        ) : (
          myPatients.map((p) => {
            const v = getLatestVitals(p.id);
            const visit = VISITS.filter((vis) => vis.patientId === p.id && vis.doctorId === doctor.id)
              .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())[0];
            return (
              <TouchableOpacity
                key={p.id} style={styles.patientCard}
                onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: p.id })}
                activeOpacity={0.75}
              >
                <Avatar uri={p.photoURL} name={p.name} size={46} />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{p.name}</Text>
                  <Text style={styles.patientSub}>{p.age}y · {p.sex}</Text>
                  {visit && (
                    <Text style={styles.patientVisit}>
                      Last: {formatDate(visit.admissionDate)} — {visit.reason}
                    </Text>
                  )}
                  {v && (
                    <Text style={styles.patientVitals}>
                      <Text style={{ color: getBPColor(v.bp_systolic) }}>BP {v.bp_systolic}/{v.bp_diastolic}</Text>
                      {'  '}
                      <Text style={{ color: getHRColor(v.heartRate) }}>HR {v.heartRate}</Text>
                      {'  '}
                      <Text style={{ color: getSPO2Color(v.spo2) }}>SpO₂ {v.spo2}%</Text>
                    </Text>
                  )}
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Today's Appointments ── */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>TODAY'S APPOINTMENTS</Text>
        {APPOINTMENTS.filter((a) => a.doctorId === doctor.id && a.status !== 'Cancelled')
          .slice(0, 4)
          .map((appt) => (
            <View key={appt.id} style={styles.apptRow}>
              <Avatar uri={appt.patientPhoto} name={appt.patientName} size={38} />
              <View style={styles.apptInfo}>
                <Text style={styles.apptPatient}>{appt.patientName}</Text>
                <Text style={styles.apptDetail}>{appt.time} · {appt.reason}</Text>
              </View>
              <Badge label={appt.status} variant={getStatusBadgeVariant(appt.status)} />
            </View>
          ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  filterPills: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Layout.radiusFull,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  pillTextActive: { color: Colors.primary },
  // Critical
  criticalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerBg, borderRadius: Layout.radiusSm,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.danger + '40',
  },
  criticalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  criticalTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.danger, textTransform: 'uppercase', letterSpacing: 0.5 },
  criticalCount: { fontSize: 16, fontWeight: '800', color: Colors.danger },
  criticalCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 8, borderWidth: 1.5,
    borderColor: Colors.danger + '50', ...Layout.shadowSm,
  },
  criticalTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  criticalInfo: { flex: 1 },
  criticalName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  criticalSub: { fontSize: 12, color: Colors.textMuted },
  criticalBadge: {
    backgroundColor: Colors.dangerBg, borderRadius: Layout.radiusSm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  criticalBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  criticalVitals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  criticalTime: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  vDot: {
    borderRadius: Layout.radiusSm, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  vDotText: { fontSize: 12, fontWeight: '600' },
  // Patients
  patientCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Layout.radius, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border, gap: 12, ...Layout.shadowSm,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  patientSub: { fontSize: 12, color: Colors.textMuted },
  patientVisit: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  patientVitals: { fontSize: 12, marginTop: 4 },
  arrow: { fontSize: 22, color: Colors.textLight },
  noData: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', padding: 20 },
  // Appointments
  apptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Layout.radiusSm,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  apptInfo: { flex: 1 },
  apptPatient: { fontSize: 14, fontWeight: '600', color: Colors.text },
  apptDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
