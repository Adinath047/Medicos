import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { PRESCRIPTIONS, PATIENTS, VISITS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatters';
import { EmptyState } from '../../components/common/UIHelpers';

export default function PatientPrescriptionsScreen() {
  const { user } = useAuthStore();
  const patient = PATIENTS.find((p) => p.email === user?.email) ?? PATIENTS[0];
  const myRx = PRESCRIPTIONS.filter((rx) => rx.patientId === patient.id);

  const getVisit = (visitId: string) => VISITS.find((v) => v.id === visitId);

  if (myRx.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Prescriptions</Text>
        </View>
        <EmptyState icon="💊" title="No prescriptions yet" subtitle="Your prescriptions will appear here after your doctor visit." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Prescriptions</Text>
        <Text style={styles.subtitle}>{myRx.length} prescriptions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {myRx.map((rx) => {
          const visit = getVisit(rx.visitId);
          return (
            <View key={rx.id} style={styles.rxCard}>
              {/* Header */}
              <View style={styles.rxHeader}>
                <View style={styles.rxHeaderLeft}>
                  <Text style={styles.rxDoctor}>{rx.doctorName}</Text>
                  <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
                  {visit && (
                    <Text style={styles.rxVisit}>Visit: {visit.reason}</Text>
                  )}
                </View>
                <View style={styles.rxByBadge}>
                  <Text style={styles.rxByText}>{rx.createdByRole}</Text>
                </View>
              </View>

              {/* Medicines */}
              <View style={styles.medsSection}>
                <Text style={styles.medsTitle}>💊 Medicines</Text>
                {rx.medicines.map((m, i) => (
                  <View key={i} style={styles.medRow}>
                    <View style={styles.medBullet} />
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{m.name} <Text style={styles.medStrength}>{m.strength}</Text></Text>
                      <Text style={styles.medDetail}>{m.dose} · {m.frequency} · {m.duration}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Advice */}
              {rx.advice ? (
                <View style={styles.adviceSection}>
                  <Text style={styles.adviceTitle}>📋 Doctor's Advice</Text>
                  <Text style={styles.adviceText}>{rx.advice}</Text>
                </View>
              ) : null}

              {/* Scanned file */}
              {rx.hasFile && (
                <TouchableOpacity style={styles.fileBtn}>
                  <Text style={styles.fileIcon}>📎</Text>
                  <Text style={styles.fileText}>View Scanned Prescription</Text>
                  <Text style={styles.fileArrow}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  rxCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
    overflow: 'hidden', ...Layout.shadow,
  },
  rxHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryMid,
  },
  rxHeaderLeft: { flex: 1 },
  rxDoctor: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  rxDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rxVisit: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  rxByBadge: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusFull,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  rxByText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  medsSection: { padding: 14, gap: 10 },
  medsTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  medRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  medBullet: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.primary, marginTop: 5,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  medStrength: { fontSize: 12, color: Colors.textMuted, fontWeight: '400' },
  medDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  adviceSection: {
    backgroundColor: Colors.bgAlt, padding: 14,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: 6,
  },
  adviceTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  adviceText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, padding: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  fileIcon: { fontSize: 18 },
  fileText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  fileArrow: { fontSize: 20, color: Colors.textLight },
});
