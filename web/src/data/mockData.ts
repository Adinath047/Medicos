// ─── Mock Data ───────────────────────────────────────────────────────────────
// Realistic hospital data for all 5 roles

export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'patient';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  photoURL?: string;
  hospitalId?: string; // which hospital this user belongs to (null for super_admin)
}

// ─── Hospital ─────────────────────────────────────────────────────────────────
export type HospitalType = 'Government' | 'Private' | 'Clinic' | 'Nursing Home' | 'Diagnostic Centre';
export type HospitalStatus = 'Active' | 'Pending' | 'Suspended';

export interface Hospital {
  id: string;          // HSP-2024-000001
  name: string;
  type: HospitalType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  registrationNumber: string;
  specialties: string[];
  adminId: string;     // hospital_admin user id
  adminName: string;
  verified: boolean;
  status: HospitalStatus;
  totalDoctors: number;
  totalPatients: number;
  totalBeds: number;
  createdAt: string;
}

// ─── Doctor (Expanded) ────────────────────────────────────────────────────────
export type DoctorType = 'GP' | 'Specialist' | 'Super-Specialist' | 'Surgeon' | 'Consultant';

export interface Doctor {
  id: string;
  userId: string;
  hospitalId: string;
  name: string;
  type: DoctorType;
  specialization: string;
  subSpecialization?: string;
  qualifications: string;   // e.g. "MBBS, MD (Cardiology)"
  nmcNumber: string;        // NMC/SMC registration number
  nmcVerified: boolean;
  govtIdType: 'Aadhaar' | 'PAN';
  govtIdNumber: string;
  govtIdVerified: boolean;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  achievements: string[];
  languages: string[];
  consultationFee: number;
  experience: number;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Pending Verification';
  bio: string;
  photoURL: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  patientsCount: number;
}

// ─── Staff / Receptionist ─────────────────────────────────────────────────────
export type StaffSubRole = 'receptionist' | 'nurse' | 'lab_tech' | 'pharmacist';

export interface Staff {
  id: string;
  staffId: string;    // STAFF-HSP-000001
  userId: string;
  hospitalId: string;
  name: string;
  phone: string;
  email: string;
  role: StaffSubRole;
  shift: 'Morning' | 'Evening' | 'Night';
  addedBy: string;    // admin userId
  status: 'Active' | 'Inactive';
  joiningDate: string;
}

// ─── Patient (Expanded) ───────────────────────────────────────────────────────
export interface Patient {
  id: string;
  userId?: string;
  hospitalId: string;
  uhid: string;            // UHID-HSP-000001
  registeredBy?: string;   // receptionist userId
  name: string;
  dob: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  phone?: string;          // optional — many don't have
  email?: string;
  address: string;
  bloodGroup: string;
  weight?: string;         // e.g. "72 kg"
  height?: string;         // e.g. "5'8\""
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: { name: string; phone: string; relation: string };
  govtIdType?: 'Aadhaar' | 'Ration Card' | 'Voter ID' | 'Passport';
  govtIdNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  photoURL: string;
  lastVisit: string;
  primaryDoctor: string;
  primaryDoctorId?: string;
}

// ─── Bed ──────────────────────────────────────────────────────────────────────
export interface Bed {
  id: string;
  hospitalId: string;
  bedNumber: string;
  ward: string;
  room: string;
  type: 'General' | 'ICU' | 'Private' | 'Semi-Private';
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
  patientName?: string;
  patientPhoto?: string;
  doctorId?: string;
  doctorName?: string;
  admittedAt?: string;
}

// ─── Vitals ───────────────────────────────────────────────────────────────────
export interface Vitals {
  id: string;
  patientId: string;
  bedId: string;
  visitId: string;
  recordedBy: string;
  bp_systolic: number;
  bp_diastolic: number;
  heartRate: number;
  respRate: number;
  temperature: number;
  spo2: number;
  bloodSugar: number;
  notes: string;
  recordedAt: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientPhoto: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  date: string;
  time: string;
  tokenNumber?: number;
  reason: string;
  status: 'Pending' | 'Confirmed' | 'Checked-In' | 'In Consultation' | 'Cancelled' | 'Completed';
  notes: string;
  registeredBy?: string; // receptionist userId
}

// ─── Visit ────────────────────────────────────────────────────────────────────
export interface Visit {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  admissionDate: string;
  dischargeDate?: string;
  reason: string;
  diagnosis: string;
  status: 'OPD' | 'Admitted' | 'Discharged';
}

// ─── Medicine ─────────────────────────────────────────────────────────────────
export interface Medicine {
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// ─── Letterhead ───────────────────────────────────────────────────────────────
export interface DoctorLetterhead {
  doctorId: string;
  clinicName: string;
  qualifications: string;
  tagline: string;
  regNumber: string;
  address: string;
  phone: string;
  email: string;
  timings: string;
  headerColor: string;
  logoInitials: string;
  footerNote: string;
}

export const LETTERHEADS: Record<string, DoctorLetterhead> = {};

// ─── Prescription ─────────────────────────────────────────────────────────────
export interface Prescription {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  visitId: string;
  medicines: Medicine[];
  advice: string;
  followUpDate?: string;
  patientWeight?: string;
  patientBP?: string;
  createdByRole: 'Admin' | 'Doctor';
  createdAt: string;
  hasFile: boolean;
  fileUrl?: string;
  slipId?: string;    // unique token for public medication slip URL
}

// ─── Billing ──────────────────────────────────────────────────────────────────
export interface BillingHeader {
  id: string;
  visitId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  status: 'IN_PROGRESS' | 'READY_FOR_CHECKOUT' | 'PAID';
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
}

export interface BillingItem {
  id: string;
  billingHeaderId: string;
  dateOfService: string;
  category: 'Room' | 'Consultation' | 'Lab' | 'Imaging' | 'Surgery' | 'Pharmacy' | 'Nursing' | 'Misc';
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

// ─── Reminder ─────────────────────────────────────────────────────────────────
export interface Reminder {
  id: string;
  type: 'vitals_due';
  bedId: string;
  bedNumber: string;
  patientId: string;
  patientName: string;
  patientPhoto: string;
  doctorId: string;
  doctorName: string;
  status: 'Pending' | 'Cleared';
  scheduledAt: string;
}

// ─── Doctor Verification Queue ────────────────────────────────────────────────
export interface DoctorVerification {
  id: string;
  doctorId: string;
  doctorName: string;
  hospitalName: string;
  nmcNumber: string;
  qualifications: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  rejectionReason?: string;
  reviewedAt?: string;
}


// ═══════════════════════════════════════════════════════════════════════════════
// ─── Demo Data ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Demo Users ───────────────────────────────────────────────────────────────
export const USERS: User[] = [
  // Super Admin (Platform Owner)
  {
    id: 'u0', email: 'super@medicos.app', password: 'Super@123',
    role: 'super_admin', name: 'Vikram Anand',
    photoURL: 'https://ui-avatars.com/api/?name=Vikram+Anand&background=7c3aed&color=fff&bold=true&size=128',
  },
  // Hospital Admins
  {
    id: 'u1', email: 'admin@medicos.app', password: 'Admin@123',
    role: 'admin', name: 'James Carter', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=James+Carter&background=2563eb&color=fff&bold=true&size=128',
  },
  {
    id: 'u6', email: 'admin2@medicos.app', password: 'Admin@123',
    role: 'admin', name: 'Meera Nair', hospitalId: 'hsp-002',
    photoURL: 'https://ui-avatars.com/api/?name=Meera+Nair&background=0891b2&color=fff&bold=true&size=128',
  },
  // Doctors
  {
    id: 'u2', email: 'dr.sharma@medicos.app', password: 'Doctor@123',
    role: 'doctor', name: 'Dr. Priya Sharma', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff&bold=true&size=128',
  },
  {
    id: 'u3', email: 'dr.kumar@medicos.app', password: 'Doctor@123',
    role: 'doctor', name: 'Dr. Arjun Kumar', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Arjun+Kumar&background=8b5cf6&color=fff&bold=true&size=128',
  },
  // Receptionists
  {
    id: 'u7', email: 'reception@medicos.app', password: 'Recept@123',
    role: 'receptionist', name: 'Sunita Singh', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Sunita+Singh&background=db2777&color=fff&bold=true&size=128',
  },
  {
    id: 'u8', email: 'reception2@medicos.app', password: 'Recept@123',
    role: 'receptionist', name: 'Rakesh Gupta', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Rakesh+Gupta&background=ea580c&color=fff&bold=true&size=128',
  },
  // Patients
  {
    id: 'u4', email: 'patient@medicos.app', password: 'Patient@123',
    role: 'patient', name: 'Rahul Mehta', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128',
  },
  {
    id: 'u5', email: 'patient2@medicos.app', password: 'Patient@123',
    role: 'patient', name: 'Anita Desai', hospitalId: 'hsp-001',
    photoURL: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128',
  },
];

// ─── Hospitals ────────────────────────────────────────────────────────────────
export const HOSPITALS: Hospital[] = [
  {
    id: 'hsp-001',
    name: 'Apollo Sunrise Hospital',
    type: 'Private',
    address: '12, Ring Road, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110017',
    phone: '+91-11-26925801',
    email: 'apollo.delhi@medicos.app',
    website: 'www.apollosunrise.com',
    registrationNumber: 'DL-HOS-2019-04521',
    specialties: ['Cardiology', 'Neurology', 'Oncology', 'Orthopaedics', 'Emergency'],
    adminId: 'u1',
    adminName: 'James Carter',
    verified: true,
    status: 'Active',
    totalDoctors: 2,
    totalPatients: 0,
    totalBeds: 0,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'hsp-002',
    name: 'Fortis LifeLine Clinic',
    type: 'Clinic',
    address: '45, Linking Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    phone: '+91-22-26440000',
    email: 'fortis.mumbai@medicos.app',
    website: 'www.fortishealthcare.com',
    registrationNumber: 'MH-HOS-2021-08765',
    specialties: ['General Medicine', 'Paediatrics', 'Dermatology'],
    adminId: 'u6',
    adminName: 'Meera Nair',
    verified: true,
    status: 'Active',
    totalDoctors: 4,
    totalPatients: 0,
    totalBeds: 40,
    createdAt: '2024-02-20T09:00:00Z',
  },
  {
    id: 'hsp-003',
    name: 'Government District Hospital',
    type: 'Government',
    address: 'Civil Lines',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302006',
    phone: '+91-141-2226001',
    email: 'gdh.jaipur@medicos.app',
    registrationNumber: 'RJ-HOS-2010-00123',
    specialties: ['General Medicine', 'Surgery', 'Maternity', 'Emergency'],
    adminId: 'u6',
    adminName: 'Govt Admin',
    verified: false,
    status: 'Pending',
    totalDoctors: 12,
    totalPatients: 0,
    totalBeds: 200,
    createdAt: '2024-03-10T09:00:00Z',
  },
  {
    id: 'hsp-004',
    name: 'Rainbow Nursing Home',
    type: 'Nursing Home',
    address: '7, MG Road, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    phone: '+91-80-25594501',
    email: 'rainbow.blr@medicos.app',
    registrationNumber: 'KA-HOS-2018-03421',
    specialties: ['Maternity', 'Neonatology', 'Gynaecology'],
    adminId: 'u6',
    adminName: 'Dr. Kavitha Rao',
    verified: true,
    status: 'Active',
    totalDoctors: 6,
    totalPatients: 0,
    totalBeds: 60,
    createdAt: '2024-03-25T09:00:00Z',
  },
  {
    id: 'hsp-005',
    name: 'Medicity Diagnostic Centre',
    type: 'Diagnostic Centre',
    address: 'Plot 22, Sector 38, Chandigarh',
    city: 'Chandigarh',
    state: 'Punjab',
    pincode: '160036',
    phone: '+91-172-4620000',
    email: 'medicity.chd@medicos.app',
    registrationNumber: 'PB-HOS-2020-06721',
    specialties: ['Radiology', 'Pathology', 'Nuclear Medicine'],
    adminId: 'u6',
    adminName: 'Harpreet Kaur',
    verified: false,
    status: 'Pending',
    totalDoctors: 3,
    totalPatients: 0,
    totalBeds: 0,
    createdAt: '2024-04-01T09:00:00Z',
  },
];

// ─── Doctors ─────────────────────────────────────────────────────────────────
export const DOCTORS: Doctor[] = [
  {
    id: 'd1', userId: 'u2', hospitalId: 'hsp-001',
    name: 'Dr. Priya Sharma',
    type: 'Specialist',
    specialization: 'Cardiology',
    subSpecialization: 'Interventional Cardiology',
    qualifications: 'MBBS, MD (Cardiology), DM (Cardiology)',
    nmcNumber: 'NMC-DL-2015-045621',
    nmcVerified: true,
    govtIdType: 'Aadhaar',
    govtIdNumber: '****-****-3456',
    govtIdVerified: true,
    dateOfBirth: '1985-06-15',
    gender: 'Female',
    achievements: [
      'Best Cardiologist Award — AIIMS 2022',
      'Published 3 research papers in JAMA Cardiology',
      'Completed 500+ angioplasty procedures',
    ],
    languages: ['Hindi', 'English', 'Punjabi'],
    consultationFee: 800,
    experience: 10,
    phone: '+91-9876540001',
    email: 'dr.sharma@medicos.app',
    status: 'Active',
    bio: 'Dr. Priya Sharma is a renowned interventional cardiologist with over 10 years of experience at Apollo Sunrise Hospital.',
    photoURL: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '13:00' },
      { day: 'Tuesday', startTime: '09:00', endTime: '13:00' },
      { day: 'Wednesday', startTime: '14:00', endTime: '18:00' },
      { day: 'Friday', startTime: '09:00', endTime: '13:00' },
    ],
    patientsCount: 0,
  },
  {
    id: 'd2', userId: 'u3', hospitalId: 'hsp-001',
    name: 'Dr. Arjun Kumar',
    type: 'Specialist',
    specialization: 'Neurology',
    qualifications: 'MBBS, MD (Medicine), DM (Neurology)',
    nmcNumber: 'NMC-DL-2018-089342',
    nmcVerified: false,
    govtIdType: 'PAN',
    govtIdNumber: 'ABCPK****F',
    govtIdVerified: false,
    dateOfBirth: '1988-11-22',
    gender: 'Male',
    achievements: [],
    languages: ['Hindi', 'English'],
    consultationFee: 700,
    experience: 7,
    phone: '+91-9876540002',
    email: 'dr.kumar@medicos.app',
    status: 'Pending Verification',
    bio: 'Dr. Arjun Kumar specializes in neurological disorders and stroke management.',
    photoURL: 'https://ui-avatars.com/api/?name=Arjun+Kumar&background=8b5cf6&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Monday', startTime: '14:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '13:00' },
      { day: 'Saturday', startTime: '09:00', endTime: '12:00' },
    ],
    patientsCount: 0,
  },
];

// ─── Staff ────────────────────────────────────────────────────────────────────
export const STAFF: Staff[] = [
  {
    id: 's1', staffId: 'STAFF-HSP001-000001', userId: 'u7', hospitalId: 'hsp-001',
    name: 'Sunita Singh', phone: '+91-9876540010', email: 'reception@medicos.app',
    role: 'receptionist', shift: 'Morning', addedBy: 'u1',
    status: 'Active', joiningDate: '2024-02-01',
  },
  {
    id: 's2', staffId: 'STAFF-HSP001-000002', userId: 'u8', hospitalId: 'hsp-001',
    name: 'Rakesh Gupta', phone: '+91-9876540011', email: 'reception2@medicos.app',
    role: 'receptionist', shift: 'Evening', addedBy: 'u1',
    status: 'Active', joiningDate: '2024-02-15',
  },
];

// ─── Patients ─────────────────────────────────────────────────────────────────
export const PATIENTS: Patient[] = [];

// ─── Beds ─────────────────────────────────────────────────────────────────────
export const BEDS: Bed[] = [];

// ─── Vitals ───────────────────────────────────────────────────────────────────
export const VITALS: Vitals[] = [];

// ─── Appointments ──────────────────────────────────────────────────────────────
export const APPOINTMENTS: Appointment[] = [];

// ─── Visits ───────────────────────────────────────────────────────────────────
export const VISITS: Visit[] = [];

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const PRESCRIPTIONS: Prescription[] = [];

// ─── Billing ──────────────────────────────────────────────────────────────────
export const BILLING_HEADERS: BillingHeader[] = [];
export const BILLING_ITEMS: BillingItem[] = [];

// ─── Reminders ────────────────────────────────────────────────────────────────
export const REMINDERS: Reminder[] = [];

// ─── Doctor-Patient Links ─────────────────────────────────────────────────────
export const DOCTOR_PATIENT_LINKS: { id: string; doctorId: string; patientId: string; linkedAt: string; status: string }[] = [];

// ─── Doctor Verification Queue ────────────────────────────────────────────────
export const DOCTOR_VERIFICATIONS: DoctorVerification[] = [
  {
    id: 'dv1',
    doctorId: 'd2',
    doctorName: 'Dr. Arjun Kumar',
    hospitalName: 'Apollo Sunrise Hospital',
    nmcNumber: 'NMC-DL-2018-089342',
    qualifications: 'MBBS, MD (Medicine), DM (Neurology)',
    submittedAt: '2024-04-18T10:30:00Z',
    status: 'Pending',
  },
];

// ─── ID Generators ────────────────────────────────────────────────────────────
const pad = (n: number, len = 6) => String(n).padStart(len, '0');

export function generateHospitalId(): string {
  const year = new Date().getFullYear();
  return `HSP-${year}-${pad(HOSPITALS.length + 1)}`;
}

export function generateUHID(hospitalId: string): string {
  const shortCode = hospitalId.replace('hsp-', '').toUpperCase().padStart(3, '0');
  const count = PATIENTS.filter(p => p.hospitalId === hospitalId).length;
  return `UHID-${shortCode}-${pad(count + 1)}`;
}

export function generateStaffId(hospitalId: string): string {
  const shortCode = hospitalId.replace('hsp-', '').replace('-', '').toUpperCase().padStart(3, '0');
  const count = STAFF.filter(s => s.hospitalId === hospitalId).length;
  return `STAFF-${shortCode}-${pad(count + 1)}`;
}

export function generateSlipId(): string {
  return `SLIP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
