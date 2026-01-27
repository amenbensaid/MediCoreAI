import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, token } = response.data.data;

                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });

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
                    const { user, token } = response.data.data;

                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });

                    return { success: true };
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
                    error: null
                });
            },

            updateUser: (userData) => {
                set({ user: { ...get().user, ...userData } });
            },

            initializeAuth: () => {
                const { token } = get();
                if (token) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            }
        }),
        {
            name: 'medicore-auth',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
                }
            }
        }
    )
);
