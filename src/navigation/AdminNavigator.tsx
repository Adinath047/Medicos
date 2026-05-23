import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Sidebar } from '../components/common/Sidebar';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminPatientsScreen from '../screens/admin/AdminPatientsScreen';
import PatientDetailScreen from '../screens/admin/PatientDetailScreen';
import AdminDoctorsScreen from '../screens/admin/AdminDoctorsScreen';
import AdminBedsScreen from '../screens/admin/AdminBedsScreen';
import VitalsEntryScreen from '../screens/admin/VitalsEntryScreen';
import AdminBillingScreen from '../screens/admin/AdminBillingScreen';
import BillingDetailScreen from '../screens/admin/BillingDetailScreen';
import AddPrescriptionScreen from '../screens/admin/AddPrescriptionScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '🏠', screen: 'AdminDashboard' },
  { label: 'Patients',     icon: '👥', screen: 'AdminPatients' },
  { label: 'Doctors',      icon: '🩺', screen: 'AdminDoctors' },
  { label: 'Beds & Vitals', icon: '🛏️', screen: 'AdminBeds', badge: 2 },
  { label: 'Billing',      icon: '🧾', screen: 'AdminBilling' },
  { label: 'Profile',      icon: '👤', screen: 'AdminProfile' },
];

// Drawer content (our custom Sidebar)
function AdminDrawerContent(props: any) {
  const active = props.state.routeNames[props.state.index];
  return (
    <Sidebar
      items={NAV_ITEMS}
      activeScreen={active}
      onNavigate={(screen: string) => props.navigation.navigate(screen)}
    />
  );
}

// Main drawer
function AdminDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 240, backgroundColor: Colors.sidebar },
      }}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Drawer.Screen name="AdminPatients" component={AdminPatientsScreen} />
      <Drawer.Screen name="AdminDoctors" component={AdminDoctorsScreen} />
      <Drawer.Screen name="AdminBeds" component={AdminBedsScreen} />
      <Drawer.Screen name="AdminBilling" component={AdminBillingScreen} />
      <Drawer.Screen name="AdminProfile" component={AdminProfileScreen} />
    </Drawer.Navigator>
  );
}

// Full admin navigator (drawer + modal/detail stack)
export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDrawer" component={AdminDrawer} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="BillingDetail" component={BillingDetailScreen} />
      <Stack.Screen name="VitalsEntry" component={VitalsEntryScreen} />
      <Stack.Screen name="AddPrescription" component={AddPrescriptionScreen} />
      {/* Placeholder screens until forms are built */}
      <Stack.Screen name="AddEditPatient" component={AdminPatientsScreen} />
      <Stack.Screen name="AddEditDoctor" component={AdminDoctorsScreen} />
      <Stack.Screen name="DoctorDetail" component={AdminDoctorsScreen} />
    </Stack.Navigator>
  );
}
