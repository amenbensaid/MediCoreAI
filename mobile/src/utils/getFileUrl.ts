import { API_BASE_URL } from '@/src/api/client';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const getFileUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};
