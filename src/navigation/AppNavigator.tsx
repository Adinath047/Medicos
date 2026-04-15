import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';

import AuthStack from './AuthStack';
import AdminNavigator from './AdminNavigator';
import DoctorNavigator from './DoctorNavigator';
import PatientNavigator from './PatientNavigator';

export default function AppNavigator() {
  const { user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderNavigator = () => {
    if (!user) return <AuthStack />;
    switch (role) {
      case 'admin':   return <AdminNavigator />;
      case 'doctor':  return <DoctorNavigator />;
      case 'patient': return <PatientNavigator />;
      default:        return <AuthStack />;
    }
  };

  return (
    <NavigationContainer>
      {renderNavigator()}
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
