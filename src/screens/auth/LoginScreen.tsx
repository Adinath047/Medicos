import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Image,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';

const DEMO_CREDS = [
  { role: '🛡️ Admin', email: 'admin@medicos.app', password: 'Admin@123' },
  { role: '🩺 Doctor', email: 'dr.sharma@medicos.app', password: 'Doctor@123' },
  { role: '👤 Patient', email: 'patient@medicos.app', password: 'Patient@123' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@medicos.app');
  const [password, setPassword] = useState('Admin@123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    const ok = await login(email.trim(), password);
    if (!ok) setError('Invalid email or password. Try demo credentials below.');
  };

  const fillCred = (cred: typeof DEMO_CREDS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoChar}>M</Text>
          </View>
          <Text style={styles.appName}>Medicos</Text>
          <Text style={styles.tagline}>Hospital Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back 👋</Text>
          <Text style={styles.cardSubtitle}>Sign in to your dashboard</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPass}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Text>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            label={isLoading ? 'Signing in…' : 'Sign In'}
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Demo credential chips */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Credentials</Text>
          <View style={styles.demoChips}>
            {DEMO_CREDS.map((c) => (
              <TouchableOpacity
                key={c.role}
                style={styles.demoChip}
                onPress={() => fillCred(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.demoChipRole}>{c.role}</Text>
                <Text style={styles.demoChipEmail}>{c.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>© 2025 Medicos Health System</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 24 },
  logoWrap: { alignItems: 'center', gap: 8 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.shadow,
  },
  logoChar: { fontSize: 32, fontWeight: '800', color: Colors.textInverse },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusLg,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadow,
    gap: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  cardSubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: -8 },
  errorBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Layout.radiusSm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  errorText: { fontSize: 13, color: Colors.danger },
  fieldWrap: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgAlt,
    borderRadius: Layout.radiusSm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: { padding: 4 },
  demoSection: { gap: 12 },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  demoChip: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radiusSm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
    ...Layout.shadowSm,
  },
  demoChipRole: { fontSize: 13, fontWeight: '600', color: Colors.text },
  demoChipEmail: { fontSize: 10, color: Colors.textMuted },
  footer: { textAlign: 'center', fontSize: 12, color: Colors.textLight },
});
