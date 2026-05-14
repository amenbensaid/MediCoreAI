import type { PatientAuthUser } from '@/src/api/auth';
import { sessionPersistence } from './sessionPersistence';

type PatientSession = {
  token: string | null;
  user: PatientAuthUser | null;
};

type StoredPatientSession = {
  token: string;
  user: PatientAuthUser;
};

let session: PatientSession = {
  token: null,
  user: null,
};

let hydrated = false;
let hydratePromise: Promise<PatientSession> | null = null;

const STORAGE_KEY = 'patient';

const listeners = new Set<(nextSession: PatientSession) => void>();

const notify = () => {
  listeners.forEach((listener) => listener(session));
};

export const patientSession = {
  getToken: () => session.token,
  getUser: () => session.user,
  getSession: () => session,
  hydrate: async () => {
    if (hydrated) return session;
    if (hydratePromise) return hydratePromise;

    hydratePromise = (async () => {
      const stored = await sessionPersistence.get<StoredPatientSession>(STORAGE_KEY);
      if (stored?.token && stored.user) {
        session = { token: stored.token, user: stored.user };
        notify();
      }
      hydrated = true;
      return session;
    })();

    return hydratePromise;
  },
  setSession: (token: string, user: PatientAuthUser, options?: { rememberMe?: boolean }) => {
    session = { token, user };
    if (options?.rememberMe === false) {
      sessionPersistence.remove(STORAGE_KEY).catch(() => {});
    } else {
      sessionPersistence.set(STORAGE_KEY, { token, user }).catch(() => {});
    }
    notify();
  },
  clear: () => {
    session = { token: null, user: null };
    sessionPersistence.remove(STORAGE_KEY).catch(() => {});
    notify();
  },
  subscribe: (listener: (nextSession: PatientSession) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
