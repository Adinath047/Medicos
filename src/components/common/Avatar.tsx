import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { getInitials } from '../../utils/formatters';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  onPress?: () => void;
  showEditIcon?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri, name, size = 48, onPress, showEditIcon = false,
}) => {
  const borderRadius = size / 2;
  const fontSize = size * 0.36;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.container, { width: size, height: size, borderRadius }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius }}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.initials, { width: size, height: size, borderRadius }]}>
            <Text style={[styles.initialsText, { fontSize }]}>{getInitials(name)}</Text>
          </View>
        )}
        {showEditIcon && (
          <View style={[styles.editBadge, { bottom: -2, right: -2 }]}>
            <Text style={styles.editIcon}>✏️</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    ...Layout.shadowSm,
  },
  initials: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.shadowSm,
  },
  editIcon: {
    fontSize: 10,
  },
});
