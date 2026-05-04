import { useLanguageStore } from '../stores/languageStore';
import { useThemeStore } from '../stores/themeStore';

export const STAFF_LOGIN_PATH = '/login';
export const PATIENT_LOGIN_PATH = '/patient/login';
export const STAFF_DASHBOARD_PATH = '/dashboard';
export const PATIENT_DASHBOARD_PATH = '/patient/portal';

export const getGreeting = (date = new Date()) => {
    const hour = date.getHours();
    return hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
};

export const getDisplayName = (user) => {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return fullName || user?.email || 'utilisateur';
};

export const getRoleLabel = (user) => {
    const role = user?.role;
    const clinicRole = user?.clinicRole;

    if (role === 'patient') return 'Patient';
    if (role === 'admin') return 'Administrateur';
    if (clinicRole === 'admin') return 'Administrateur clinique';
    if (role === 'practitioner') return 'Praticien';
    if (role === 'receptionist') return 'Accueil';
    if (role) return role;
    return 'Utilisateur';
};

export const hasStaffSession = ({ user, isAuthenticated, isAuthReady = true }) => (
    Boolean(isAuthReady && isAuthenticated && user?.role && user.role !== 'patient')
);

export const isPatientSessionActive = () => (
    Boolean(localStorage.getItem('patient-token') && localStorage.getItem('patient-user'))
);

export const getPublicDashboardTarget = ({ user, isAuthenticated, isAuthReady = true } = {}) => {
    if (hasStaffSession({ user, isAuthenticated, isAuthReady })) {
        return STAFF_DASHBOARD_PATH;
    }

    if (isPatientSessionActive()) {
        return PATIENT_DASHBOARD_PATH;
    }

    return null;
};

export const clearPatientSession = () => {
    localStorage.removeItem('patient-token');
    localStorage.removeItem('patient-user');
    useLanguageStore.getState().resetLanguage();
    useThemeStore.getState().resetTheme();
};

export const getLoginPathForUser = (user) => (
    user?.role === 'patient' ? PATIENT_LOGIN_PATH : STAFF_LOGIN_PATH
);

export const getLoginPathForCurrentContext = ({ requestUrl = '', pathname = window.location.pathname } = {}) => {
    if (pathname.startsWith('/patient') || requestUrl.includes('/public/')) {
        return PATIENT_LOGIN_PATH;
    }

    return STAFF_LOGIN_PATH;
};
