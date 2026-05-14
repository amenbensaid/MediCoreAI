import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE = `${FileSystem.documentDirectory || ''}medicore-sessions.json`;

type StoredSessions = Record<string, unknown>;

const canPersist = Boolean(FileSystem.documentDirectory);

const readSessions = async (): Promise<StoredSessions> => {
  if (!canPersist) return {};

  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (!info.exists) return {};

    const raw = await FileSystem.readAsStringAsync(SESSION_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeSessions = async (sessions: StoredSessions) => {
  if (!canPersist) return;

  await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(sessions), {
    encoding: FileSystem.EncodingType.UTF8,
  });
};

export const sessionPersistence = {
  get: async <T>(key: string): Promise<T | null> => {
    const sessions = await readSessions();
    return (sessions[key] as T) || null;
  },
  set: async (key: string, value: unknown) => {
    const sessions = await readSessions();
    sessions[key] = value;
    await writeSessions(sessions);
  },
  remove: async (key: string) => {
    const sessions = await readSessions();
    delete sessions[key];
    await writeSessions(sessions);
  },
};
