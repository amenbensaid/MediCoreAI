import { apiFetch } from './client';

export type PatientAuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient';
  patientId?: string;
  avatarUrl?: string | null;
};

export type PatientAuthResponse = {
  success: boolean;
  data: {
    user: PatientAuthUser;
    token: string;
  };
};

export type StaffAuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  specialty?: string | null;
  avatarUrl?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  clinicType?: string | null;
  clinicRole?: string | null;
  mfaEnabled?: boolean;
  assignedPractitionerId?: string | null;
  accessPermissions?: Record<string, unknown>;
};

export type StaffAuthResponse = {
  success: boolean;
  message?: string;
  data: {
    user: StaffAuthUser;
    token: string;
  };
};

export type PatientRegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};

export const authApi = {
  staffLogin: (email: string, password: string) =>
    apiFetch<StaffAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  staffForgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  patientLogin: (email: string, password: string) =>
    apiFetch<PatientAuthResponse>('/public/patient/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  patientRegister: (payload: PatientRegisterPayload) =>
    apiFetch<PatientAuthResponse>('/public/patient/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  patientForgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/public/patient/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
