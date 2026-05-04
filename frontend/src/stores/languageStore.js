import { create } from 'zustand';
import { SUPPORTED_LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'medicore-language';
const DEFAULT_LANGUAGE = 'fr';
const PUBLIC_SCOPE = 'public';

const getNestedValue = (source, path) => (
    path.split('.').reduce((current, segment) => current?.[segment], source)
);

const interpolate = (value, params = {}) => {
    if (typeof value !== 'string') {
        return value;
    }

    return Object.entries(params).reduce(
        (text, [key, replacement]) => text.replaceAll(`{{${key}}}`, String(replacement)),
        value
    );
};

const detectLanguage = () => {
    if (typeof window !== 'undefined') {
        const storedPublicLanguage =
            window.localStorage.getItem(getStorageKey(PUBLIC_SCOPE)) ||
            window.localStorage.getItem(STORAGE_KEY);

        if (SUPPORTED_LANGUAGES.includes(storedPublicLanguage)) {
            return storedPublicLanguage;
        }
    }

    if (typeof navigator !== 'undefined') {
        const browserLanguage = navigator.language?.slice(0, 2);
        if (SUPPORTED_LANGUAGES.includes(browserLanguage)) {
            return browserLanguage;
        }
    }

    return DEFAULT_LANGUAGE;
};

const applyDocumentLanguage = (language) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
    }
};

const getUserScope = (user) => {
    if (!user) {
        return PUBLIC_SCOPE;
    }

    const identifier = user.id || user.email;
    return identifier ? `${user.role || 'user'}:${identifier}` : PUBLIC_SCOPE;
};

const getStorageKey = (scope) => `${STORAGE_KEY}:${scope}`;

const getStoredLanguage = (scope) => {
    if (typeof window === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    const stored =
        window.localStorage.getItem(getStorageKey(scope)) ||
        (scope === PUBLIC_SCOPE ? window.localStorage.getItem(STORAGE_KEY) : null);

    return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
};

export const useLanguageStore = create((set, get) => {
    const initialLanguage = detectLanguage();
    applyDocumentLanguage(initialLanguage);

    return {
        language: initialLanguage,
        scope: PUBLIC_SCOPE,
        setLanguage: (language) => {
            const nextLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
            const scope = get().scope || PUBLIC_SCOPE;
            if (typeof window !== 'undefined') {
                if (scope === PUBLIC_SCOPE) {
                    window.localStorage.setItem(getStorageKey(PUBLIC_SCOPE), nextLanguage);
                    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
                } else {
                    window.localStorage.setItem(getStorageKey(scope), nextLanguage);
                }
            }
            applyDocumentLanguage(nextLanguage);
            set({ language: nextLanguage });
        },
        setLanguageScope: (user) => {
            const scope = getUserScope(user);
            const nextLanguage = getStoredLanguage(scope);
            applyDocumentLanguage(nextLanguage);
            set({ scope, language: nextLanguage });
        },
        resetLanguage: () => {
            const nextLanguage = getStoredLanguage(PUBLIC_SCOPE);
            applyDocumentLanguage(nextLanguage);
            set({ scope: PUBLIC_SCOPE, language: nextLanguage });
        },
        toggleLanguage: () => {
            const nextLanguage = get().language === 'fr' ? 'en' : 'fr';
            get().setLanguage(nextLanguage);
        }
    };
});

export const translate = (language, key, params) => {
    const localizedValue = getNestedValue(translations[language], key);
    const fallbackValue = getNestedValue(translations.en, key);
    return interpolate(localizedValue ?? fallbackValue ?? key, params);
};

export const useI18n = () => {
    const language = useLanguageStore((state) => state.language);
    const setLanguage = useLanguageStore((state) => state.setLanguage);
    const setLanguageScope = useLanguageStore((state) => state.setLanguageScope);
    const resetLanguage = useLanguageStore((state) => state.resetLanguage);
    const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);

    return {
        language,
        setLanguage,
        setLanguageScope,
        resetLanguage,
        toggleLanguage,
        t: (key, params) => translate(language, key, params)
    };
};
