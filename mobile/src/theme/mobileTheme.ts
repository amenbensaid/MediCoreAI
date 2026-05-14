import type { PatientTheme } from '@/src/stores/patientUiStore';

export const mobileTheme: Record<PatientTheme, {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  primary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
}> = {
  light: {
    background: '#f8fafc',
    surface: '#fff',
    surfaceAlt: '#f8fafc',
    border: '#e2e8f0',
    text: '#020617',
    muted: '#64748b',
    subtle: '#94a3b8',
    primary: '#2563eb',
    primarySoft: '#eff6ff',
    danger: '#e11d48',
    dangerSoft: '#fff1f2',
    shadow: '#0f172a',
  },
  dark: {
    background: '#07111f',
    surface: '#0f1b2e',
    surfaceAlt: '#132238',
    border: '#243449',
    text: '#f8fafc',
    muted: '#b6c3d6',
    subtle: '#7f8ea3',
    primary: '#60a5fa',
    primarySoft: '#102a4c',
    danger: '#fb7185',
    dangerSoft: '#3f1721',
    shadow: '#000',
  },
};
