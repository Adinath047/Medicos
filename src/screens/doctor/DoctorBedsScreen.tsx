import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { BEDS, VITALS, DOCTORS } from '../../data/mockData';
import { useAuthStore } from '../../store/authStore';
import { timeAgo, minutesSince } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color } from '../../utils/vitalsColor';

export default function DoctorBedsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const doctor = DOCTORS.find((d) => d.email === user?.email) ?? DOCTORS[0];
  const myBeds = BEDS.filter((b) => b.doctorId === doctor.id && b.status === 'Occupied');

  const getLatestVitals = (bedId: string) =>
    VITALS.filter((v) => v.bedId === bedId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  return (
    <View style={styles.root}>
      <AppHeader title="My Beds & Vitals" subtitle={`${myBeds.length} occupied`} onMenuPress={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {myBeds.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛏️</Text>
            <Text style={styles.emptyText}>No beds assigned to you currently.</Text>
          </View>
        )}
        {myBeds.map((bed) => {
          const v = getLatestVitals(bed.id);
          const overdue = v ? minutesSince(v.recordedAt) >= 30 : true;
          return (
            <View key={bed.id} style={[styles.card, overdue && styles.cardOverdue]}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.bedNum}>🛏️ {bed.bedNumber}</Text>
                  <Text style={styles.bedWard}>{bed.ward} · {bed.type}</Text>
                </View>
                {overdue && (
                  <View style={styles.overduePill}>
                    <Text style={styles.overdueText}>⚠️ Vitals Overdue</Text>
                  </View>
                )}
              </View>
              <View style={styles.patientRow}>
                <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={44} />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{bed.patientName}</Text>
                  {v ? (
                    <View style={styles.vitalsRow}>
                      <Text style={[styles.vItem, { color: getBPColor(v.bp_systolic) }]}>
                        BP {v.bp_systolic}/{v.bp_diastolic}
                      </Text>
                      <Text style={[styles.vItem, { color: getHRColor(v.heartRate) }]}>HR {v.heartRate}</Text>
                      <Text style={[styles.vItem, { color: getSPO2Color(v.spo2) }]}>SpO₂ {v.spo2}%</Text>
                      <Text style={[styles.vTime, overdue && { color: Colors.danger }]}>
                        {timeAgo(v.recordedAt)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: Colors.danger, fontSize: 12, marginTop: 4 }}>No vitals recorded!</Text>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <Button label="View Patient" size="sm" variant="outline"
                  onPress={() => navigation.navigate('DoctorPatientDetail', { patientId: bed.patientId })} />
                <Button label="Enter Vitals" size="sm"
                  onPress={() => navigation.navigate('VitalsEntry', { bedId: bed.id })} />
              </View>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Layout.shadow,
  },
  cardOverdue: { borderColor: Colors.danger + '60' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bedNum: { fontSize: 16, fontWeight: '700', color: Colors.text },
  bedWard: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  overduePill: {
    backgroundColor: Colors.dangerBg, borderRadius: Layout.radiusFull,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.danger + '40',
  },
  overdueText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  vitalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  vItem: { fontSize: 12, fontWeight: '600' },
  vTime: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
});
