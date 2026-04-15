import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import PatientDoctorsScreen from '../screens/patient/PatientDoctorsScreen';
import PatientAppointmentsScreen from '../screens/patient/PatientAppointmentsScreen';
import PatientPrescriptionsScreen from '../screens/patient/PatientPrescriptionsScreen';
import PatientBillingScreen from '../screens/patient/PatientBillingScreen';
import PatientProfileScreen from '../screens/patient/PatientProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Doctors: '🩺',
  Appointments: '📅',
  Prescriptions: '💊',
  Billing: '🧾',
  Profile: '👤',
};

export default function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Layout.bottomNavHeight + (Platform.OS === 'ios' ? 20 : 0),
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={PatientHomeScreen} />
      <Tab.Screen name="Doctors" component={PatientDoctorsScreen} />
      <Tab.Screen name="Appointments" component={PatientAppointmentsScreen} />
      <Tab.Screen name="Prescriptions" component={PatientPrescriptionsScreen} />
      <Tab.Screen name="Billing" component={PatientBillingScreen} />
      <Tab.Screen name="Profile" component={PatientProfileScreen} />
    </Tab.Navigator>
  );
}
