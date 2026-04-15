import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
  right?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title, subtitle, onMenuPress, right, showBack, onBack,
}) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={showBack ? onBack : onMenuPress}
      style={styles.menuBtn}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{showBack ? '←' : '☰'}</Text>
    </TouchableOpacity>

    <View style={styles.titleWrap}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </View>

    {right ? <View style={styles.right}>{right}</View> : <View style={styles.placeholder} />}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Layout.shadowSm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgAlt,
  },
  menuIcon: { fontSize: 18 },
  titleWrap: { flex: 1, paddingHorizontal: 12 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },
  placeholder: { width: 40 },
});
