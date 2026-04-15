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
import { Divider } from '../../components/common/UIHelpers';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';

export default function DoctorProfileScreen({ navigation }: any) {
  const { user, logout, updatePhoto } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      updatePhoto(result.assets[0].uri);
      Alert.alert('✅ Photo updated!');
    }
  };

  const handleSave = () => {
    setEditing(false);
    Alert.alert('✅ Profile saved!');
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="My Profile" onMenuPress={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
            <Avatar uri={user?.photoURL} name={user?.name ?? 'D'} size={96} showEditIcon />
          </TouchableOpacity>
          <Text style={styles.tapHint}>Tap to change photo</Text>
          <Text style={styles.role}>🩺 Doctor</Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          <Divider />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
            ) : (
              <Text style={styles.fieldVal}>{user?.name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <Text style={styles.fieldVal}>{user?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <Text style={styles.fieldVal}>Doctor</Text>
          </View>

          {editing && (
            <Button label="Save Changes" onPress={handleSave} fullWidth style={{ marginTop: 8 }} />
          )}
        </View>

        {/* OPD Schedule placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OPD Schedule</Text>
          <Divider />
          {[
            { day: 'Monday', time: '9:00 AM – 1:00 PM' },
            { day: 'Wednesday', time: '9:00 AM – 1:00 PM' },
            { day: 'Friday', time: '2:00 PM – 6:00 PM' },
          ].map((s) => (
            <View key={s.day} style={styles.schedRow}>
              <Text style={styles.schedDay}>{s.day}</Text>
              <Text style={styles.schedTime}>{s.time}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <Button label="Logout" onPress={logout} variant="danger" fullWidth />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  tapHint: { fontSize: 12, color: Colors.textMuted },
  role: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 14, ...Layout.shadowSm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  editLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldVal: { fontSize: 15, color: Colors.text },
  fieldInput: {
    backgroundColor: Colors.bgAlt, borderRadius: Layout.radiusSm,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.text,
  },
  schedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  schedDay: { fontSize: 14, fontWeight: '600', color: Colors.text },
  schedTime: { fontSize: 13, color: Colors.textMuted },
});
