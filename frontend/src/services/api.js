import axios from 'axios';
import { clearPatientSession, getLoginPathForCurrentContext } from '../utils/authRouting';

const createRequestId = () => {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const requestId = createRequestId();
        config.headers['x-client-request-id'] = requestId;
        config.metadata = { startTime: Date.now(), requestId };

        // Token is added by auth store
        return config;
    },
    (error) => {
        console.error('API REQUEST ERROR:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const pathname = window.location.pathname;
        const isAuthRequest =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register') ||
            requestUrl.includes('/auth/me') ||
            requestUrl.includes('/public/patient/login') ||
            requestUrl.includes('/public/patient/register');
        const isOnAuthPage =
            pathname === '/login' ||
            pathname === '/register' ||
            pathname === '/patient/login' ||
            pathname === '/patient/register';

        if (error.response?.status === 401) {
            // For failed login/register requests, keep user on current form and avoid forced reload.
            if (isAuthRequest || isOnAuthPage) {
                return Promise.reject(error);
            }

            // Token expired or invalid on protected pages.
            const loginPath = getLoginPathForCurrentContext({ requestUrl, pathname });
            localStorage.removeItem('medicore-auth');
            clearPatientSession();
            window.location.href = loginPath;
        }
        return Promise.reject(error);
    }
);

export default api;
