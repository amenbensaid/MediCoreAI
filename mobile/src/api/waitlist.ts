import { apiFetch } from './client';
import type { PatientWaitlistEntry } from '@/src/types/waitlist';

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const patientWaitlistApi = {
  getMyWaitlist: (token: string) =>
    apiFetch<ApiResponse<PatientWaitlistEntry[]>>('/public/my-waitlist', {
      token,
      params: { _ts: Date.now() },
    }),
  acceptOffer: (id: string, token: string) =>
    apiFetch<ApiResponse<unknown>>(`/public/waitlist/${id}/accept`, {
      method: 'POST',
      token,
    }),
  declineOffer: (id: string, token: string) =>
    apiFetch<ApiResponse<unknown>>(`/public/waitlist/${id}/decline`, {
      method: 'POST',
      token,
    }),
};
