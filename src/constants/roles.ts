export type UserRole = 'admin' | 'doctor' | 'patient';

export const Roles = {
  ADMIN: 'admin' as UserRole,
  DOCTOR: 'doctor' as UserRole,
  PATIENT: 'patient' as UserRole,
};

export const RoleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  patient: 'Patient',
};
