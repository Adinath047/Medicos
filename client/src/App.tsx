// client/src/App.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useSync } from './sync/useSync';

// Pages
import AdminPortal from './pages/AdminPortal';
import PatientsPage from './pages/PatientsPage';
import PatientDetail from './pages/PatientDetail';
import NewEncounter from './pages/NewEncounter';
import EncountersListPage from './pages/EncountersListPage';
import PrescriptionPage from './pages/PrescriptionPage';
import PrescriptionsListPage from './pages/PrescriptionsListPage';
import VitalsPage from './pages/VitalsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import BillingPage from './pages/BillingPage';
import PharmacyBillingPage from './pages/PharmacyBillingPage';
import SettingsPage from './pages/SettingsPage';
import FrontDeskDashboard from './pages/FrontDeskDashboard';
import LoginPage from './pages/LoginPage';

// ── SVG Icons ─────────────────────────────────────────────────────────
const Icons: Record<string, JSX.Element> = {
  patients:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  prescription:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  encounters:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  appointments:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  billing:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  staff:         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  pharmacy: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  vitals:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  dashboard:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
};

// NAV is now a function so it can read staff_type for receptionists
function getNav(user: any) {
  if (user?.role === 'admin') return [
    { icon: 'staff', label: 'Staff Management', page: 'settings' },
  ];
  if (user?.role === 'doctor') return [
    { icon: 'patients',     label: 'My Patients',    page: 'patients' },
    { section: 'Clinical' },
    { icon: 'prescription', label: 'Prescriptions',  page: 'prescriptions' },
    { icon: 'encounters',   label: 'Encounters',     page: 'encounters' },
    { icon: 'vitals',       label: 'Vitals',         page: 'vitals' },
    { icon: 'appointments', label: 'Appointments',   page: 'appointments' },
  ];
  if (user?.role === 'pharmacist') return [
    { icon: 'pharmacy',     label: 'Pharmacy',       page: 'pharmacy' },
    { icon: 'prescriptions',label: 'Prescriptions',  page: 'prescriptions' },
    { icon: 'patients',     label: 'Patients',       page: 'patients' },
  ];
  if (user?.role === 'lab_technician') return [
    { icon: 'patients',     label: 'Patients',       page: 'patients' },
    { icon: 'vitals',       label: 'Vitals/Labs',    page: 'vitals' },
  ];
  if (user?.role === 'billing') return [
    { icon: 'billing',      label: 'Billing',        page: 'billing' },
    { icon: 'patients',     label: 'Patients',       page: 'patients' },
  ];
  // Pharmacy staff: only see pharmacy billing
  if (user?.role === 'receptionist' && user?.staff_type === 'pharmacy') return [
    { icon: 'pharmacy',  label: '💊 Pharmacy Billing', page: 'pharmacy' },
  ];
  // Front-desk receptionist (default)
  return [
    { icon: 'dashboard',    label: 'Dashboard',      page: 'dashboard' },
    { icon: 'patients',     label: 'Patients',       page: 'patients' },
    { icon: 'appointments', label: 'Appointments',   page: 'appointments' },
    { icon: 'billing',      label: 'Billing',        page: 'billing' },
  ];
}

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ page, onNav, user, sidebarOpen, onClose }: any) {
  const nav = getNav(user);
  const initials = user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';
  const { logout } = useAuthStore();

  // Role label & color
  const roleInfo: Record<string, { label: string; color: string }> = {
    admin:          { label: 'Administrator', color: '#dc2626' },
    doctor:         { label: 'Doctor',        color: '#0d9488' },
    receptionist:   { label: 'Receptionist',  color: '#d97706' },
    nurse:          { label: 'Nurse',         color: '#7c3aed' },
    lab_technician: { label: 'Lab Tech',      color: '#0369a1' },
    pharmacist:     { label: 'Pharmacist',    color: '#16a34a' },
    billing:        { label: 'Billing',       color: '#be123c' },
  };
  const { label: roleLabel, color: roleColor } = roleInfo[user?.role] ?? { label: user?.role, color: '#6b7280' };

  return (
    <>
      {sidebarOpen && <div style={{ display:'block', position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:99 }} onClick={onClose} />}
      <nav className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <div className="sidebar-brand-name">Medicos</div>
            <div className="sidebar-brand-sub">Hospital EMR</div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ margin:'8px 12px', padding:'8px 10px', borderRadius:'var(--radius)', background:'var(--surface-alt)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>Logged in as</div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{user?.name?.split(' ').slice(0,2).join(' ')}</div>
          <div style={{ fontSize:11, color: roleColor, fontWeight:600, marginTop:1 }}>{roleLabel}</div>
        </div>

        {/* Nav items */}
        <div className="sidebar-nav">
          {nav.map((item: any, i: number) =>
            item.section
              ? <div key={i} className="nav-section-label">{item.section}</div>
              : (
                <div key={i} className={`nav-item${page === item.page ? ' active' : ''}`}
                  onClick={() => { onNav(item.page); onClose(); }}>
                  <span className="nav-item-icon">{Icons[item.icon]}</span>
                  {item.label}
                </div>
              )
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={logout}>
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name?.split(' ')[0]}</div>
              <div className="sidebar-user-role">Sign out</div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

// ── Sync Badge ────────────────────────────────────────────────────────
function SyncBadge() {
  const { syncState, pendingCount, syncNow } = useSync();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!isOnline) return <div className="sync-badge offline"><span className="sync-dot"/>Offline{pendingCount > 0 ? ` · ${pendingCount}` : ''}</div>;
  if (syncState === 'syncing') return <div className="sync-badge syncing"><span className="sync-dot pulse"/>Syncing…</div>;
  if (pendingCount > 0) return <div className="sync-badge pending" onClick={syncNow}><span className="sync-dot pulse"/>{pendingCount} pending</div>;
  return <div className="sync-badge online" onClick={syncNow}><span className="sync-dot"/>Synced</div>;
}

// ── Page titles ───────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', patients: 'Patients', prescriptions: 'Prescriptions', encounters: 'Encounters',
  vitals: 'Vitals', appointments: 'Appointments', billing: 'Billing',
  settings: 'Staff Management', patient_detail: 'Patient Record',
  new_encounter: 'New Encounter', new_prescription: 'Write Prescription', new_vitals: 'Record Vitals',
};

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  const { user, isLoading } = useAuthStore();
  const [page, setPage]         = useState('');
  const [pageData, setPageData] = useState<any>(null);
  const [sidebarOpen, setSidebar] = useState(false);

  // Set default page per role on login
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin')        setPage('settings');
    else if (user.role === 'doctor')  setPage('patients');
    else if (user.role === 'pharmacist') setPage('pharmacy');
    else if (user.role === 'lab_technician') setPage('patients');
    else if (user.role === 'billing') setPage('billing');
    else if (user.role === 'receptionist' && user.staff_type === 'pharmacy') setPage('pharmacy');
    else if (user.role === 'receptionist') setPage('dashboard');
    else                              setPage('patients');
  }, [user?.role, user?.staff_type]);

  function navigate(p: string, data?: any) { setPage(p); setPageData(data ?? null); }

  if (isLoading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading Medicos EMR…</div>
    </div>
  );

  if (!user) {
    return <LoginPage />;
  }

  // ── Admin: full-page portal, no sidebar ─────────────────────────────
  if (user?.role === 'admin') {
    return <AdminPortal />;
  }

  // ── Doctor & Receptionist: sidebar layout ────────────────────────────
  // Access control per role
  const ACCESS: Record<string, string[]> = {
    dashboard:        ['receptionist'],
    patients:         ['doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'],
    patient_detail:   ['doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'],
    prescriptions:    ['doctor', 'pharmacist'],
    new_prescription: ['doctor'],
    encounters:       ['doctor', 'nurse'],
    new_encounter:    ['doctor', 'nurse'],
    vitals:           ['doctor', 'nurse', 'lab_technician'],
    new_vitals:       ['doctor', 'nurse', 'lab_technician'],
    appointments:     ['doctor', 'receptionist'],
    billing:          ['receptionist', 'billing'],
    pharmacy:         ['receptionist', 'pharmacist'],
  };

  function renderPage() {
    const allowed = ACCESS[page];
    if (allowed && !allowed.includes(user!.role)) {
      return (
        <div style={{ padding:60, textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Access Restricted</div>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>You don't have permission to view this page.</p>
        </div>
      );
    }

    switch (page) {
      case 'dashboard':       return <FrontDeskDashboard onNavigate={navigate} />;
      case 'patients':        return <PatientsPage onNavigate={navigate} autoOpen={pageData?.autoOpen} />;
      case 'prescriptions':   return <PrescriptionsListPage onNavigate={navigate} />;
      case 'encounters':      return <EncountersListPage onNavigate={navigate} />;
      case 'vitals':          return <VitalsPage onNavigate={navigate} />;
      case 'appointments':    return <AppointmentsPage onNavigate={navigate} />;
      case 'billing':         return <BillingPage onNavigate={navigate} />;
      case 'pharmacy':        return <PharmacyBillingPage onNavigate={navigate} />;
      case 'patient_detail':  return <PatientDetail onNavigate={navigate} data={pageData} />;
      case 'new_encounter':   return <NewEncounter onNavigate={navigate} data={pageData} />;
      case 'new_prescription':return <PrescriptionPage onNavigate={navigate} data={pageData} />;
      case 'new_vitals':      return <VitalsPage onNavigate={navigate} data={pageData} mode="record" />;
      default:                return <PatientsPage onNavigate={navigate} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNav={navigate} user={user} sidebarOpen={sidebarOpen} onClose={() => setSidebar(false)} />
      <div className="main-area">
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setSidebar(o => !o)}>
            <span/><span/><span/>
          </button>
          <div className="topbar-title">{PAGE_TITLES[page] ?? 'EMR'}</div>
          <div className="topbar-right">
            <SyncBadge />
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--primary-grad)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
              {user?.name?.split(' ').map(w => w[0]).join('').slice(0,2) ?? ''}
            </div>
          </div>
        </header>
        <div className="page-scroll">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
