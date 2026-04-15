import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variantMap: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.primary, text: Colors.textInverse },
  outline: { bg: 'transparent', text: Colors.primary, border: Colors.primary },
  ghost:   { bg: Colors.bgAlt, text: Colors.text },
  danger:  { bg: Colors.danger, text: Colors.textInverse },
  success: { bg: Colors.green, text: Colors.textInverse },
};

const sizeMap = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 13, borderRadius: Layout.radiusSm },
  md: { paddingVertical: 10, paddingHorizontal: 18, fontSize: 14, borderRadius: Layout.radius },
  lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, borderRadius: Layout.radiusLg },
};

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', loading = false,
  disabled = false, icon, style, textStyle, fullWidth = false, size = 'md',
}) => {
  const vs = variantMap[variant];
  const ss = sizeMap[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[
        styles.btn,
        {
          backgroundColor: vs.bg,
          paddingVertical: ss.paddingVertical,
          paddingHorizontal: ss.paddingHorizontal,
          borderRadius: ss.borderRadius,
          borderWidth: vs.border ? 1.5 : 0,
          borderColor: vs.border,
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: vs.text, fontSize: ss.fontSize }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Layout.shadowSm,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
