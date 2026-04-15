import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { SectionHeader, Divider } from '../../components/common/UIHelpers';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { PATIENTS, VISITS, VITALS, PRESCRIPTIONS } from '../../data/mockData';
import { formatDate, formatDateTime, timeAgo, formatBP } from '../../utils/formatters';
import { getBPColor, getHRColor, getTempColor, getSPO2Color } from '../../utils/vitalsColor';

export default function DoctorPatientDetailScreen({ navigation, route }: any) {
  const { patientId } = route.params;
  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return null;

  const visits = VISITS.filter((v) => v.patientId === patientId);
  const vitalsHistory = VITALS
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const latestVitals = vitalsHistory[0];
  const prescriptions = PRESCRIPTIONS.filter((rx) => rx.patientId === patientId);

  const VChip = ({ label, value, color }: any) => (
    <View style={[styles.vChip, { backgroundColor: color + '10', borderColor: color + '40' }]}>
      <Text style={[styles.vChipVal, { color }]}>{value}</Text>
      <Text style={styles.vChipLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Patient"
        subtitle={patient.name}
        showBack onBack={() => navigation.goBack()}
        right={
          <Button label="+ Rx" size="sm"
            onPress={() => navigation.navigate('AddPrescription', { patientId })} />
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={styles.profileCard}>
          <Avatar uri={patient.photoURL} name={patient.name} size={64} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.sub}>{patient.age}y · {patient.sex} · {patient.bloodGroup}</Text>
            <Text style={styles.phone}>{patient.phone}</Text>
            {patient.allergies.length > 0 && (
              <Text style={styles.allergy}>⚠️ Allergies: {patient.allergies.join(', ')}</Text>
            )}
          </View>
        </View>

        {/* Latest Vitals */}
        <SectionHeader title="Latest Vitals" action={latestVitals ? <Text style={styles.timeAgo}>{timeAgo(latestVitals.recordedAt)}</Text> : null} />
        {latestVitals ? (
          <View style={styles.vitalsGrid}>
            <VChip label="BP" value={`${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`} color={getBPColor(latestVitals.bp_systolic)} />
            <VChip label="HR" value={latestVitals.heartRate} color={getHRColor(latestVitals.heartRate)} />
            <VChip label="Temp °C" value={latestVitals.temperature} color={getTempColor(latestVitals.temperature)} />
            <VChip label="SpO₂ %" value={latestVitals.spo2} color={getSPO2Color(latestVitals.spo2)} />
            <VChip label="Sugar" value={latestVitals.bloodSugar} color={Colors.primary} />
            <VChip label="RR" value={latestVitals.respRate} color={Colors.teal} />
          </View>
        ) : <Text style={styles.noData}>No vitals recorded.</Text>}

        {/* Visit History */}
        <SectionHeader title="Visit History" />
        {visits.map((v) => (
          <View key={v.id} style={styles.visitCard}>
            <View style={styles.visitRow}>
              <Text style={styles.visitDate}>{formatDate(v.admissionDate)}</Text>
              <Badge label={v.status} variant={getStatusBadgeVariant(v.status)} />
            </View>
            <Text style={styles.visitReason}>{v.reason}</Text>
            <Text style={styles.visitDiag}>Dx: {v.diagnosis}</Text>
          </View>
        ))}
        {visits.length === 0 && <Text style={styles.noData}>No visits recorded.</Text>}

        {/* Prescriptions */}
        <SectionHeader
          title="My Prescriptions"
          action={<Button label="+ Add Rx" size="sm" onPress={() => navigation.navigate('AddPrescription', { patientId })} />}
        />
        {prescriptions.map((rx) => (
          <View key={rx.id} style={styles.rxCard}>
            <View style={styles.rxRow}>
              <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
              <Text style={styles.rxBy}>{rx.createdByRole}</Text>
            </View>
            {rx.medicines.map((m, i) => (
              <Text key={i} style={styles.rxMed}>💊 {m.name} {m.strength} — {m.frequency}, {m.duration}</Text>
            ))}
            {rx.advice ? <Text style={styles.rxAdvice}>📋 {rx.advice}</Text> : null}
            {rx.hasFile && (
              <TouchableOpacity style={styles.fileBtn}>
                <Text style={styles.fileBtnText}>📎 View Scanned Rx</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {prescriptions.length === 0 && <Text style={styles.noData}>No prescriptions yet.</Text>}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 4 },
  profileCard: {
    flexDirection: 'row', gap: 14, backgroundColor: Colors.surface,
    borderRadius: Layout.radiusLg, padding: 18,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, ...Layout.shadow,
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  phone: { fontSize: 13, color: Colors.primary, marginTop: 4 },
  allergy: { fontSize: 12, color: Colors.warning, marginTop: 4 },
  timeAgo: { fontSize: 12, color: Colors.textMuted },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  vChip: {
    borderRadius: Layout.radiusSm, padding: 10, borderWidth: 1,
    minWidth: 82, alignItems: 'center',
  },
  vChipVal: { fontSize: 15, fontWeight: '700' },
  vChipLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  visitCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusSm,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  visitDate: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  visitReason: { fontSize: 13, color: Colors.text },
  visitDiag: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  rxCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusSm,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  rxRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rxDate: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  rxBy: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  rxMed: { fontSize: 13, color: Colors.text },
  rxAdvice: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  fileBtn: { backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusSm, padding: 8, marginTop: 4 },
  fileBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  noData: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
});
