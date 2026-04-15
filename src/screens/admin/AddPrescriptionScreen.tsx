import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
import { PATIENTS, DOCTORS, VISITS } from '../../data/mockData';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

interface Medicine {
  name: string; strength: string; dose: string; frequency: string; duration: string;
}

const EMPTY_MED: Medicine = { name: '', strength: '', dose: '', frequency: '', duration: '' };
const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 6 hours', 'At night', 'As needed'];

export default function AddPrescriptionScreen({ navigation, route }: any) {
  const { patientId } = route.params ?? {};
  const { user, role } = useAuthStore();

  const patient = PATIENTS.find((p) => p.id === patientId);
  const patientVisits = VISITS.filter((v) => v.patientId === patientId);

  const [selectedDoctorId, setSelectedDoctorId] = useState(
    role === 'doctor' ? (DOCTORS.find((d) => d.email === user?.email)?.id ?? DOCTORS[0].id) : DOCTORS[0].id
  );
  const [selectedVisitId, setSelectedVisitId] = useState(patientVisits[0]?.id ?? '');
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }]);
  const [advice, setAdvice] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasFile, setHasFile] = useState(false);

  const addMedicine = () => setMedicines((m) => [...m, { ...EMPTY_MED }]);
  const removeMedicine = (i: number) => setMedicines((m) => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Medicine, val: string) =>
    setMedicines((m) => m.map((med, idx) => idx === i ? { ...med, [field]: val } : med));

  const handleSave = async () => {
    const filled = medicines.filter((m) => m.name.trim());
    if (filled.length === 0) { Alert.alert('Add at least one medicine.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    Alert.alert('✅ Prescription Saved', 'Visible to Doctor and Patient.', [
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title="Add Prescription"
        subtitle={patient?.name}
        showBack onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Patient info banner */}
        {patient && (
          <View style={styles.patientBanner}>
            <Text style={styles.bannerName}>{patient.name}</Text>
            <Text style={styles.bannerSub}>{patient.age}y · {patient.sex} · {patient.bloodGroup}</Text>
          </View>
        )}

        {/* Doctor selector (admin only) */}
        {role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRESCRIBING DOCTOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {DOCTORS.filter((d) => d.status === 'Active').map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.selectorChip, selectedDoctorId === d.id && styles.selectorChipActive]}
                  onPress={() => setSelectedDoctorId(d.id)}
                >
                  <Text style={[styles.selectorText, selectedDoctorId === d.id && styles.selectorTextActive]}>
                    {d.name}
                  </Text>
                  <Text style={styles.selectorSpec}>{d.specialization}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Visit selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ATTACH TO VISIT</Text>
          {patientVisits.length === 0 ? (
            <Text style={styles.noData}>No visits found for this patient.</Text>
          ) : (
            patientVisits.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.visitChip, selectedVisitId === v.id && styles.visitChipActive]}
                onPress={() => setSelectedVisitId(v.id)}
              >
                <Text style={[styles.visitText, selectedVisitId === v.id && styles.visitTextActive]}>
                  {formatDate(v.admissionDate)} – {v.reason}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Medicines */}
        <View style={styles.section}>
          <View style={styles.medHeader}>
            <Text style={styles.sectionLabel}>MEDICINES</Text>
            <TouchableOpacity onPress={addMedicine} style={styles.addMedBtn}>
              <Text style={styles.addMedText}>+ Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {medicines.map((med, i) => (
            <View key={i} style={styles.medCard}>
              <View style={styles.medCardHeader}>
                <Text style={styles.medNum}>Medicine {i + 1}</Text>
                {medicines.length > 1 && (
                  <TouchableOpacity onPress={() => removeMedicine(i)}>
                    <Text style={{ color: Colors.danger, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.medRow}>
                <View style={[styles.medField, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>Drug Name *</Text>
                  <TextInput style={styles.fieldInput} value={med.name} onChangeText={(t) => updateMed(i, 'name', t)} placeholder="e.g. Aspirin" placeholderTextColor={Colors.textLight} />
                </View>
                <View style={[styles.medField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Strength</Text>
                  <TextInput style={styles.fieldInput} value={med.strength} onChangeText={(t) => updateMed(i, 'strength', t)} placeholder="75mg" placeholderTextColor={Colors.textLight} />
                </View>
              </View>

              <View style={styles.medRow}>
                <View style={styles.medField}>
                  <Text style={styles.fieldLabel}>Dose</Text>
                  <TextInput style={styles.fieldInput} value={med.dose} onChangeText={(t) => updateMed(i, 'dose', t)} placeholder="1 tablet" placeholderTextColor={Colors.textLight} />
                </View>
                <View style={styles.medField}>
                  <Text style={styles.fieldLabel}>Duration</Text>
                  <TextInput style={styles.fieldInput} value={med.duration} onChangeText={(t) => updateMed(i, 'duration', t)} placeholder="7 days" placeholderTextColor={Colors.textLight} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Frequency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqChip, med.frequency === f && styles.freqChipActive]}
                    onPress={() => updateMed(i, 'frequency', f)}
                  >
                    <Text style={[styles.freqText, med.frequency === f && styles.freqTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Advice */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADVICE / NOTES</Text>
          <TextInput
            style={styles.adviceInput}
            value={advice}
            onChangeText={setAdvice}
            placeholder="Dietary advice, precautions, follow-up instructions…"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Scan upload */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SCANNED PRESCRIPTION (OPTIONAL)</Text>
          <TouchableOpacity
            style={[styles.uploadBtn, hasFile && styles.uploadBtnActive]}
            onPress={() => { setHasFile(true); Alert.alert('File Picker', 'Camera/gallery will open here.'); }}
          >
            <Text style={styles.uploadIcon}>{hasFile ? '✅' : '📎'}</Text>
            <Text style={styles.uploadText}>
              {hasFile ? 'File attached — tap to change' : 'Tap to scan or upload (image / PDF)'}
            </Text>
          </TouchableOpacity>
        </View>

        <Button label={saving ? 'Saving…' : 'Save Prescription'} onPress={handleSave} loading={saving} fullWidth size="lg" />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 4 },
  patientBanner: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radius,
    padding: 14, borderWidth: 1, borderColor: Colors.primaryMid, marginBottom: 8,
  },
  bannerName: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  bannerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  selectorScroll: { marginHorizontal: -4 },
  selectorChip: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 12, marginRight: 8, borderWidth: 1, borderColor: Colors.border,
    minWidth: 130, alignItems: 'center',
  },
  selectorChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  selectorText: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  selectorTextActive: { color: Colors.primary },
  selectorSpec: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  visitChip: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusSm,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  visitChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  visitText: { fontSize: 13, color: Colors.text },
  visitTextActive: { color: Colors.primary, fontWeight: '600' },
  noData: { fontSize: 13, color: Colors.textMuted },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addMedBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusSm,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  addMedText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  medCard: {
    backgroundColor: Colors.surface, borderRadius: Layout.radius,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medNum: { fontSize: 13, fontWeight: '700', color: Colors.text },
  medRow: { flexDirection: 'row', gap: 10 },
  medField: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: {
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.text,
  },
  freqChip: {
    borderRadius: Layout.radiusFull, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.bgAlt, borderWidth: 1, borderColor: Colors.border, marginRight: 6,
  },
  freqChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  freqText: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  freqTextActive: { color: Colors.primary, fontWeight: '700' },
  adviceInput: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusSm,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, fontSize: 14, color: Colors.text, minHeight: 100,
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Layout.radius, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', padding: 18, backgroundColor: Colors.surface, justifyContent: 'center',
  },
  uploadBtnActive: { borderColor: Colors.green, backgroundColor: Colors.greenLight, borderStyle: 'solid' },
  uploadIcon: { fontSize: 22 },
  uploadText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
