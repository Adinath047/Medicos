import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={Colors.primary} />
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

export const EmptyState: React.FC<{
  icon: string; title: string; subtitle?: string; action?: React.ReactNode;
}> = ({ icon, title, subtitle, action }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    {action && <View style={{ marginTop: 16 }}>{action}</View>}
  </View>
);

export const SectionHeader: React.FC<{
  title: string; action?: React.ReactNode;
}> = ({ title, action }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action}
  </View>
);

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  message: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  icon: { fontSize: 48 },
  title: { fontSize: 17, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
});
