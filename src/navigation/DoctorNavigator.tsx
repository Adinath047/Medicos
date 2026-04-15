import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Sidebar } from '../components/common/Sidebar';

import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import DoctorPatientsScreen from '../screens/doctor/DoctorPatientsScreen';
import DoctorPatientDetailScreen from '../screens/doctor/DoctorPatientDetailScreen';
import DoctorBedsScreen from '../screens/doctor/DoctorBedsScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';
import AddPrescriptionScreen from '../screens/admin/AddPrescriptionScreen';
import VitalsEntryScreen from '../screens/admin/VitalsEntryScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const NAV_ITEMS = [
  { label: 'Home',        icon: '🏠', screen: 'DoctorDashboard' },
  { label: 'My Patients', icon: '👥', screen: 'DoctorPatients' },
  { label: 'Beds & Vitals', icon: '🛏️', screen: 'DoctorBeds' },
  { label: 'Appointments', icon: '📅', screen: 'DoctorAppointments' },
  { label: 'Profile',     icon: '👤', screen: 'DoctorProfile' },
];

function DoctorDrawerContent(props: any) {
  const active = props.state.routeNames[props.state.index];
  return (
    <Sidebar
      items={NAV_ITEMS}
      activeScreen={active}
      onNavigate={(screen) => props.navigation.navigate(screen)}
    />
  );
}

function DoctorDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DoctorDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 240, backgroundColor: Colors.sidebar },
      }}
    >
      <Drawer.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Drawer.Screen name="DoctorPatients" component={DoctorPatientsScreen} />
      <Drawer.Screen name="DoctorBeds" component={DoctorBedsScreen} />
      <Drawer.Screen name="DoctorAppointments" component={DoctorAppointmentsScreen} />
      <Drawer.Screen name="DoctorProfile" component={DoctorProfileScreen} />
    </Drawer.Navigator>
  );
}

export default function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorDrawer" component={DoctorDrawer} />
      <Stack.Screen name="DoctorPatientDetail" component={DoctorPatientDetailScreen} />
      <Stack.Screen name="AddPrescription" component={AddPrescriptionScreen} />
      <Stack.Screen name="VitalsEntry" component={VitalsEntryScreen} />
    </Stack.Navigator>
  );
}
