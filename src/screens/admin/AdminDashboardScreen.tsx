import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, TextInput,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useAuthStore } from '../../store/authStore';
import { AppHeader } from '../../components/common/AppHeader';
import { KPICard } from '../../components/common/KPICard';
import { Avatar } from '../../components/common/Avatar';
import { Badge, getStatusBadgeVariant } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/UIHelpers';
import {
  BEDS, PATIENTS, DOCTORS, APPOINTMENTS, REMINDERS, VITALS,
} from '../../data/mockData';
import { formatTime, formatDate, timeAgo, minutesSince } from '../../utils/formatters';
import { getBPColor, getHRColor, getSPO2Color } from '../../utils/vitalsColor';

const TODAY = new Date().toISOString().split('T')[0];

export default function AdminDashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [vitalFilter, setVitalFilter] = useState<'all' | 'overdue'>('overdue');

  const occupiedBeds = BEDS.filter((b) => b.status === 'Occupied');
  const availableBeds = BEDS.filter((b) => b.status === 'Available');
  const todayAppts = APPOINTMENTS.filter((a) => a.date === TODAY || a.status === 'Confirmed');
  const pendingReminders = REMINDERS.filter((r) => r.status === 'Pending');

  const vitalsDueBeds = occupiedBeds.map((bed) => {
    const lastVitals = VITALS
      .filter((v) => v.bedId === bed.id)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    const minsAgo = lastVitals ? minutesSince(lastVitals.recordedAt) : 9999;
    return { bed, lastVitals, minsAgo, isOverdue: minsAgo >= 30 };
  });

  const filteredVitalsDue = vitalFilter === 'overdue'
    ? vitalsDueBeds.filter((v) => v.isOverdue)
    : vitalsDueBeds;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const QuickActions = [
    { icon: '👤', label: 'Add Patient', onPress: () => navigation.navigate('AddEditPatient') },
    { icon: '🩺', label: 'Add Doctor', onPress: () => navigation.navigate('AdminDoctors') },
    { icon: '🛏️', label: 'Add Bed', onPress: () => navigation.navigate('AdminBeds') },
    { icon: '💊', label: 'Vitals Entry', onPress: () => navigation.navigate('VitalsEntry') },
    { icon: '🧾', label: 'Billing', onPress: () => navigation.navigate('AdminBilling') },
  ];

  return (
    <View style={styles.root}>
      <AppHeader
        title="Dashboard"
        subtitle={`Today: ${formatDate(new Date().toISOString())}`}
        onMenuPress={() => navigation.openDrawer()}
        right={
          <Avatar uri={user?.photoURL} name={user?.name ?? 'A'} size={36}
            onPress={() => navigation.navigate('AdminProfile')} />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── KPI Cards ── */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        <View style={styles.kpiRow}>
          <KPICard
            title="Total Doctors" value={DOCTORS.length}
            subtitle="Active staff"
            icon={<Text style={{ fontSize: 18 }}>🩺</Text>}
            color={Colors.green} colorBg={Colors.greenLight}
            trend="6.2%" trendPositive
          />
          <KPICard
            title="Total Patients" value={PATIENTS.length}
            subtitle="Registered"
            icon={<Text style={{ fontSize: 18 }}>👥</Text>}
            color={Colors.primary} colorBg={Colors.primaryLight}
            trend="18.9%" trendPositive
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="Beds Occupied" value={`${occupiedBeds.length}/${BEDS.length}`}
            subtitle={`${availableBeds.length} available`}
            icon={<Text style={{ fontSize: 18 }}>🛏️</Text>}
            color={Colors.warning} colorBg={Colors.warningBg}
          />
          <KPICard
            title="Appointments Today" value={todayAppts.length}
            subtitle="Scheduled"
            icon={<Text style={{ fontSize: 18 }}>📅</Text>}
            color={Colors.purple} colorBg={Colors.purpleLight}
            trend="5 pending" trendPositive
          />
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qaScroll}>
          {QuickActions.map((qa) => (
            <TouchableOpacity key={qa.label} style={styles.qaCard} onPress={qa.onPress} activeOpacity={0.7}>
              <Text style={styles.qaIcon}>{qa.icon}</Text>
              <Text style={styles.qaLabel}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Vitals Due Now ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>VITALS DUE NOW</Text>
          {pendingReminders.length > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{pendingReminders.length} overdue</Text>
            </View>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          {(['overdue', 'all'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, vitalFilter === f && styles.filterTabActive]}
              onPress={() => setVitalFilter(f)}
            >
              <Text style={[styles.filterTabText, vitalFilter === f && styles.filterTabTextActive]}>
                {f === 'overdue' ? '⚠️ Overdue Only' : '🛏️ All Occupied'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredVitalsDue.length === 0 ? (
          <View style={styles.emptyVitals}>
            <Text style={styles.emptyVitalsText}>✅ All vitals are up to date</Text>
          </View>
        ) : (
          filteredVitalsDue.map(({ bed, lastVitals, minsAgo, isOverdue }) => (
            <TouchableOpacity
              key={bed.id}
              style={[styles.vitalCard, isOverdue && styles.vitalCardOverdue]}
              onPress={() => navigation.navigate('VitalsEntry', { bedId: bed.id })}
              activeOpacity={0.75}
            >
              <View style={styles.vitalCardLeft}>
                <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={42} />
                <View style={styles.vitalInfo}>
                  <View style={styles.vitalRow1}>
                    <Text style={styles.vitalBed}>{bed.bedNumber}</Text>
                    <Text style={styles.vitalWard}>{bed.ward}</Text>
                  </View>
                  <Text style={styles.vitalPatient}>{bed.patientName}</Text>
                  <Text style={styles.vitalDoctor}>Dr: {bed.doctorName}</Text>
                </View>
              </View>
              <View style={styles.vitalCardRight}>
                {lastVitals ? (
                  <>
                    <Text style={[styles.vitalTime, isOverdue && { color: Colors.danger }]}>
                      {timeAgo(lastVitals.recordedAt)}
                    </Text>
                    <Text style={[styles.vitalBP, { color: getBPColor(lastVitals.bp_systolic) }]}>
                      {lastVitals.bp_systolic}/{lastVitals.bp_diastolic}
                    </Text>
                    <Text style={{ fontSize: 10, color: Colors.textMuted }}>BP</Text>
                  </>
                ) : (
                  <Text style={[styles.vitalTime, { color: Colors.danger }]}>No vitals!</Text>
                )}
                <View style={[styles.entryBtn]}>
                  <Text style={styles.entryBtnText}>Enter →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Today's Appointments ── */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>TODAY'S APPOINTMENTS</Text>
        {todayAppts.slice(0, 5).map((appt) => (
          <View key={appt.id} style={styles.apptRow}>
            <Avatar uri={appt.patientPhoto} name={appt.patientName} size={38} />
            <View style={styles.apptInfo}>
              <Text style={styles.apptPatient}>{appt.patientName}</Text>
              <Text style={styles.apptDoctor}>{appt.doctorName} · {appt.time}</Text>
            </View>
            <Badge label={appt.status} variant={getStatusBadgeVariant(appt.status)} />
          </View>
        ))}
        {todayAppts.length === 0 && (
          <Text style={styles.emptyVitalsText}>No appointments today.</Text>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, marginTop: 12, marginBottom: 4,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  // Quick Actions
  qaScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  qaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 90,
    ...Layout.shadowSm,
  },
  qaIcon: { fontSize: 24 },
  qaLabel: { fontSize: 11, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  // Alert badge
  alertBadge: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Layout.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  alertBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.danger },
  // Filter tabs
  filterTabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterTab: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: Layout.radiusSm, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  filterTabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  filterTabTextActive: { color: Colors.primary, fontWeight: '700' },
  // Empty
  emptyVitals: {
    backgroundColor: Colors.successBg,
    borderRadius: Layout.radiusSm,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  emptyVitalsText: { fontSize: 13, color: Colors.success, fontWeight: '500' },
  // Vitals card
  vitalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadowSm,
  },
  vitalCardOverdue: { borderColor: Colors.danger + '60', backgroundColor: Colors.dangerBg },
  vitalCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  vitalInfo: { flex: 1 },
  vitalRow1: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  vitalBed: { fontSize: 13, fontWeight: '700', color: Colors.text },
  vitalWard: { fontSize: 11, color: Colors.textMuted },
  vitalPatient: { fontSize: 14, fontWeight: '600', color: Colors.text },
  vitalDoctor: { fontSize: 12, color: Colors.textMuted },
  vitalCardRight: { alignItems: 'flex-end', gap: 2 },
  vitalTime: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  vitalBP: { fontSize: 16, fontWeight: '700' },
  entryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  entryBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textInverse },
  // Appointments
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusSm,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apptInfo: { flex: 1 },
  apptPatient: { fontSize: 14, fontWeight: '600', color: Colors.text },
  apptDoctor: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
