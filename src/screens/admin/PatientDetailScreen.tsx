import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Divider, SectionHeader } from '../../components/common/UIHelpers';
import {
  PATIENTS, DOCTORS, BEDS, VITALS, VISITS, PRESCRIPTIONS,
} from '../../data/mockData';
import { formatDate, formatDateTime, timeAgo, formatBP } from '../../utils/formatters';
import {
  getBPColor, getHRColor, getTempColor, getSPO2Color, getSugarColor,
} from '../../utils/vitalsColor';

export default function PatientDetailScreen({ navigation, route }: any) {
  const { patientId } = route.params;
  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return null;

  const bed = BEDS.find((b) => b.patientId === patientId && b.status === 'Occupied');
  const visits = VISITS.filter((v) => v.patientId === patientId);
  const prescriptions = PRESCRIPTIONS.filter((rx) => rx.patientId === patientId);
  const vitalsHistory = VITALS
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const latestVitals = vitalsHistory[0];

  const VitalChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <View style={[styles.vitalChip, { borderColor: color + '50', backgroundColor: color + '10' }]}>
      <Text style={[styles.vitalChipVal, { color }]}>{value}</Text>
      <Text style={styles.vitalChipLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader
        title="Patient Detail"
        showBack
        onBack={() => navigation.goBack()}
        right={
          <Button label="Rx" size="sm"
            onPress={() => navigation.navigate('AddPrescription', { patientId })}
          />
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Demographics ── */}
        <View style={styles.profileCard}>
          <Avatar uri={patient.photoURL} name={patient.name} size={72} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{patient.name}</Text>
            <Text style={styles.profileSub}>{patient.age} yrs · {patient.sex} · {patient.bloodGroup}</Text>
            <Text style={styles.profilePhone}>{patient.phone}</Text>
            {patient.allergies.length > 0 && (
              <View style={styles.allergyRow}>
                <Text style={styles.allergyLabel}>⚠️ Allergies: </Text>
                <Text style={styles.allergyVal}>{patient.allergies.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailVal}>{patient.email}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailVal}>{patient.address}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Emergency Contact</Text>
            <Text style={styles.detailVal}>
              {patient.emergencyContact.name} ({patient.emergencyContact.relation}) — {patient.emergencyContact.phone}
            </Text>
          </View>
        </View>

        {/* ── Current Bed ── */}
        {bed && (
          <>
            <SectionHeader title="Current Admission" />
            <View style={styles.bedCard}>
              <Text style={styles.bedNumber}>🛏️ Bed {bed.bedNumber}</Text>
              <Text style={styles.bedWard}>{bed.ward} · {bed.room} · {bed.type}</Text>
              <Text style={styles.bedDoctor}>Responsible: {bed.doctorName}</Text>
              <Text style={styles.bedSince}>Since {formatDate(bed.admittedAt ?? '')}</Text>
            </View>
          </>
        )}

        {/* ── Latest Vitals ── */}
        <SectionHeader
          title="Current Vitals"
          action={latestVitals ? <Text style={styles.vitalTime}>{timeAgo(latestVitals.recordedAt)}</Text> : null}
        />
        {latestVitals ? (
          <View style={styles.vitalsGrid}>
            <VitalChip label="BP" value={formatBP(latestVitals.bp_systolic, latestVitals.bp_diastolic)} color={getBPColor(latestVitals.bp_systolic)} />
            <VitalChip label="HR" value={`${latestVitals.heartRate}`} color={getHRColor(latestVitals.heartRate)} />
            <VitalChip label="Temp °C" value={`${latestVitals.temperature}`} color={getTempColor(latestVitals.temperature)} />
            <VitalChip label="SpO₂ %" value={`${latestVitals.spo2}`} color={getSPO2Color(latestVitals.spo2)} />
            <VitalChip label="Sugar" value={`${latestVitals.bloodSugar}`} color={getSugarColor(latestVitals.bloodSugar)} />
            <VitalChip label="RR" value={`${latestVitals.respRate}`} color={Colors.primary} />
          </View>
        ) : (
          <Text style={styles.noData}>No vitals recorded yet.</Text>
        )}

        {/* ── Vitals History ── */}
        <SectionHeader title="Vitals History" />
        {vitalsHistory.map((v) => (
          <View key={v.id} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historyTime}>{formatDateTime(v.recordedAt)}</Text>
              <Text style={styles.historyVals}>
                BP {v.bp_systolic}/{v.bp_diastolic} · HR {v.heartRate} · SpO₂ {v.spo2}% · Temp {v.temperature}°C
              </Text>
              {v.notes ? <Text style={styles.historyNotes}>{v.notes}</Text> : null}
            </View>
          </View>
        ))}

        {/* ── Visit History ── */}
        <SectionHeader title="Visit History" />
        {visits.length === 0 ? (
          <Text style={styles.noData}>No visits yet.</Text>
        ) : (
          visits.map((v) => (
            <View key={v.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitDoctor}>{v.doctorName}</Text>
                <Badge label={v.status} variant={getStatusBadgeVariant(v.status)} />
              </View>
              <Text style={styles.visitReason}>{v.reason}</Text>
              <Text style={styles.visitDiag}>Diagnosis: {v.diagnosis}</Text>
              <Text style={styles.visitDate}>
                {formatDate(v.admissionDate)}
                {v.dischargeDate ? ` → ${formatDate(v.dischargeDate)}` : ''}
              </Text>
            </View>
          ))
        )}

        {/* ── Prescriptions ── */}
        <SectionHeader
          title="Prescriptions"
          action={
            <Button label="+ Add Rx" size="sm"
              onPress={() => navigation.navigate('AddPrescription', { patientId })} />
          }
        />
        {prescriptions.length === 0 ? (
          <Text style={styles.noData}>No prescriptions yet.</Text>
        ) : (
          prescriptions.map((rx) => (
            <View key={rx.id} style={styles.rxCard}>
              <View style={styles.rxHeader}>
                <Text style={styles.rxDoctor}>{rx.doctorName}</Text>
                <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
              </View>
              <Text style={styles.rxBy}>Added by: {rx.createdByRole}</Text>
              {rx.medicines.map((m, i) => (
                <Text key={i} style={styles.rxMed}>
                  💊 {m.name} {m.strength} — {m.dose}, {m.frequency}, {m.duration}
                </Text>
              ))}
              {rx.advice ? (
                <Text style={styles.rxAdvice}>📋 {rx.advice}</Text>
              ) : null}
              {rx.hasFile && (
                <TouchableOpacity style={styles.rxFile}>
                  <Text style={styles.rxFileText}>📎 View Scanned Prescription</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 4 },
  // Profile
  profileCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusLg,
    padding: 20,
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadow,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.text },
  profileSub: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  profilePhone: { fontSize: 13, color: Colors.primary, marginTop: 4 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  allergyLabel: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  allergyVal: { fontSize: 12, color: Colors.warning },
  // Detail grid
  detailGrid: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailItem: { gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailVal: { fontSize: 13, color: Colors.text },
  // Bed
  bedCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Layout.radius,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
    gap: 3,
  },
  bedNumber: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  bedWard: { fontSize: 13, color: Colors.textSecondary },
  bedDoctor: { fontSize: 13, color: Colors.text },
  bedSince: { fontSize: 12, color: Colors.textMuted },
  // Vitals
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  vitalChip: {
    borderRadius: Layout.radiusSm,
    padding: 10,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  vitalChipVal: { fontSize: 16, fontWeight: '700' },
  vitalChipLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  vitalTime: { fontSize: 12, color: Colors.textMuted },
  noData: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  // History
  historyRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  historyDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, marginTop: 4, flexShrink: 0,
  },
  historyContent: { flex: 1 },
  historyTime: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  historyVals: { fontSize: 13, color: Colors.text, marginTop: 2 },
  historyNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  // Visit
  visitCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusSm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitDoctor: { fontSize: 14, fontWeight: '600', color: Colors.text },
  visitReason: { fontSize: 13, color: Colors.textSecondary },
  visitDiag: { fontSize: 13, color: Colors.primary },
  visitDate: { fontSize: 11, color: Colors.textMuted },
  // Prescription
  rxCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusSm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  rxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxDoctor: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rxDate: { fontSize: 12, color: Colors.textMuted },
  rxBy: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  rxMed: { fontSize: 13, color: Colors.text },
  rxAdvice: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  rxFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Layout.radiusSm,
    padding: 10,
    marginTop: 4,
  },
  rxFileText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
