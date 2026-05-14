import { API_BASE_URL, apiFetch } from './client';
import type {
  PatientDocument,
  PatientDocumentPayload,
  PatientProfileWithDocuments,
} from '@/src/types/document';

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const createRequestId = () => `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const appendText = (formData: FormData, key: string, value?: string | null) => {
  formData.append(key, value || '');
};

const buildDocumentFormData = (payload: PatientDocumentPayload) => {
  const formData = new FormData();

  appendText(formData, 'name', payload.name);
  appendText(formData, 'category', payload.category || 'general');
  appendText(formData, 'notes', payload.notes);
  appendText(formData, 'appointmentId', payload.appointmentId);
  appendText(formData, 'documentCode', payload.documentCode);
  appendText(formData, 'accessScope', payload.accessScope || 'private');
  appendText(formData, 'fileType', payload.fileType || 'document');

  if (payload.file?.uri) {
    formData.append('file', {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.mimeType || 'application/octet-stream',
    } as unknown as Blob);
  }

  return formData;
};

const sendDocumentForm = async <T>(
  path: string,
  method: 'POST' | 'PUT',
  payload: PatientDocumentPayload,
  token: string,
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'x-client-request-id': createRequestId(),
    },
    body: buildDocumentFormData(payload),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Request failed with status ${response.status}`);
  }

  return json as T;
};

export const documentsApi = {
  getMedicalRecord: (token: string) =>
    apiFetch<ApiResponse<PatientProfileWithDocuments>>('/public/my-profile', {
      token,
      params: { _ts: Date.now() },
    }),
  createDocument: (payload: PatientDocumentPayload, token: string) =>
    sendDocumentForm<ApiResponse<PatientDocument>>('/public/documents', 'POST', payload, token),
  updateDocument: (id: string, payload: PatientDocumentPayload, token: string) =>
    sendDocumentForm<ApiResponse<PatientDocument>>(`/public/documents/${id}`, 'PUT', payload, token),
  deleteDocument: (id: string, token: string) =>
    apiFetch<ApiResponse<{ id: string }>>(`/public/documents/${id}`, {
      method: 'DELETE',
      token,
    }),
};
