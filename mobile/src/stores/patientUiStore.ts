import { useSyncExternalStore } from 'react';

export type PatientLanguage = 'fr' | 'en';
export type PatientTheme = 'light' | 'dark';

let language: PatientLanguage = 'fr';
let theme: PatientTheme = 'light';

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const patientUiStore = {
  getLanguage: () => language,
  setLanguage: (nextLanguage: PatientLanguage) => {
    language = nextLanguage;
    notify();
  },
  getTheme: () => theme,
  setTheme: (nextTheme: PatientTheme) => {
    theme = nextTheme;
    notify();
  },
  toggleTheme: () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    notify();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const usePatientLanguage = () => (
  useSyncExternalStore(patientUiStore.subscribe, patientUiStore.getLanguage, patientUiStore.getLanguage)
);

export const usePatientTheme = () => (
  useSyncExternalStore(patientUiStore.subscribe, patientUiStore.getTheme, patientUiStore.getTheme)
);
