import type { StaffAuthUser } from '@/src/api/auth';
import { sessionPersistence } from './sessionPersistence';

type StaffSession = {
  token: string | null;
  user: StaffAuthUser | null;
};

type StoredStaffSession = {
  token: string;
  user: StaffAuthUser;
};

let session: StaffSession = {
  token: null,
  user: null,
};

let hydrated = false;
let hydratePromise: Promise<StaffSession> | null = null;

const STORAGE_KEY = 'staff';

const listeners = new Set<(nextSession: StaffSession) => void>();

const notify = () => {
  listeners.forEach((listener) => listener(session));
};

export const staffSession = {
  getToken: () => session.token,
  getUser: () => session.user,
  getSession: () => session,
  hydrate: async () => {
    if (hydrated) return session;
    if (hydratePromise) return hydratePromise;

    hydratePromise = (async () => {
      const stored = await sessionPersistence.get<StoredStaffSession>(STORAGE_KEY);
      if (stored?.token && stored.user) {
        session = { token: stored.token, user: stored.user };
        notify();
      }
      hydrated = true;
      return session;
    })();

    return hydratePromise;
  },
  setSession: (token: string, user: StaffAuthUser, options?: { rememberMe?: boolean }) => {
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
  subscribe: (listener: (nextSession: StaffSession) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
