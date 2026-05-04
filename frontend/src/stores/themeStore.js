import { create } from 'zustand';

const DEFAULT_THEME = 'light';
const PUBLIC_SCOPE = 'public';
const STORAGE_PREFIX = 'theme';

const getUserScope = (user) => {
    if (!user) {
        return PUBLIC_SCOPE;
    }

    const identifier = user.id || user.email;
    return identifier ? `${user.role || 'user'}:${identifier}` : PUBLIC_SCOPE;
};

const getStorageKey = (scope) => `${STORAGE_PREFIX}:${scope}`;

const applyTheme = (mode) => {
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    return isDark;
};

const getStoredTheme = (scope) => {
    if (typeof window === 'undefined' || scope === PUBLIC_SCOPE) {
        return DEFAULT_THEME;
    }

    const stored = window.localStorage.getItem(getStorageKey(scope));
    return stored === 'dark' ? 'dark' : DEFAULT_THEME;
};

export const useThemeStore = create(
    (set, get) => ({
        isDarkMode: false,
        scope: PUBLIC_SCOPE,

        setTheme: (mode) => {
            const nextMode = mode === 'dark' ? 'dark' : DEFAULT_THEME;
            const scope = get().scope || PUBLIC_SCOPE;
            const isDark = applyTheme(nextMode);

            if (typeof window !== 'undefined') {
                if (scope === PUBLIC_SCOPE) {
                    window.localStorage.removeItem(getStorageKey(PUBLIC_SCOPE));
                    window.localStorage.removeItem(STORAGE_PREFIX);
                } else {
                    window.localStorage.setItem(getStorageKey(scope), nextMode);
                }
            }

            set({ isDarkMode: isDark });
        },

        setThemeScope: (user) => {
            const scope = getUserScope(user);
            const nextMode = getStoredTheme(scope);
            const isDark = applyTheme(nextMode);
            set({ scope, isDarkMode: isDark });
        },

        resetTheme: () => {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(getStorageKey(PUBLIC_SCOPE));
                window.localStorage.removeItem(STORAGE_PREFIX);
            }
            const isDark = applyTheme(DEFAULT_THEME);
            set({ scope: PUBLIC_SCOPE, isDarkMode: isDark });
        },

        toggleTheme: () => {
            set((state) => {
                const newMode = !state.isDarkMode;
                const scope = state.scope || PUBLIC_SCOPE;
                const nextMode = newMode ? 'dark' : DEFAULT_THEME;
                applyTheme(nextMode);

                if (typeof window !== 'undefined') {
                    if (scope === PUBLIC_SCOPE) {
                        window.localStorage.removeItem(getStorageKey(PUBLIC_SCOPE));
                        window.localStorage.removeItem(STORAGE_PREFIX);
                    } else {
                        window.localStorage.setItem(getStorageKey(scope), nextMode);
                    }
                }

                return { isDarkMode: newMode };
            });
        },

        initializeTheme: (user = null) => {
            const scope = getUserScope(user);
            const nextMode = getStoredTheme(scope);
            const isDark = applyTheme(nextMode);
            set({ scope, isDarkMode: isDark });
        }
    })
);
