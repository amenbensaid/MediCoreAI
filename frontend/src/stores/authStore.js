import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { useLanguageStore } from './languageStore';
import { useThemeStore } from './themeStore';

const normalizeAuthUser = (user) => ({
    ...user,
    clinicId: user?.clinicId || user?.clinic?.id || null,
    clinicName: user?.clinicName || user?.clinic?.name || null,
    clinicType: user?.clinicType || user?.clinic?.type || null,
    clinicRole: user?.clinicRole || user?.clinic?.role || null
});

const resetAuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isAuthReady: true
};

const applyUserPreferences = (user) => {
    useLanguageStore.getState().setLanguageScope(user);
    useThemeStore.getState().setThemeScope(user);
};

const resetPublicPreferences = () => {
    useLanguageStore.getState().resetLanguage();
    useThemeStore.getState().resetTheme();
};

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isAuthReady: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, token } = response.data.data;
                    const normalizedUser = normalizeAuthUser(user);

                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    set({
                        user: normalizedUser,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        isAuthReady: true,
                        error: null
                    });
                    applyUserPreferences(normalizedUser);

                    return { success: true };
                } catch (error) {
                    const message = error.response?.data?.message || 'Login failed';
                    set({ isLoading: false, error: message });
                    return { success: false, message };
                }
            },

            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/register', userData);
                    set({ isLoading: false, error: null, isAuthReady: true });
                    return { success: true, data: response.data.data };
                } catch (error) {
                    const message = error.response?.data?.message || 'Registration failed';
                    set({ isLoading: false, error: message });
                    return { success: false, message };
                }
            },

            logout: () => {
                delete api.defaults.headers.common['Authorization'];
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isAuthReady: true,
                    error: null
                });
                resetPublicPreferences();
            },

            updateUser: (userData) => {
                set({ user: { ...get().user, ...userData } });
            },

            initializeAuth: async () => {
                const { token } = get();
                if (!token) {
                    delete api.defaults.headers.common['Authorization'];
                    set(resetAuthState);
                    resetPublicPreferences();
                    return { success: false };
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                set({ isLoading: true, isAuthReady: false, error: null, isAuthenticated: false });

                try {
                    const response = await api.get('/auth/me');
                    const user = normalizeAuthUser(response.data.data);

                    if (user?.role === 'patient') {
                        throw new Error('Patient account cannot use staff session');
                    }

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        isAuthReady: true,
                        error: null
                    });
                    applyUserPreferences(user);

                    return { success: true };
                } catch (error) {
                    delete api.defaults.headers.common['Authorization'];
                    localStorage.removeItem('medicore-auth');
                    set(resetAuthState);
                    resetPublicPreferences();
                    return {
                        success: false,
                        message: error.response?.data?.message || error.message || 'Session expired'
                    };
                }
            },

            clearAuth: () => {
                delete api.defaults.headers.common['Authorization'];
                localStorage.removeItem('medicore-auth');
                set(resetAuthState);
                resetPublicPreferences();
            }
        }),
        {
            name: 'medicore-auth',
            partialize: (state) => ({
                user: state.user,
                token: state.token
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isAuthenticated = false;
                    state.isAuthReady = false;
                    state.isLoading = false;
                    state.error = null;
                }

                if (state?.token) {
                    try {
                        const parts = state.token.split('.');
                        if (parts.length !== 3) {
                            state.user = null;
                            state.token = null;
                            state.isAuthReady = true;
                            delete api.defaults.headers.common['Authorization'];
                            return;
                        }
                    } catch (e) {
                        state.user = null;
                        state.token = null;
                        state.isAuthReady = true;
                        delete api.defaults.headers.common['Authorization'];
                        return;
                    }

                    api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
                } else if (state) {
                    state.isAuthReady = true;
                }
            }
        }
    )
);
