import { API_BASE_URL, apiFetch } from './client';
import type { PatientProfileWithDocuments } from '@/src/types/document';

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type PatientProfileUpdatePayload = {
  phone?: string;
  address?: string;
  city?: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  avatarUrl?: string;
  avatarFile?: {
    uri: string;
    name: string;
    mimeType?: string | null;
  } | null;
};

const createRequestId = () => `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const appendProfileValue = (formData: FormData, key: string, value: unknown) => {
  if (Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, value === undefined || value === null ? '' : String(value));
};

const updateProfileMultipart = async (payload: PatientProfileUpdatePayload, token: string) => {
  const formData = new FormData();
  appendProfileValue(formData, 'phone', payload.phone);
  appendProfileValue(formData, 'address', payload.address);
  appendProfileValue(formData, 'city', payload.city);
  appendProfileValue(formData, 'bloodType', payload.bloodType);
  appendProfileValue(formData, 'allergies', payload.allergies || []);
  appendProfileValue(formData, 'chronicConditions', payload.chronicConditions || []);
  appendProfileValue(formData, 'currentMedications', payload.currentMedications || []);
  appendProfileValue(formData, 'avatarUrl', payload.avatarUrl);

  if (payload.avatarFile?.uri) {
    formData.append('avatar', {
      uri: payload.avatarFile.uri,
      name: payload.avatarFile.name,
      type: payload.avatarFile.mimeType || 'image/jpeg',
    } as unknown as Blob);
  }

  const response = await fetch(`${API_BASE_URL}/public/my-profile`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'x-client-request-id': createRequestId(),
    },
    body: formData,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Request failed with status ${response.status}`);
  }

  return json as ApiResponse<{ avatarUrl?: string | null }>;
};

export const patientProfileApi = {
  getProfile: (token: string) =>
    apiFetch<ApiResponse<PatientProfileWithDocuments>>('/public/my-profile', {
      token,
      params: { _ts: Date.now() },
    }),
  updateProfile: (payload: PatientProfileUpdatePayload, token: string) =>
    payload.avatarFile
      ? updateProfileMultipart(payload, token)
      : apiFetch<ApiResponse<{ avatarUrl?: string | null }>>('/public/my-profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      }),
};
