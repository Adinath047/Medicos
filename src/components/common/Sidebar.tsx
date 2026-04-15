import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from './Avatar';

interface SidebarItem {
  label: string;
  icon: string;
  screen: string;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, activeScreen, onNavigate }) => {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();

  const handleNav = (screen: string) => {
    onNavigate(screen);
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.brandName}>Medicos</Text>
      </View>

      {/* User info */}
      <View style={styles.userSection}>
        <Avatar uri={user?.photoURL} name={user?.name ?? 'User'} size={42} />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role === 'admin' ? 'Administrator' : 'Doctor'}</Text>
        </View>
      </View>

      {/* Nav items */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const isActive = activeScreen === item.screen;
          return (
            <TouchableOpacity
              key={item.screen}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleNav(item.screen)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutLabel}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: Colors.sidebar,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.textInverse,
    fontSize: 18,
    fontWeight: '800',
  },
  brandName: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Layout.radius,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  userRole: {
    color: Colors.sidebarText,
    fontSize: 11,
    marginTop: 1,
  },
  navList: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 2,
    borderRadius: Layout.radiusSm,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: Colors.sidebarActiveBg,
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  navIconActive: {},
  navLabel: {
    flex: 1,
    color: Colors.sidebarText,
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  navBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  navBadgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: Layout.radiusSm,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  logoutIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  logoutLabel: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
