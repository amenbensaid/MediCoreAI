import { apiFetch } from './client';
import type { AppointmentType, AvailableSlot, Practitioner } from '@/src/types/doctor';

type ApiListResponse<T> = {
  success: boolean;
  data: T;
};

export type PatientAppointment = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  reasonCategory?: string;
  reasonDetail?: string;
  preparationNotes?: string;
  requestedDocuments?: string[];
  consultationMode?: 'in-person' | 'online';
  meetLink?: string | null;
  paymentStatus?: string;
  paymentMode?: string;
  depositAmount?: number | string;
  totalAmount?: number | string;
  practitionerId?: string;
  practitioner?: string;
  specialty?: string;
};

export type PatientInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string | null;
  createdAt?: string | null;
  appointmentId?: string | null;
  appointmentType?: string | null;
  appointmentStart?: string | null;
  consultationMode?: string | null;
  practitionerName?: string | null;
};

export const patientApi = {
  getSpecialties: () => apiFetch<ApiListResponse<string[]>>('/public/specialties'),
  getPractitioners: (specialty?: string) =>
    apiFetch<ApiListResponse<Practitioner[]>>('/public/practitioners', {
      params: specialty && specialty !== 'all' ? { specialty } : undefined,
    }),
  getPractitioner: (id: string, token?: string | null) =>
    apiFetch<ApiListResponse<Practitioner>>(`/public/practitioners/${id}`, { token }),
  getAppointmentTypes: (practitionerId: string) =>
    apiFetch<ApiListResponse<AppointmentType[]>>('/public/appointment-types', {
      params: { practitionerId },
    }),
  getAvailableSlots: (params: {
    practitionerId: string;
    date: string;
    serviceId?: string;
    consultationMode?: string;
  }) => apiFetch<ApiListResponse<AvailableSlot[]>>('/public/available-slots', { params }),
  bookAppointment: (
    payload: {
      practitionerId: string;
      date: string;
      time: string;
      appointmentType?: string;
      serviceId?: string;
      consultationMode?: 'in-person' | 'online';
      notes?: string;
    },
    token: string,
  ) =>
    apiFetch<{ success: boolean; message: string; data: unknown }>('/public/book-appointment', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  getMyAppointments: (token: string) =>
    apiFetch<ApiListResponse<PatientAppointment[]>>('/public/my-appointments', { token }),
  getMyInvoices: (token: string) =>
    apiFetch<ApiListResponse<PatientInvoice[]>>('/public/my-invoices', { token, params: { _ts: Date.now() } }),
  cancelAppointment: (id: string, token: string) =>
    apiFetch<{ success: boolean; message: string }>(`/public/cancel-appointment/${id}`, {
      method: 'POST',
      token,
    }),
  savePractitionerReview: (
    practitionerId: string,
    payload: {
      rating: number;
      reviewText?: string;
    },
    token: string,
  ) =>
    apiFetch<{ success: boolean; message: string; data: unknown }>(`/public/practitioners/${practitionerId}/reviews`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
};
