import { apiFetch } from './client';
import type { AvailableSlot } from '@/src/types/doctor';

export type StaffDashboardStats = {
  appointmentsToday: number;
  appointmentsCompleted: number;
  appointmentsUpcoming: number;
  revenueToday: number;
  revenueMonth: number;
  totalPatients: number;
  newPatientsMonth: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  paymentsTodayCount?: number;
  appointmentsTrend?: string;
  revenueTrend?: string;
  patientsTrend?: string;
  pendingInvoicesTrend?: string;
};

export type StaffDashboardAppointment = {
  id: string;
  time: string;
  type: string;
  status: string;
  patientName: string;
};

export type StaffDashboardAlert = {
  id: string;
  type: string;
  title: string;
  message: string;
};

export type StaffChartRow = {
  name: string;
  revenue?: number;
  appts?: number;
};

export type StaffDashboardData = {
  stats: StaffDashboardStats;
  upcomingAppointments: StaffDashboardAppointment[];
  charts: {
    revenue: StaffChartRow[];
    appointments: StaffChartRow[];
  };
  alerts: StaffDashboardAlert[];
};

export type StaffWaitlistEntry = {
  id: string;
  practitionerId?: string | null;
  practitioner?: string | null;
  specialty?: string | null;
  patientName?: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientAvatarUrl?: string | null;
  appointmentType?: string;
  startTime?: string;
  endTime?: string;
  position?: number;
  status?: string;
  consultationMode?: string | null;
  reasonCategory?: string | null;
  reasonDetail?: string | null;
  notes?: string | null;
  offerExpiresAt?: string | null;
};

export type StaffCalendarAppointment = {
  id: string;
  title?: string | null;
  patientName?: string | null;
  patientAvatarUrl?: string | null;
  type?: string | null;
  start: string;
  end: string;
  status?: string | null;
  color?: string | null;
  notes?: string | null;
  reasonCategory?: string | null;
  reasonDetail?: string | null;
  preparationNotes?: string | null;
  requestedDocuments?: string[];
  sharedDocumentsCount?: number;
  consultationMode?: string | null;
  meetLink?: string | null;
  meeting?: {
    provider?: string | null;
    status?: string | null;
    joinUrl?: string | null;
    createdAt?: string | null;
    lastSyncAt?: string | null;
  };
};

export type StaffAppointment = StaffCalendarAppointment & {
  patientId?: string | null;
  room?: string | null;
  medicalRecordId?: string | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  practitioner?: {
    fullName?: string | null;
  } | null;
};

export type StaffAppointmentCreatePayload = {
  patientId: string;
  practitionerId?: string;
  appointmentType: string;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  room?: string;
  color?: string;
  notes?: string;
  consultationMode?: string;
  reasonCategory?: string;
  reasonDetail?: string;
};

export type StaffAppointmentsResponse = {
  appointments: StaffAppointment[];
};

export type StaffTeleconsultationsResponse = {
  appointments: StaffAppointment[];
  summary: {
    total: number;
    ready: number;
    upcomingToday: number;
    pending: number;
  };
};

export type StaffPatient = {
  id: string;
  patientNumber?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  practitionerName?: string | null;
  isActive: boolean;
  appointmentCount?: number;
  createdAt?: string;
};

export type StaffPatientsResponse = {
  patients: StaffPatient[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
};

export type StaffPatientDetail = StaffPatient & {
  address?: string | null;
  postalCode?: string | null;
  country?: string | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  notes?: string | null;
  recentAppointments?: {
    id: string;
    type: string;
    title?: string | null;
    startTime: string;
    endTime: string;
    status: string;
    practitioner?: string | null;
  }[];
  recentRecords?: {
    id: string;
    type: string;
    complaint?: string | null;
    diagnosis?: string | null;
    date: string;
  }[];
  pendingInvoices?: {
    id: string;
    number: string;
    total: number;
    paid: number;
    balance: number;
    status: string;
    date: string;
  }[];
};

export type StaffPatientCreatePayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
};

export type StaffSecretary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  isActive: boolean;
  practitionerId?: string | null;
  practitionerName?: string | null;
  permissions?: Record<string, boolean>;
  createdAt?: string | null;
  lastLogin?: string | null;
};

export type StaffInvoice = {
  id: string;
  invoiceNumber: string;
  patientName?: string;
  patientEmail?: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string | null;
  createdAt?: string | null;
  appointmentType?: string | null;
  appointmentStart?: string | null;
  consultationMode?: string | null;
  practitionerName?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const staffApi = {
  getDashboard: (token: string) =>
    apiFetch<ApiResponse<StaffDashboardData>>('/dashboard', {
      token,
      params: { _ts: Date.now() },
    }),
  getActiveWaitlist: (token: string) =>
    apiFetch<ApiResponse<StaffWaitlistEntry[]>>('/appointments/waitlist', {
      token,
      params: { status: 'active', _ts: Date.now() },
    }),
  getWaitlist: (token: string, params: { date?: string; status?: string } = {}) =>
    apiFetch<ApiResponse<StaffWaitlistEntry[]>>('/appointments/waitlist', {
      token,
      params: { date: params.date || '', status: params.status || 'active', _ts: Date.now() },
    }),
  offerWaitlist: (token: string, id: string) =>
    apiFetch<ApiResponse<StaffWaitlistEntry>>(`/appointments/waitlist/${id}/offer`, {
      method: 'POST',
      token,
    }),
  confirmWaitlist: (token: string, id: string) =>
    apiFetch<ApiResponse<StaffAppointment>>(`/appointments/waitlist/${id}/confirm`, {
      method: 'POST',
      token,
    }),
  cancelWaitlist: (token: string, id: string) =>
    apiFetch<ApiResponse<unknown>>(`/appointments/waitlist/${id}/cancel`, {
      method: 'POST',
      token,
    }),
  getCalendar: (token: string, params: { start: string; end: string }) =>
    apiFetch<ApiResponse<StaffCalendarAppointment[]>>('/appointments/calendar', {
      token,
      params: { ...params, _ts: Date.now() },
    }),
  getAvailableSlots: (params: { practitionerId: string; date: string; consultationMode?: string }) =>
    apiFetch<ApiResponse<AvailableSlot[]>>('/public/available-slots', {
      params: { ...params, _ts: Date.now() },
    }),
  getAppointments: (
    token: string,
    params: {
      search?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) =>
    apiFetch<ApiResponse<StaffAppointmentsResponse>>('/appointments', {
      token,
      params: {
        search: params.search || '',
        status: params.status || '',
        startDate: params.startDate || '',
        endDate: params.endDate || '',
        page: params.page || 1,
        limit: params.limit || 100,
        _ts: Date.now(),
      },
    }),
  updateAppointment: (token: string, id: string, payload: Record<string, unknown>) =>
    apiFetch<ApiResponse<StaffAppointment>>(`/appointments/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  createAppointment: (token: string, payload: StaffAppointmentCreatePayload) =>
    apiFetch<ApiResponse<StaffAppointment>>('/appointments', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  syncAppointmentMeeting: (token: string, id: string) =>
    apiFetch<ApiResponse<StaffAppointment>>(`/appointments/${id}/sync-meeting`, {
      method: 'POST',
      token,
    }),
  getTeleconsultations: (token: string, scope: 'upcoming' | 'today' = 'upcoming') =>
    apiFetch<ApiResponse<StaffTeleconsultationsResponse>>('/appointments/teleconsultations', {
      token,
      params: { scope, _ts: Date.now() },
    }),
  getInvoices: (token: string, params: { status?: string; limit?: number } = {}) =>
    apiFetch<ApiResponse<{ invoices: StaffInvoice[]; totalCount: number }>>('/invoices', {
      token,
      params: { status: params.status || '', limit: params.limit || 100, _ts: Date.now() },
    }),
  getPatients: (
    token: string,
    params: {
      search?: string;
      page?: number;
      limit?: number;
      isActive?: 'all' | 'true' | 'false';
    } = {},
  ) =>
    apiFetch<ApiResponse<StaffPatientsResponse>>('/patients', {
      token,
      params: {
        page: params.page || 1,
        limit: params.limit || 12,
        search: params.search || '',
        isActive: params.isActive || 'all',
        _ts: Date.now(),
      },
    }),
  getPatient: (token: string, id: string) =>
    apiFetch<ApiResponse<StaffPatientDetail>>(`/patients/${id}`, {
      token,
      params: { _ts: Date.now() },
    }),
  createPatient: (token: string, payload: StaffPatientCreatePayload) =>
    apiFetch<ApiResponse<StaffPatient>>('/patients', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  getSecretaries: (token: string) =>
    apiFetch<ApiResponse<StaffSecretary[]>>('/users/secretaries', {
      token,
      params: { _ts: Date.now() },
    }),
};
