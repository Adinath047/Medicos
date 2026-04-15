import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Divider } from '../../components/common/UIHelpers';
import { useAuthStore } from '../../store/authStore';
import { PATIENTS, DOCTORS, DOCTOR_PATIENT_LINKS } from '../../data/mockData';
import * as ImagePicker from 'expo-image-picker';

export default function PatientProfileScreen() {
  const { user, logout, updatePhoto } = useAuthStore();
  const [editing, setEditing] = useState(false);

  const patient = PATIENTS.find((p) => p.email === user?.email) ?? PATIENTS[0];
  const consultedDoctorIds = [...new Set(DOCTOR_PATIENT_LINKS.filter((l) => l.patientId === patient.id).map((l) => l.doctorId))];
  const consultedDoctors = DOCTORS.filter((d) => consultedDoctorIds.includes(d.id));

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      updatePhoto(result.assets[0].uri);
      Alert.alert('✅ Photo updated!');
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
            <Avatar uri={patient.photoURL} name={patient.name} size={88} showEditIcon />
          </TouchableOpacity>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.roleTag}>👤 Patient</Text>
        </View>

        {/* Personal Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Info</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          <Divider />
          <InfoRow label="Age" value={`${patient.age} years`} />
          <InfoRow label="Sex" value={patient.sex} />
          <InfoRow label="Blood Group" value={patient.bloodGroup} />
          <InfoRow label="Date of Birth" value={patient.dob} />
          <InfoRow label="Phone" value={patient.phone} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Address" value={patient.address} />
          {editing && (
            <Button label="Save Changes" onPress={() => { setEditing(false); Alert.alert('✅ Saved!'); }} fullWidth style={{ marginTop: 4 }} />
          )}
        </View>

        {/* Allergies */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Allergies</Text>
          <Divider />
          {patient.allergies.length === 0 ? (
            <Text style={styles.noData}>No known allergies</Text>
          ) : (
            <View style={styles.tagRow}>
              {patient.allergies.map((a) => (
                <View key={a} style={styles.allergyTag}>
                  <Text style={styles.allergyTagText}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Emergency Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚨 Emergency Contact</Text>
          <Divider />
          <InfoRow label="Name" value={patient.emergencyContact.name} />
          <InfoRow label="Relation" value={patient.emergencyContact.relation} />
          <InfoRow label="Phone" value={patient.emergencyContact.phone} />
        </View>

        {/* Consulted Doctors */}
        {consultedDoctors.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Doctors</Text>
            <Divider />
            {consultedDoctors.map((d) => (
              <View key={d.id} style={styles.doctorRow}>
                <Avatar uri={d.photoURL} name={d.name} size={38} />
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{d.name}</Text>
                  <Text style={styles.doctorSpec}>{d.specialization}</Text>
                </View>
                <TouchableOpacity style={styles.rebookBtn}
                  onPress={() => Alert.alert('Rebook', `Book another appointment with ${d.name}?`)}>
                  <Text style={styles.rebookText}>Rebook</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Button label="Log Out" onPress={logout} variant="danger" fullWidth />
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingTop: 56, gap: 14 },
  avatarSection: { alignItems: 'center', gap: 8 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  roleTag: { fontSize: 13, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 10, ...Layout.shadowSm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  editLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  infoVal: { fontSize: 13, color: Colors.text, fontWeight: '500', flex: 1.5, textAlign: 'right' },
  noData: { fontSize: 13, color: Colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyTag: {
    backgroundColor: Colors.warningBg, borderRadius: Layout.radiusFull,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.warning + '50',
  },
  allergyTagText: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  doctorSpec: { fontSize: 12, color: Colors.textMuted },
  rebookBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: Layout.radiusSm,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  rebookText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
