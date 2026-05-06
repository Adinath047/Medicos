import React, { useState } from 'react';
import { useAuthStore } from './hooks/useAuthStore';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Avatar } from './components/Avatar';

// Pages
import LoginPage from './pages/LoginPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPatients from './pages/admin/AdminPatients';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminBeds from './pages/admin/AdminBeds';
import AdminVitals from './pages/admin/AdminVitals';
import AdminBilling from './pages/admin/AdminBilling';
import AdminPrescriptions from './pages/admin/AdminPrescriptions';
import PatientDetail from './pages/admin/PatientDetail';

// Doctor
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPatientDetail from './pages/doctor/DoctorPatientDetail';

// Patient
import PatientHome from './pages/patient/PatientHome';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientPrescriptions from './pages/patient/PatientPrescriptions';
import PatientBilling from './pages/patient/PatientBilling';
import PatientDoctors from './pages/patient/PatientDoctors';

// Super Admin
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminHospitals from './pages/superadmin/SuperAdminHospitals';
import SuperAdminDoctors from './pages/superadmin/SuperAdminDoctors';
import SuperAdminAdmins from './pages/superadmin/SuperAdminAdmins';

// Receptionist
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients';
import ReceptionistAppointments from './pages/receptionist/ReceptionistAppointments';
import ReceptionistCheckin from './pages/receptionist/ReceptionistCheckin';

// Shared
import ProfilePage from './pages/ProfilePage';
import MedicationSlip from './pages/MedicationSlip';

import { REMINDERS } from './data/mockData';

// ── Navigation Configs ──────────────────────────────────────────────────────────
const SUPER_ADMIN_NAV = [
  { label: 'Platform Overview', icon: '🌐', page: 'superadmin-dashboard' },
  { label: 'Hospitals',         icon: '🏥', page: 'superadmin-hospitals' },
  { label: 'Doctor Verification', icon: '🩺', page: 'superadmin-doctors' },
  { label: 'Admin Accounts',    icon: '🛡️', page: 'superadmin-admins' },
  { label: 'My Profile',        icon: '👤', page: 'profile' },
];

const ADMIN_NAV = [
  { label: 'Dashboard',     icon: '🏠', page: 'admin-dashboard' },
  { label: 'Patients',      icon: '👥', page: 'admin-patients' },
  { label: 'Doctors',       icon: '🩺', page: 'admin-doctors' },
  { label: 'Beds & Wards',  icon: '🛏️', page: 'admin-beds' },
  { label: 'Vitals Entry',  icon: '💊', page: 'admin-vitals' },
  { label: 'Billing',       icon: '🧾', page: 'admin-billing' },
  { label: 'Prescriptions', icon: '💉', page: 'admin-prescriptions' },
  { label: 'My Profile',    icon: '👤', page: 'profile' },
];

const DOCTOR_NAV = [
  { label: 'Dashboard',   icon: '🏠', page: 'doctor-dashboard' },
  { label: 'My Patients', icon: '👥', page: 'doctor-patients' },
  { label: 'My Profile',  icon: '👤', page: 'profile' },
];

const RECEPTIONIST_NAV = [
  { label: 'Dashboard',       icon: '🏠', page: 'receptionist-dashboard' },
  { label: 'Register Patient',icon: '👤', page: 'receptionist-patients' },
  { label: 'Appointments',    icon: '📅', page: 'receptionist-appointments' },
  { label: 'Check-in Queue',  icon: '✅', page: 'receptionist-checkin' },
  { label: 'My Profile',      icon: '👤', page: 'profile' },
];

const PATIENT_NAV = [
  { label: 'Home',          icon: '🏠', page: 'patient-home' },
  { label: 'Appointments',  icon: '📅', page: 'patient-appointments' },
  { label: 'Prescriptions', icon: '💊', page: 'patient-prescriptions' },
  { label: 'Billing',       icon: '🧾', page: 'patient-billing' },
  { label: 'Doctors',       icon: '🩺', page: 'patient-doctors' },
  { label: 'My Profile',    icon: '👤', page: 'profile' },
];

// Page titles map
const PAGE_TITLES: Record<string, string> = {
  // Super Admin
  'superadmin-dashboard':  'Platform Overview',
  'superadmin-hospitals':  'Hospital Registry',
  'superadmin-doctors':    'Doctor Verification',
  'superadmin-admins':     'Admin Accounts',
  // Hospital Admin
  'admin-dashboard':       'Dashboard',
  'admin-patients':        'Patients',
  'admin-doctors':         'Doctors',
  'admin-beds':            'Beds & Wards',
  'admin-vitals':          'Vitals Entry',
  'admin-billing':         'Billing',
  'admin-prescriptions':   'Prescriptions',
  'admin-patient-detail':  'Patient Detail',
  // Doctor
  'doctor-dashboard':      'Dashboard',
  'doctor-patients':       'My Patients',
  'doctor-patient-detail': 'Patient Detail',
  // Receptionist
  'receptionist-dashboard':     'Reception Dashboard',
  'receptionist-patients':      'Patient Registration',
  'receptionist-appointments':  'Appointments',
  'receptionist-checkin':       'Check-in Queue',
  // Patient
  'patient-home':          'My Health',
  'patient-appointments':  'Appointments',
  'patient-prescriptions': 'Prescriptions',
  'patient-billing':       'Billing',
  'patient-doctors':       'Our Doctors',
  // Shared
  'profile':               'My Profile',
  'medication-slip':       'Medication Slip',
};

const ROLE_SUBTITLES: Record<string, string> = {
  super_admin:   'National Platform Control',
  admin:         'Hospital Management System',
  doctor:        'Clinical Portal',
  receptionist:  'Reception Portal',
  patient:       'Patient Portal',
};

export default function App() {
  const { user, role, isLoading } = useAuthStore();
  const [page, setPage]           = useState<string>('');
  const [pageData, setPageData]   = useState<Record<string, unknown>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (newPage: string, data?: unknown) => {
    setPage(newPage);
    setPageData((data as Record<string, unknown>) ?? {});
  };

  // Loading spinner
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
          }}>M</div>
          <div className="spinner" />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Signing you in…</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) return <LoginPage />;

  // Default page per role
  const getDefaultPage = () => {
    switch (role) {
      case 'super_admin':  return 'superadmin-dashboard';
      case 'admin':        return 'admin-dashboard';
      case 'doctor':       return 'doctor-dashboard';
      case 'receptionist': return 'receptionist-dashboard';
      case 'patient':      return 'patient-home';
      default:             return 'admin-dashboard';
    }
  };

  const activePage    = page || getDefaultPage();
  const pendingBadge  = REMINDERS.filter(r => r.status === 'Pending').length;

  const navItems = (() => {
    switch (role) {
      case 'super_admin':
        return SUPER_ADMIN_NAV;
      case 'admin':
        return ADMIN_NAV.map(n =>
          n.page === 'admin-vitals' && pendingBadge > 0 ? { ...n, badge: pendingBadge } : n
        );
      case 'doctor':
        return DOCTOR_NAV;
      case 'receptionist':
        return RECEPTIONIST_NAV;
      default:
        return PATIENT_NAV;
    }
  })();

  const pageTitle    = PAGE_TITLES[activePage] ?? activePage;
  const roleSubtitle = ROLE_SUBTITLES[role ?? 'patient'] ?? 'Portal';

  const renderPage = () => {
    switch (activePage) {
      // ── Super Admin ─────────────────────────────────────────────────────────
      case 'superadmin-dashboard':  return <SuperAdminDashboard onNavigate={navigate} />;
      case 'superadmin-hospitals':  return <SuperAdminHospitals onNavigate={navigate} />;
      case 'superadmin-doctors':    return <SuperAdminDoctors onNavigate={navigate} />;
      case 'superadmin-admins':     return <SuperAdminAdmins onNavigate={navigate} />;

      // ── Hospital Admin ───────────────────────────────────────────────────────
      case 'admin-dashboard':      return <AdminDashboard onNavigate={navigate} />;
      case 'admin-patients':       return <AdminPatients onNavigate={navigate} />;
      case 'admin-doctors':        return <AdminDoctors onNavigate={navigate} />;
      case 'admin-beds':           return <AdminBeds onNavigate={navigate} />;
      case 'admin-vitals':         return <AdminVitals onNavigate={navigate} initialBedId={pageData.bedId as string} />;
      case 'admin-billing':        return <AdminBilling onNavigate={navigate} />;
      case 'admin-prescriptions':  return <AdminPrescriptions onNavigate={navigate} />;
      case 'admin-patient-detail': return <PatientDetail patientId={pageData.patientId as string} onNavigate={navigate} />;

      // ── Doctor ────────────────────────────────────────────────────────────────
      case 'doctor-dashboard':      return <DoctorDashboard onNavigate={navigate} />;
      case 'doctor-patients':       return <DoctorPatients onNavigate={navigate} />;
      case 'doctor-prescriptions':  return <AdminPrescriptions onNavigate={navigate} />;
      case 'doctor-patient-detail': return <DoctorPatientDetail patientId={pageData.patientId as string} onNavigate={navigate} />;

      // ── Receptionist ──────────────────────────────────────────────────────────
      case 'receptionist-dashboard':    return <ReceptionistDashboard onNavigate={navigate} />;
      case 'receptionist-patients':     return <ReceptionistPatients onNavigate={navigate} />;
      case 'receptionist-appointments': return <ReceptionistAppointments onNavigate={navigate} />;
      case 'receptionist-checkin':      return <ReceptionistCheckin onNavigate={navigate} />;

      // ── Patient ───────────────────────────────────────────────────────────────
      case 'patient-home':          return <PatientHome onNavigate={navigate} />;
      case 'patient-appointments':  return <PatientAppointments onNavigate={navigate} />;
      case 'patient-prescriptions': return <PatientPrescriptions onNavigate={navigate} />;
      case 'patient-billing':       return <PatientBilling onNavigate={navigate} />;
      case 'patient-doctors':       return <PatientDoctors onNavigate={navigate} />;

      // ── Shared ────────────────────────────────────────────────────────────────
      case 'profile':          return <ProfilePage onNavigate={navigate} />;
      case 'medication-slip':  return (
        <MedicationSlip
          prescriptionId={pageData.prescriptionId as string}
          slipId={pageData.slipId as string}
          onNavigate={navigate}
        />
      );

      default:
        return (
          <div className="page-scroll">
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <h3>Page not found</h3>
              <p>The page you're looking for doesn't exist.</p>
              <button className="btn btn-primary" onClick={() => navigate(getDefaultPage())}>
                Go Home
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        activePage={activePage}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <Topbar
          title={pageTitle}
          subtitle={roleSubtitle}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          actions={
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('profile')} title="My Profile">
              <Avatar
                uri={user.photoURL}
                name={user.name}
                size={36}
                onClick={() => navigate('profile')}
              />
            </div>
          }
        />
        {renderPage()}
      </div>
    </div>
  );
}
