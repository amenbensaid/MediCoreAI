import { apiFetch } from './client';

export type PatientNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
  read: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const notificationsApi = {
  getStaffNotifications: (token: string) =>
    apiFetch<ApiResponse<PatientNotification[]>>('/notifications', {
      token,
      params: { _ts: Date.now() },
    }),
  markStaffNotificationRead: (id: string, token: string) =>
    apiFetch<ApiResponse<unknown>>(`/notifications/${id}/read`, {
      method: 'PATCH',
      token,
    }),
  markAllStaffNotificationsRead: (token: string) =>
    apiFetch<ApiResponse<unknown>>('/notifications/read-all', {
      method: 'PATCH',
      token,
    }),
  getPatientNotifications: (token: string) =>
    apiFetch<ApiResponse<PatientNotification[]>>('/public/notifications', {
      token,
      params: { _ts: Date.now() },
    }),
  markPatientNotificationRead: (id: string, token: string) =>
    apiFetch<ApiResponse<unknown>>(`/public/notifications/${id}/read`, {
      method: 'PATCH',
      token,
    }),
};
