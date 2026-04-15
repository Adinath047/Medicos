// ─── Mock Data ───────────────────────────────────────────────────────────────
// Realistic hospital data for all 3 roles

export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  photoURL?: string;
}

export interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  regNumber: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  bio: string;
  photoURL: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  patientsCount: number;
  experience: number;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  dob: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  allergies: string[];
  emergencyContact: { name: string; phone: string; relation: string };
  photoURL: string;
  lastVisit: string;
  primaryDoctor: string;
}

export interface Bed {
  id: string;
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

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhoto: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  date: string;
  time: string;
  reason: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  notes: string;
}

export interface Visit {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  admissionDate: string;
  dischargeDate?: string;
  reason: string;
  diagnosis: string;
  status: 'OPD' | 'Admitted' | 'Discharged';
}

export interface Medicine {
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  visitId: string;
  medicines: Medicine[];
  advice: string;
  createdByRole: 'Admin' | 'Doctor';
  createdAt: string;
  hasFile: boolean;
  fileUrl?: string;
}

export interface BillingHeader {
  id: string;
  visitId: string;
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

// ─── Demo Users ───────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { id: 'u1', email: 'admin@medicos.app', password: 'Admin@123', role: 'admin', name: 'James Carter', photoURL: 'https://ui-avatars.com/api/?name=James+Carter&background=2563eb&color=fff&bold=true&size=128' },
  { id: 'u2', email: 'dr.sharma@medicos.app', password: 'Doctor@123', role: 'doctor', name: 'Dr. Priya Sharma', photoURL: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff&bold=true&size=128' },
  { id: 'u3', email: 'dr.kumar@medicos.app', password: 'Doctor@123', role: 'doctor', name: 'Dr. Arjun Kumar', photoURL: 'https://ui-avatars.com/api/?name=Arjun+Kumar&background=8b5cf6&color=fff&bold=true&size=128' },
  { id: 'u4', email: 'patient@medicos.app', password: 'Patient@123', role: 'patient', name: 'Rahul Mehta', photoURL: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128' },
  { id: 'u5', email: 'patient2@medicos.app', password: 'Patient@123', role: 'patient', name: 'Anita Desai', photoURL: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128' },
];

// ─── Doctors ─────────────────────────────────────────────────────────────────
export const DOCTORS: Doctor[] = [
  {
    id: 'd1', userId: 'u2', name: 'Dr. Priya Sharma', specialization: 'Cardiology',
    regNumber: 'MED-2018-4521', phone: '+91 98765 43210', email: 'dr.sharma@medicos.app',
    status: 'Active', experience: 8, patientsCount: 42,
    bio: 'Senior cardiologist with 8+ years experience in interventional cardiology and heart failure management.',
    photoURL: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Mon', startTime: '09:00', endTime: '13:00' },
      { day: 'Wed', startTime: '09:00', endTime: '13:00' },
      { day: 'Fri', startTime: '14:00', endTime: '18:00' },
    ],
  },
  {
    id: 'd2', userId: 'u3', name: 'Dr. Arjun Kumar', specialization: 'Neurology',
    regNumber: 'MED-2019-8834', phone: '+91 87654 32109', email: 'dr.kumar@medicos.app',
    status: 'Active', experience: 6, patientsCount: 38,
    bio: 'Neurologist specializing in stroke management, epilepsy, and movement disorders.',
    photoURL: 'https://ui-avatars.com/api/?name=Arjun+Kumar&background=8b5cf6&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Tue', startTime: '10:00', endTime: '14:00' },
      { day: 'Thu', startTime: '10:00', endTime: '14:00' },
      { day: 'Sat', startTime: '09:00', endTime: '12:00' },
    ],
  },
  {
    id: 'd3', userId: 'u6', name: 'Dr. Sneha Nair', specialization: 'Orthopedics',
    regNumber: 'MED-2015-2267', phone: '+91 76543 21098', email: 'dr.nair@medicos.app',
    status: 'Active', experience: 12, patientsCount: 55,
    bio: 'Orthopedic surgeon specializing in joint replacement, sports injuries and trauma care.',
    photoURL: 'https://ui-avatars.com/api/?name=Sneha+Nair&background=0ea5e9&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Mon', startTime: '14:00', endTime: '18:00' },
      { day: 'Wed', startTime: '14:00', endTime: '18:00' },
      { day: 'Fri', startTime: '09:00', endTime: '13:00' },
    ],
  },
  {
    id: 'd4', userId: 'u7', name: 'Dr. Vikram Rao', specialization: 'Pediatrics',
    regNumber: 'MED-2020-3398', phone: '+91 65432 10987', email: 'dr.rao@medicos.app',
    status: 'Inactive', experience: 4, patientsCount: 21,
    bio: 'Pediatrician focused on child development, immunization, and neonatal care.',
    photoURL: 'https://ui-avatars.com/api/?name=Vikram+Rao&background=f59e0b&color=fff&bold=true&size=128',
    schedule: [
      { day: 'Mon', startTime: '09:00', endTime: '17:00' },
    ],
  },
];

// ─── Patients ─────────────────────────────────────────────────────────────────
export const PATIENTS: Patient[] = [
  {
    id: 'p1', userId: 'u4', name: 'Rahul Mehta', dob: '1988-05-12', age: 36, sex: 'Male',
    phone: '+91 98765 11223', email: 'rahul.mehta@gmail.com',
    address: '12 MG Road, Bangalore - 560001', bloodGroup: 'O+',
    allergies: ['Penicillin', 'NSAIDs'], lastVisit: '2025-04-10', primaryDoctor: 'Dr. Priya Sharma',
    emergencyContact: { name: 'Sunita Mehta', phone: '+91 99887 66554', relation: 'Wife' },
    photoURL: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128',
  },
  {
    id: 'p2', userId: 'u5', name: 'Anita Desai', dob: '1995-09-22', age: 29, sex: 'Female',
    phone: '+91 87654 22334', email: 'anita.desai@gmail.com',
    address: '45 Park Street, Mumbai - 400001', bloodGroup: 'A+',
    allergies: [], lastVisit: '2025-04-08', primaryDoctor: 'Dr. Arjun Kumar',
    emergencyContact: { name: 'Rohan Desai', phone: '+91 88776 55443', relation: 'Husband' },
    photoURL: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128',
  },
  {
    id: 'p3', userId: 'u8', name: 'Karan Singh', dob: '1975-11-08', age: 49, sex: 'Male',
    phone: '+91 76543 33445', email: 'karan.singh@gmail.com',
    address: '78 Civil Lines, Delhi - 110001', bloodGroup: 'B+',
    allergies: ['Sulfa drugs'], lastVisit: '2025-04-12', primaryDoctor: 'Dr. Priya Sharma',
    emergencyContact: { name: 'Meera Singh', phone: '+91 77665 44332', relation: 'Daughter' },
    photoURL: 'https://ui-avatars.com/api/?name=Karan+Singh&background=2563eb&color=fff&bold=true&size=128',
  },
  {
    id: 'p4', userId: 'u9', name: 'Lakshmi Iyer', dob: '1960-03-17', age: 65, sex: 'Female',
    phone: '+91 65432 44556', email: 'lakshmi.iyer@gmail.com',
    address: '23 Anna Salai, Chennai - 600002', bloodGroup: 'AB+',
    allergies: ['Aspirin'], lastVisit: '2025-04-11', primaryDoctor: 'Dr. Sneha Nair',
    emergencyContact: { name: 'Ravi Iyer', phone: '+91 66554 33221', relation: 'Son' },
    photoURL: 'https://ui-avatars.com/api/?name=Lakshmi+Iyer&background=10b981&color=fff&bold=true&size=128',
  },
  {
    id: 'p5', userId: 'u10', name: 'Mohit Verma', dob: '2002-07-30', age: 22, sex: 'Male',
    phone: '+91 54321 55667', email: 'mohit.verma@gmail.com',
    address: '56 Hazratganj, Lucknow - 226001', bloodGroup: 'O-',
    allergies: [], lastVisit: '2025-04-09', primaryDoctor: 'Dr. Arjun Kumar',
    emergencyContact: { name: 'Suresh Verma', phone: '+91 55443 22110', relation: 'Father' },
    photoURL: 'https://ui-avatars.com/api/?name=Mohit+Verma&background=8b5cf6&color=fff&bold=true&size=128',
  },
];

// ─── Beds ─────────────────────────────────────────────────────────────────────
export const BEDS: Bed[] = [
  { id: 'b1', bedNumber: 'A-101', ward: 'Cardiology', room: 'Room 101', type: 'Private', status: 'Occupied', patientId: 'p1', patientName: 'Rahul Mehta', patientPhoto: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', admittedAt: '2025-04-10T08:30:00' },
  { id: 'b2', bedNumber: 'B-201', ward: 'Neurology', room: 'Room 201', type: 'ICU', status: 'Occupied', patientId: 'p2', patientName: 'Anita Desai', patientPhoto: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', admittedAt: '2025-04-11T10:00:00' },
  { id: 'b3', bedNumber: 'A-102', ward: 'Cardiology', room: 'Room 102', type: 'General', status: 'Occupied', patientId: 'p3', patientName: 'Karan Singh', patientPhoto: 'https://ui-avatars.com/api/?name=Karan+Singh&background=2563eb&color=fff&bold=true&size=128', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', admittedAt: '2025-04-12T07:00:00' },
  { id: 'b4', bedNumber: 'C-301', ward: 'Orthopedics', room: 'Room 301', type: 'Semi-Private', status: 'Occupied', patientId: 'p4', patientName: 'Lakshmi Iyer', patientPhoto: 'https://ui-avatars.com/api/?name=Lakshmi+Iyer&background=10b981&color=fff&bold=true&size=128', doctorId: 'd3', doctorName: 'Dr. Sneha Nair', admittedAt: '2025-04-09T09:00:00' },
  { id: 'b5', bedNumber: 'B-202', ward: 'General', room: 'Room 202', type: 'General', status: 'Available' },
  { id: 'b6', bedNumber: 'D-401', ward: 'ICU', room: 'ICU Bay 1', type: 'ICU', status: 'Maintenance' },
];

// ─── Vitals ───────────────────────────────────────────────────────────────────
export const VITALS: Vitals[] = [
  { id: 'v1', patientId: 'p1', bedId: 'b1', visitId: 'vis1', recordedBy: 'Nurse Alice', bp_systolic: 138, bp_diastolic: 88, heartRate: 84, respRate: 18, temperature: 37.2, spo2: 97, bloodSugar: 112, notes: 'Patient stable', recordedAt: '2025-04-15T09:00:00' },
  { id: 'v2', patientId: 'p2', bedId: 'b2', visitId: 'vis2', recordedBy: 'Nurse Bob', bp_systolic: 155, bp_diastolic: 95, heartRate: 98, respRate: 22, temperature: 38.1, spo2: 94, bloodSugar: 145, notes: 'Elevated BP, monitoring', recordedAt: '2025-04-15T08:30:00' },
  { id: 'v3', patientId: 'p3', bedId: 'b3', visitId: 'vis3', recordedBy: 'Nurse Alice', bp_systolic: 142, bp_diastolic: 90, heartRate: 76, respRate: 16, temperature: 36.8, spo2: 98, bloodSugar: 108, notes: '', recordedAt: '2025-04-15T10:15:00' },
  { id: 'v4', patientId: 'p1', bedId: 'b1', visitId: 'vis1', recordedBy: 'Nurse Carol', bp_systolic: 130, bp_diastolic: 82, heartRate: 78, respRate: 17, temperature: 37.0, spo2: 98, bloodSugar: 105, notes: 'Improved', recordedAt: '2025-04-14T21:00:00' },
];

// ─── Appointments ──────────────────────────────────────────────────────────────
export const APPOINTMENTS: Appointment[] = [
  { id: 'a1', patientId: 'p1', patientName: 'Rahul Mehta', patientPhoto: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', doctorSpecialization: 'Cardiology', date: '2025-04-16', time: '09:00', reason: 'Follow-up ECG review', status: 'Confirmed', notes: '' },
  { id: 'a2', patientId: 'p2', patientName: 'Anita Desai', patientPhoto: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', doctorSpecialization: 'Neurology', date: '2025-04-16', time: '10:30', reason: 'MRI result review', status: 'Pending', notes: '' },
  { id: 'a3', patientId: 'p4', patientName: 'Lakshmi Iyer', patientPhoto: 'https://ui-avatars.com/api/?name=Lakshmi+Iyer&background=10b981&color=fff&bold=true&size=128', doctorId: 'd3', doctorName: 'Dr. Sneha Nair', doctorSpecialization: 'Orthopedics', date: '2025-04-17', time: '11:00', reason: 'Post-surgery checkup', status: 'Confirmed', notes: 'Bring X-ray films' },
  { id: 'a4', patientId: 'p3', patientName: 'Karan Singh', patientPhoto: 'https://ui-avatars.com/api/?name=Karan+Singh&background=2563eb&color=fff&bold=true&size=128', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', doctorSpecialization: 'Cardiology', date: '2025-04-15', time: '14:00', reason: 'Chest pain evaluation', status: 'Completed', notes: '' },
  { id: 'a5', patientId: 'p5', patientName: 'Mohit Verma', patientPhoto: 'https://ui-avatars.com/api/?name=Mohit+Verma&background=8b5cf6&color=fff&bold=true&size=128', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', doctorSpecialization: 'Neurology', date: '2025-04-18', time: '09:30', reason: 'Migraine consultation', status: 'Pending', notes: '' },
  { id: 'a6', patientId: 'p1', patientName: 'Rahul Mehta', patientPhoto: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=f59e0b&color=fff&bold=true&size=128', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', doctorSpecialization: 'Cardiology', date: '2025-04-14', time: '10:00', reason: 'Routine heart checkup', status: 'Completed', notes: '' },
];

// ─── Visits ───────────────────────────────────────────────────────────────────
export const VISITS: Visit[] = [
  { id: 'vis1', patientId: 'p1', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', admissionDate: '2025-04-10', reason: 'Acute chest pain', diagnosis: 'Unstable Angina', status: 'Admitted' },
  { id: 'vis2', patientId: 'p2', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', admissionDate: '2025-04-11', reason: 'Seizure episode', diagnosis: 'Temporal lobe epilepsy', status: 'Admitted' },
  { id: 'vis3', patientId: 'p3', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', admissionDate: '2025-04-12', reason: 'Hypertensive crisis', diagnosis: 'Stage 2 Hypertension', status: 'Admitted' },
  { id: 'vis4', patientId: 'p4', doctorId: 'd3', doctorName: 'Dr. Sneha Nair', admissionDate: '2025-04-09', reason: 'Hip replacement surgery', diagnosis: 'Osteoarthritis Hip', status: 'Admitted' },
  { id: 'vis5', patientId: 'p1', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', admissionDate: '2025-03-15', dischargeDate: '2025-03-18', reason: 'Palpitations', diagnosis: 'Atrial fibrillation', status: 'Discharged' },
];

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx1', patientId: 'p1', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', visitId: 'vis1',
    medicines: [
      { name: 'Aspirin', strength: '75mg', dose: '1 tablet', frequency: 'Once daily', duration: '30 days' },
      { name: 'Atorvastatin', strength: '40mg', dose: '1 tablet', frequency: 'Once at night', duration: '90 days' },
      { name: 'Metoprolol', strength: '25mg', dose: '1 tablet', frequency: 'Twice daily', duration: '30 days' },
    ],
    advice: 'Low salt diet. Avoid strenuous activity. Follow up in 2 weeks.',
    createdByRole: 'Doctor', createdAt: '2025-04-10T14:00:00', hasFile: false,
  },
  {
    id: 'rx2', patientId: 'p2', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', visitId: 'vis2',
    medicines: [
      { name: 'Levetiracetam', strength: '500mg', dose: '1 tablet', frequency: 'Twice daily', duration: '90 days' },
      { name: 'Clonazepam', strength: '0.5mg', dose: '1 tablet', frequency: 'At night', duration: '30 days' },
    ],
    advice: 'Avoid driving. Get adequate sleep. No alcohol.',
    createdByRole: 'Doctor', createdAt: '2025-04-11T15:30:00', hasFile: true, fileUrl: 'https://picsum.photos/400/600',
  },
];

// ─── Billing ──────────────────────────────────────────────────────────────────
export const BILLING_HEADERS: BillingHeader[] = [
  { id: 'bill1', visitId: 'vis1', patientId: 'p1', patientName: 'Rahul Mehta', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', status: 'IN_PROGRESS', subtotal: 18500, tax: 1665, discount: 500, grandTotal: 19665, amountPaid: 5000, amountDue: 14665, createdAt: '2025-04-10' },
  { id: 'bill2', visitId: 'vis2', patientId: 'p2', patientName: 'Anita Desai', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', status: 'READY_FOR_CHECKOUT', subtotal: 32000, tax: 2880, discount: 1000, grandTotal: 33880, amountPaid: 20000, amountDue: 13880, createdAt: '2025-04-11' },
  { id: 'bill3', visitId: 'vis5', patientId: 'p1', patientName: 'Rahul Mehta', doctorId: 'd1', doctorName: 'Dr. Priya Sharma', status: 'PAID', subtotal: 12000, tax: 1080, discount: 0, grandTotal: 13080, amountPaid: 13080, amountDue: 0, createdAt: '2025-03-15' },
];

export const BILLING_ITEMS: BillingItem[] = [
  { id: 'bi1', billingHeaderId: 'bill1', dateOfService: '2025-04-10', category: 'Room', description: 'Private Room (5 days)', quantity: 5, rate: 2500, total: 12500 },
  { id: 'bi2', billingHeaderId: 'bill1', dateOfService: '2025-04-10', category: 'Consultation', description: 'Cardiologist Consultation', quantity: 3, rate: 1000, total: 3000 },
  { id: 'bi3', billingHeaderId: 'bill1', dateOfService: '2025-04-10', category: 'Lab', description: 'Blood Panel + Lipid Profile', quantity: 1, rate: 1500, total: 1500 },
  { id: 'bi4', billingHeaderId: 'bill1', dateOfService: '2025-04-11', category: 'Imaging', description: 'ECG + Echocardiogram', quantity: 1, rate: 1500, total: 1500 },
  { id: 'bi5', billingHeaderId: 'bill2', dateOfService: '2025-04-11', category: 'Room', description: 'ICU Room (4 days)', quantity: 4, rate: 5000, total: 20000 },
  { id: 'bi6', billingHeaderId: 'bill2', dateOfService: '2025-04-11', category: 'Consultation', description: 'Neurologist Consultation', quantity: 4, rate: 1500, total: 6000 },
  { id: 'bi7', billingHeaderId: 'bill2', dateOfService: '2025-04-12', category: 'Imaging', description: 'MRI Brain with contrast', quantity: 1, rate: 6000, total: 6000 },
];

// ─── Reminders ────────────────────────────────────────────────────────────────
export const REMINDERS: Reminder[] = [
  { id: 'rem1', type: 'vitals_due', bedId: 'b2', bedNumber: 'B-201', patientId: 'p2', patientName: 'Anita Desai', patientPhoto: 'https://ui-avatars.com/api/?name=Anita+Desai&background=ef4444&color=fff&bold=true&size=128', doctorId: 'd2', doctorName: 'Dr. Arjun Kumar', status: 'Pending', scheduledAt: '2025-04-15T09:00:00' },
  { id: 'rem2', type: 'vitals_due', bedId: 'b4', bedNumber: 'C-301', patientId: 'p4', patientName: 'Lakshmi Iyer', patientPhoto: 'https://ui-avatars.com/api/?name=Lakshmi+Iyer&background=10b981&color=fff&bold=true&size=128', doctorId: 'd3', doctorName: 'Dr. Sneha Nair', status: 'Pending', scheduledAt: '2025-04-15T08:45:00' },
];

// ─── Doctor-Patient Links ─────────────────────────────────────────────────────
export const DOCTOR_PATIENT_LINKS = [
  { id: 'dpl1', doctorId: 'd1', patientId: 'p1', linkedAt: '2025-04-10', status: 'Active' },
  { id: 'dpl2', doctorId: 'd1', patientId: 'p3', linkedAt: '2025-04-12', status: 'Active' },
  { id: 'dpl3', doctorId: 'd2', patientId: 'p2', linkedAt: '2025-04-11', status: 'Active' },
  { id: 'dpl4', doctorId: 'd2', patientId: 'p5', linkedAt: '2025-04-09', status: 'Active' },
  { id: 'dpl5', doctorId: 'd3', patientId: 'p4', linkedAt: '2025-04-09', status: 'Active' },
];
