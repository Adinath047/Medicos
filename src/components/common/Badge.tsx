import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'muted' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successBg, text: Colors.success },
  warning: { bg: Colors.warningBg, text: Colors.warning },
  danger:  { bg: Colors.dangerBg, text: Colors.danger },
  info:    { bg: Colors.infoBg, text: Colors.info },
  purple:  { bg: Colors.purpleLight, text: Colors.purple },
  muted:   { bg: Colors.bgAlt, text: Colors.textMuted },
  primary: { bg: Colors.primaryLight, text: Colors.primary },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'muted' }) => {
  const vs = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vs.bg }]}>
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
};

// Convenience helpers
export const getStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status.toLowerCase()) {
    case 'active': case 'confirmed': case 'paid': case 'available': case 'admitted': return 'success';
    case 'pending': case 'in_progress': case 'occupied': return 'warning';
    case 'cancelled': case 'inactive': case 'maintenance': return 'danger';
    case 'completed': case 'discharged': return 'info';
    case 'ready_for_checkout': return 'purple';
    default: return 'muted';
  }
};

export const formatBillingStatus = (status: string): string => {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'READY_FOR_CHECKOUT': return 'Ready for Checkout';
    case 'PAID': return 'Paid';
    default: return status;
  }
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Layout.radiusFull,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
