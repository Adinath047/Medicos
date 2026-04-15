import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { BEDS, VITALS, PATIENTS } from '../../data/mockData';
import { formatDate, timeAgo, minutesSince, formatBP } from '../../utils/formatters';
import {
  getBPColor, getHRColor, getTempColor, getSPO2Color, getSugarColor, getRRColor,
} from '../../utils/vitalsColor';

interface VitalsFormState {
  bp_systolic: string; bp_diastolic: string; heartRate: string;
  respRate: string; temperature: string; spo2: string;
  bloodSugar: string; notes: string;
}

const EMPTY_FORM: VitalsFormState = {
  bp_systolic: '', bp_diastolic: '', heartRate: '',
  respRate: '', temperature: '', spo2: '', bloodSugar: '', notes: '',
};

export default function VitalsEntryScreen({ navigation, route }: any) {
  const selectedBedId = route?.params?.bedId;
  const [selectedBed, setSelectedBed] = useState<string | null>(selectedBedId ?? null);
  const [form, setForm] = useState<VitalsFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const occupiedBeds = BEDS.filter((b) => b.status === 'Occupied');

  const getLastVitals = (bedId: string) =>
    VITALS.filter((v) => v.bedId === bedId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  const handleSave = async () => {
    if (!selectedBed) { Alert.alert('Select a bed first'); return; }
    const required = [form.bp_systolic, form.bp_diastolic, form.heartRate, form.temperature, form.spo2];
    if (required.some((f) => !f.trim())) {
      Alert.alert('Required Fields', 'Please fill BP, Heart Rate, Temperature, and SpO₂.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    Alert.alert('✅ Vitals Saved', 'Vitals recorded successfully. Reminder cleared.', [
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  const VField = ({
    label, field, unit, placeholder, color,
  }: { label: string; field: keyof VitalsFormState; unit?: string; placeholder?: string; color?: string }) => (
    <View style={styles.vField}>
      <Text style={styles.vLabel}>{label}</Text>
      <View style={[styles.vInputRow, color ? { borderColor: color } : {}]}>
        <TextInput
          style={styles.vInput}
          value={form[field]}
          onChangeText={(t) => setForm((f) => ({ ...f, [field]: t }))}
          keyboardType={field === 'notes' ? 'default' : 'decimal-pad'}
          placeholder={placeholder ?? '—'}
          placeholderTextColor={Colors.textLight}
        />
        {unit && <Text style={styles.vUnit}>{unit}</Text>}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Vitals Entry" subtitle="Occupied beds" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Bed selector ── */}
        <Text style={styles.sectionLabel}>SELECT BED</Text>
        {occupiedBeds.map((bed) => {
          const last = getLastVitals(bed.id);
          const mins = last ? minutesSince(last.recordedAt) : 9999;
          const overdue = mins >= 30;
          const active = selectedBed === bed.id;

          return (
            <TouchableOpacity
              key={bed.id}
              style={[styles.bedRow, active && styles.bedRowActive, overdue && styles.bedRowOverdue]}
              onPress={() => { setSelectedBed(bed.id); setForm(EMPTY_FORM); }}
              activeOpacity={0.75}
            >
              <Avatar uri={bed.patientPhoto} name={bed.patientName ?? '?'} size={44} />
              <View style={styles.bedInfo}>
                <View style={styles.bedTopRow}>
                  <Text style={styles.bedNum}>{bed.bedNumber}</Text>
                  <Text style={styles.bedWard}>{bed.ward}</Text>
                  {overdue && <View style={styles.overdueDot} />}
                </View>
                <Text style={styles.bedPatient}>{bed.patientName}</Text>
                <Text style={styles.bedDoctor}>{bed.doctorName}</Text>
              </View>
              <View style={styles.bedRight}>
                {last ? (
                  <>
                    <Text style={[styles.minsAgo, overdue && { color: Colors.danger }]}>
                      {timeAgo(last.recordedAt)}
                    </Text>
                    <Text style={[styles.lastBP, { color: getBPColor(last.bp_systolic) }]}>
                      {last.bp_systolic}/{last.bp_diastolic}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 11, color: Colors.danger, fontWeight: '600' }}>No vitals!</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Form ── */}
        {selectedBed && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>RECORD VITALS</Text>
            <View style={styles.formCard}>
              {/* BP row */}
              <Text style={styles.groupLabel}>Blood Pressure (mmHg) *</Text>
              <View style={styles.bpRow}>
                <View style={[styles.vField, { flex: 1 }]}>
                  <Text style={styles.vLabel}>Systolic</Text>
                  <View style={styles.vInputRow}>
                    <TextInput
                      style={styles.vInput} keyboardType="number-pad"
                      value={form.bp_systolic}
                      onChangeText={(t) => setForm((f) => ({ ...f, bp_systolic: t }))}
                      placeholder="120" placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>
                <Text style={styles.bpSep}>/</Text>
                <View style={[styles.vField, { flex: 1 }]}>
                  <Text style={styles.vLabel}>Diastolic</Text>
                  <View style={styles.vInputRow}>
                    <TextInput
                      style={styles.vInput} keyboardType="number-pad"
                      value={form.bp_diastolic}
                      onChangeText={(t) => setForm((f) => ({ ...f, bp_diastolic: t }))}
                      placeholder="80" placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.fieldsGrid}>
                <VField label="Heart Rate (bpm) *" field="heartRate" unit="bpm" placeholder="72" />
                <VField label="Resp. Rate (breaths/min)" field="respRate" unit="/min" placeholder="16" />
                <VField label="Temperature (°C) *" field="temperature" unit="°C" placeholder="37.0" />
                <VField label="SpO₂ (%) *" field="spo2" unit="%" placeholder="98" />
                <VField label="Blood Sugar (mg/dL)" field="bloodSugar" unit="mg/dL" placeholder="100" />
              </View>

              <View style={styles.vField}>
                <Text style={styles.vLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={form.notes}
                  onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                  placeholder="Any observations…"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Live preview */}
              {(form.bp_systolic || form.heartRate || form.spo2) && (
                <View style={styles.preview}>
                  <Text style={styles.previewTitle}>Preview</Text>
                  <View style={styles.previewRow}>
                    {form.bp_systolic && form.bp_diastolic && (
                      <View style={[styles.previewChip, { backgroundColor: getBPColor(+form.bp_systolic) + '15' }]}>
                        <Text style={[styles.previewVal, { color: getBPColor(+form.bp_systolic) }]}>
                          {form.bp_systolic}/{form.bp_diastolic}
                        </Text>
                        <Text style={styles.previewLabel}>BP</Text>
                      </View>
                    )}
                    {form.heartRate && (
                      <View style={[styles.previewChip, { backgroundColor: getHRColor(+form.heartRate) + '15' }]}>
                        <Text style={[styles.previewVal, { color: getHRColor(+form.heartRate) }]}>{form.heartRate}</Text>
                        <Text style={styles.previewLabel}>HR</Text>
                      </View>
                    )}
                    {form.spo2 && (
                      <View style={[styles.previewChip, { backgroundColor: getSPO2Color(+form.spo2) + '15' }]}>
                        <Text style={[styles.previewVal, { color: getSPO2Color(+form.spo2) }]}>{form.spo2}%</Text>
                        <Text style={styles.previewLabel}>SpO₂</Text>
                      </View>
                    )}
                    {form.temperature && (
                      <View style={[styles.previewChip, { backgroundColor: getTempColor(+form.temperature) + '15' }]}>
                        <Text style={[styles.previewVal, { color: getTempColor(+form.temperature) }]}>{form.temperature}°</Text>
                        <Text style={styles.previewLabel}>Temp</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Button label={saving ? 'Saving…' : 'Save Vitals'} onPress={handleSave} loading={saving} fullWidth size="lg" style={{ marginTop: 8 }} />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  bedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border,
    ...Layout.shadowSm,
  },
  bedRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  bedRowOverdue: { borderColor: Colors.danger + '60' },
  bedInfo: { flex: 1 },
  bedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  bedNum: { fontSize: 14, fontWeight: '700', color: Colors.text },
  bedWard: { fontSize: 11, color: Colors.textMuted },
  overdueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  bedPatient: { fontSize: 14, fontWeight: '600', color: Colors.text },
  bedDoctor: { fontSize: 12, color: Colors.textMuted },
  bedRight: { alignItems: 'flex-end', gap: 2 },
  minsAgo: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  lastBP: { fontSize: 15, fontWeight: '700' },
  formCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 14, ...Layout.shadow,
  },
  groupLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  bpRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bpSep: { fontSize: 24, color: Colors.textMuted, paddingBottom: 8 },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vField: { minWidth: '45%', flex: 1, gap: 5 },
  vLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  vInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  vInput: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  vUnit: { fontSize: 12, color: Colors.textMuted },
  notesInput: {
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 80,
  },
  preview: {
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm, padding: 12, gap: 8,
  },
  previewTitle: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  previewChip: { borderRadius: Layout.radiusSm, padding: 8, alignItems: 'center', minWidth: 60 },
  previewVal: { fontSize: 15, fontWeight: '700' },
  previewLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
});
