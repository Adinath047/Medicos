import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;          // e.g. '+18.9%'
  trendPositive?: boolean;
  icon: React.ReactNode;
  color?: string;
  colorBg?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title, value, subtitle, trend, trendPositive, icon, color = Colors.primary, colorBg = Colors.primaryLight,
}) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.iconWrap, { backgroundColor: colorBg }]}>
        {icon}
      </View>
    </View>
    <Text style={[styles.value, { color }]}>{value}</Text>
    {(trend || subtitle) && (
      <View style={styles.bottomRow}>
        {trend && (
          <Text style={[styles.trend, { color: trendPositive ? Colors.success : Colors.danger }]}>
            {trendPositive ? '↑' : '↓'} {trend}
          </Text>
        )}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    padding: Layout.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadowSm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Layout.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
