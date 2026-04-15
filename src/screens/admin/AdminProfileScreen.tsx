import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { AppHeader } from '../../components/common/AppHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Divider } from '../../components/common/UIHelpers';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';

export default function AdminProfileScreen({ navigation }: any) {
  const { user, logout, updatePhoto } = useAuthStore();

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

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Admin Profile" onMenuPress={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
            <Avatar uri={user?.photoURL} name={user?.name ?? 'Admin'} size={96} showEditIcon />
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>🛡️ Administrator</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <Divider />
          <View style={styles.row}><Text style={styles.lbl}>Email</Text><Text style={styles.val}>{user?.email}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Role</Text><Text style={styles.val}>System Admin</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Access</Text><Text style={styles.val}>Full Access</Text></View>
        </View>
        <Button label="Logout" onPress={logout} variant="danger" fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text },
  role: { fontSize: 14, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface, borderRadius: Layout.radiusLg,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 12, ...Layout.shadowSm,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  lbl: { fontSize: 13, color: Colors.textMuted },
  val: { fontSize: 13, color: Colors.text, fontWeight: '500' },
});
