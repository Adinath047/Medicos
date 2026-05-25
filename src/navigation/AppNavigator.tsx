import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';

import AdminNavigator from './AdminNavigator';
import DoctorNavigator from './DoctorNavigator';
import PatientNavigator from './PatientNavigator';

export default function AppNavigator() {
  // Directly render the AdminNavigator as authentication is removed.
  return (
    <NavigationContainer>
      <AdminNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});
