import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import LanguageSwitch from '../components/ui/LanguageSwitch';
import { useI18n } from '../stores/languageStore';

const notificationItems = [
    {
        key: 'appointmentEmail',
        title: 'Appointment reminders via email',
        description: 'Receive an email for each new appointment'
    },
    {
        key: 'smsAlerts',
        title: 'SMS Alerts',
        description: 'Receive SMS for emergencies'
    },
    {
        key: 'dailyReport',
        title: 'Daily Report',
        description: 'Receive a daily summary via email'
    },
    {
        key: 'aiAlerts',
        title: 'AI Alerts',
        description: 'Notifications for important AI predictions'
    }
];

const accentColors = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#0f766e'];

const emptyProfile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    avatarUrl: ''
};

const emptyClinic = {
    name: '',
    type: 'general',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    phone: '',
    email: '',
    website: ''
};

const emptyNotifications = {
    appointmentEmail: true,
    smsAlerts: false,
    dailyReport: true,
    aiAlerts: true
};

const emptyAppearance = {
    darkMode: false,
    accentColor: '#6366f1'
};

const emptyConsultationSettings = {
    consultationFee: 50,
    acceptsOnline: true,
    paymentPolicy: 'full-onsite',
    bio: '',
    calendar: {
        defaultDurationMinutes: 30,
        slotStepMinutes: 30,
        minNoticeHours: 2,
        maxBookingDays: 30,
        allowPatientModeChoice: true,
        sessions: []
    }
};

const dayLabels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const modeLabels = {
    both: 'Présentiel + en ligne',
    online: 'En ligne seulement',
    'in-person': 'Présentiel seulement'
};

const buildDefaultSession = () => ({
    id: `session-${Date.now()}`,
    dayOfWeek: 1,
    start: '09:00',
    end: '12:00',
    mode: 'both',
    enabled: true
});

const emptyMeetingProviderStatus = {
    provider: 'jitsi',
    requiresConnection: false,
    connected: true,
    baseUrl: 'https://meet.jit.si',
    roomPrefix: 'medicore'
};

const emptyPassword = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
};

const secretaryPermissionItems = [
    { key: 'dashboard', label: 'Tableau de bord', description: 'Voir les indicateurs du cabinet' },
    { key: 'patients', label: 'Patients', description: 'Consulter et gérer les fiches patients' },
    { key: 'appointments', label: 'Rendez-vous', description: 'Créer, confirmer et organiser les rendez-vous' },
    { key: 'calendar', label: 'Calendrier', description: 'Voir le planning du cabinet' },
    { key: 'teleconsultations', label: 'Téléconsultations', description: 'Voir les séances en ligne' },
    { key: 'reviews', label: 'Avis', description: 'Consulter les avis patients' },
    { key: 'billing', label: 'Facturation', description: 'Voir les factures et paiements' },
    { key: 'analytics', label: 'Analytique', description: 'Accéder aux rapports avancés' },
    { key: 'settings', label: 'Paramètres', description: 'Accès aux réglages du cabinet' }
];

const defaultSecretaryPermissions = secretaryPermissionItems.reduce((acc, item) => ({
    ...acc,
    [item.key]: ['dashboard', 'patients', 'appointments', 'calendar'].includes(item.key)
}), {});

const emptySecretaryForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    practitionerId: '',
    permissions: defaultSecretaryPermissions
};

const generatePassword = () => `Sec-${Math.random().toString(36).slice(2, 8)}-${Math.floor(100 + Math.random() * 900)}`;

const Settings = () => {
    const { user, updateUser } = useAuthStore();
    const { isDarkMode, initializeTheme, setTheme } = useThemeStore();
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState('profile');
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [profileForm, setProfileForm] = useState(emptyProfile);
    const [profileAvatarFile, setProfileAvatarFile] = useState(null);
    const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
    const [clinicForm, setClinicForm] = useState(emptyClinic);
    const [notificationsForm, setNotificationsForm] = useState(emptyNotifications);
    const [appearanceForm, setAppearanceForm] = useState({ ...emptyAppearance, darkMode: isDarkMode });
    const [consultationSettings, setConsultationSettings] = useState(emptyConsultationSettings);
    const [meetingProviderStatus, setMeetingProviderStatus] = useState(emptyMeetingProviderStatus);
    const [passwordForm, setPasswordForm] = useState(emptyPassword);
    const [secretaries, setSecretaries] = useState([]);
    const [practitioners, setPractitioners] = useState([]);
    const [secretaryForm, setSecretaryForm] = useState({ ...emptySecretaryForm, password: generatePassword() });
    const [secretarySearch, setSecretarySearch] = useState('');
    const [secretaryPasswords, setSecretaryPasswords] = useState({});
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [saving, setSaving] = useState({
        profile: false,
        clinic: false,
        notifications: false,
        appearance: false,
        consultations: false,
        password: false,
        security: false
        , team: false
    });
    const [messages, setMessages] = useState({});

    const isClinicAdmin = user?.role === 'admin' || user?.clinicRole === 'admin';
    const isPractitioner = user?.role === 'practitioner';
    const canManageSecretaries = isClinicAdmin || isPractitioner;
    const roleTitle = isPractitioner ? t('settings.roles.doctor') : isClinicAdmin ? t('settings.roles.admin') : t('settings.roles.staff');

    const tabs = [
        { id: 'profile', name: t('settings.tabs.profile'), icon: '👤' },
        { id: 'clinic', name: t('settings.tabs.clinic'), icon: '🏥' },
        { id: 'consultations', name: t('settings.tabs.consultations'), icon: '🩺' },
        { id: 'notifications', name: t('settings.tabs.notifications'), icon: '🔔' },
        { id: 'security', name: t('settings.tabs.security'), icon: '🔐' },
        { id: 'appearance', name: t('settings.tabs.appearance'), icon: '🎨' }
    ];
    if (canManageSecretaries) {
        tabs.splice(
            3,
            0,
            { id: 'secretaryAccounts', name: t('settings.tabs.secretaryAccounts'), icon: '👥' },
            { id: 'secretaryCreate', name: t('settings.tabs.secretaryCreate'), icon: '➕' }
        );
    }

    const filteredSecretaries = useMemo(() => {
        const normalizedSearch = secretarySearch.trim().toLowerCase();
        return secretaries.filter((secretary) => {
            const haystack = [
                secretary.firstName,
                secretary.lastName,
                secretary.email,
                secretary.phone
            ].join(' ').toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [secretaries, secretarySearch]);

    useEffect(() => {
        initializeTheme();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setSettingsLoading(true);
        try {
            const [settingsResponse, consultationResponse, meetingProviderResponse] = await Promise.all([
                api.get('/users/me/settings'),
                api.get('/users/me/consultation-settings'),
                api.get('/users/me/meeting-provider-status')
            ]);

            const settings = settingsResponse.data.data;

            setProfileForm({ ...emptyProfile, ...(settings.profile || {}) });
            setProfileAvatarFile(null);
            setProfileAvatarPreview('');
            setClinicForm({ ...emptyClinic, ...(settings.clinic || {}) });
            setNotificationsForm({ ...emptyNotifications, ...(settings.notifications || {}) });
            setAppearanceForm({
                ...emptyAppearance,
                ...(settings.appearance || {}),
                darkMode: typeof settings.appearance?.darkMode === 'boolean'
                    ? settings.appearance.darkMode
                    : isDarkMode
            });
            setMfaEnabled(Boolean(settings.security?.mfaEnabled));
            setConsultationSettings({
                ...emptyConsultationSettings,
                ...(consultationResponse.data.data || {}),
                calendar: {
                    ...emptyConsultationSettings.calendar,
                    ...(consultationResponse.data.data?.calendar || {})
                }
            });
            setMeetingProviderStatus({
                ...emptyMeetingProviderStatus,
                ...(meetingProviderResponse.data.data || {})
            });

            if (typeof settings.appearance?.darkMode === 'boolean') {
                setTheme(settings.appearance.darkMode ? 'dark' : 'light');
            }
            if (canManageSecretaries) {
                fetchSecretaries();
                if (isClinicAdmin) fetchPractitioners();
            }
        } catch (error) {
            setMessages((prev) => ({ ...prev, general: t('settings.loadError') }));
        } finally {
            setSettingsLoading(false);
        }
    };

    const fetchSecretaries = async () => {
        try {
            const response = await api.get('/users/secretaries');
            setSecretaries(response.data.data || []);
        } catch (error) {
            setSectionMessage('team', error.response?.data?.message || t('settings.secretaries.loadError'));
        }
    };

    const fetchPractitioners = async () => {
        try {
            const response = await api.get('/users/practitioners/admin', { params: { status: 'active' } });
            setPractitioners(response.data.data || []);
        } catch (error) {
            console.error('Failed to load practitioners for secretaries:', error);
        }
    };

    const updateSecretaryLocal = (secretaryId, patch) => {
        setSecretaries((prev) => prev.map((item) => (
            item.id === secretaryId ? { ...item, ...patch } : item
        )));
    };

    const setSecretaryPermission = (key, value) => {
        setSecretaryForm((prev) => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: value }
        }));
    };

    const createSecretary = async () => {
        setSectionSaving('team', true);
        setSectionMessage('team', '');
        try {
            const response = await api.post('/users/secretaries', secretaryForm);
            setCreatedCredentials(response.data.data.credentials);
            setSecretaries((prev) => [response.data.data.secretary, ...prev]);
            setSecretaryForm({ ...emptySecretaryForm, password: generatePassword() });
            setSectionMessage('team', t('settings.secretaries.createdSuccess'));
        } catch (error) {
            setSectionMessage('team', error.response?.data?.message || t('settings.secretaries.createError'));
        } finally {
            setSectionSaving('team', false);
        }
    };

    const updateSecretary = async (secretary, patch) => {
        setSectionMessage('team', '');
        try {
            const response = await api.put(`/users/secretaries/${secretary.id}`, {
                firstName: secretary.firstName,
                lastName: secretary.lastName,
                phone: secretary.phone,
                permissions: secretary.permissions,
                isActive: secretary.isActive,
                practitionerId: secretary.practitionerId || '',
                ...patch
            });
            setSecretaries((prev) => prev.map((item) => item.id === secretary.id ? response.data.data : item));
            setSecretaryPasswords((prev) => ({ ...prev, [secretary.id]: '' }));
        } catch (error) {
            setSectionMessage('team', error.response?.data?.message || t('settings.secretaries.updateError'));
        }
    };

    const deleteSecretary = async (secretary) => {
        const name = `${secretary.firstName} ${secretary.lastName}`.trim();
        if (!window.confirm(t('settings.secretaries.confirmDelete', { name }))) return;
        try {
            await api.delete(`/users/secretaries/${secretary.id}`);
            setSecretaries((prev) => prev.filter((item) => item.id !== secretary.id));
            setSectionMessage('team', t('settings.secretaries.deletedSuccess'));
        } catch (error) {
            setSectionMessage('team', error.response?.data?.message || t('settings.secretaries.deleteError'));
        }
    };

    const setSectionMessage = (section, value) => {
        setMessages((prev) => ({ ...prev, [section]: value }));
    };

    const setSectionSaving = (section, value) => {
        setSaving((prev) => ({ ...prev, [section]: value }));
    };

    const saveProfile = async () => {
        setSectionSaving('profile', true);
        setSectionMessage('profile', '');
        try {
            let payload = profileForm;
            let config = {};

            if (profileAvatarFile) {
                payload = new FormData();
                Object.entries(profileForm).forEach(([key, value]) => {
                    payload.append(key, value ?? '');
                });
                payload.append('avatar', profileAvatarFile);
                config = { headers: { 'Content-Type': 'multipart/form-data' } };
            }

            const response = await api.put('/users/me/profile', payload, config);
            const nextProfile = { ...emptyProfile, ...response.data.data };
            setProfileForm(nextProfile);
            setProfileAvatarFile(null);
            setProfileAvatarPreview('');
            updateUser({
                firstName: nextProfile.firstName,
                lastName: nextProfile.lastName,
                specialty: nextProfile.specialty,
                avatarUrl: nextProfile.avatarUrl
            });
            setSectionMessage('profile', 'Profile updated successfully');
        } catch (error) {
            setSectionMessage('profile', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSectionSaving('profile', false);
        }
    };

    const saveClinic = async () => {
        setSectionSaving('clinic', true);
        setSectionMessage('clinic', '');
        try {
            const response = await api.put('/users/me/clinic-settings', clinicForm);
            const nextClinic = { ...emptyClinic, ...response.data.data };
            setClinicForm(nextClinic);
            updateUser({
                clinicName: nextClinic.name,
                clinicType: nextClinic.type
            });
            setSectionMessage('clinic', 'Clinic settings updated successfully');
        } catch (error) {
            setSectionMessage('clinic', error.response?.data?.message || 'Failed to update clinic settings');
        } finally {
            setSectionSaving('clinic', false);
        }
    };

    const updateCalendar = (patch) => {
        setConsultationSettings((prev) => ({
            ...prev,
            calendar: {
                ...prev.calendar,
                ...patch
            }
        }));
    };

    const updateSession = (index, patch) => {
        setConsultationSettings((prev) => ({
            ...prev,
            calendar: {
                ...prev.calendar,
                sessions: (prev.calendar?.sessions || []).map((session, sessionIndex) => (
                    sessionIndex === index ? { ...session, ...patch } : session
                ))
            }
        }));
    };

    const addSession = () => {
        setConsultationSettings((prev) => ({
            ...prev,
            calendar: {
                ...prev.calendar,
                sessions: [...(prev.calendar?.sessions || []), buildDefaultSession()]
            }
        }));
    };

    const removeSession = (index) => {
        setConsultationSettings((prev) => ({
            ...prev,
            calendar: {
                ...prev.calendar,
                sessions: (prev.calendar?.sessions || []).filter((_, sessionIndex) => sessionIndex !== index)
            }
        }));
    };

    const saveNotifications = async () => {
        setSectionSaving('notifications', true);
        setSectionMessage('notifications', '');
        try {
            const response = await api.put('/users/me/preferences', { notifications: notificationsForm });
            setNotificationsForm({ ...emptyNotifications, ...response.data.data.notifications });
            setSectionMessage('notifications', 'Notification preferences saved');
        } catch (error) {
            setSectionMessage('notifications', error.response?.data?.message || 'Failed to save notification preferences');
        } finally {
            setSectionSaving('notifications', false);
        }
    };

    const saveAppearance = async () => {
        setSectionSaving('appearance', true);
        setSectionMessage('appearance', '');
        try {
            const response = await api.put('/users/me/preferences', { appearance: appearanceForm });
            const nextAppearance = { ...emptyAppearance, ...response.data.data.appearance };
            setAppearanceForm(nextAppearance);
            setTheme(nextAppearance.darkMode ? 'dark' : 'light');
            setSectionMessage('appearance', t('settings.appearanceSaved'));
        } catch (error) {
            setSectionMessage('appearance', error.response?.data?.message || t('settings.appearanceSaveError'));
        } finally {
            setSectionSaving('appearance', false);
        }
    };

    const saveConsultationSettings = async () => {
        setSectionSaving('consultations', true);
        setSectionMessage('consultations', '');
        try {
            const response = await api.put('/users/me/consultation-settings', consultationSettings);
            setConsultationSettings({
                ...emptyConsultationSettings,
                ...response.data.data,
                calendar: {
                    ...emptyConsultationSettings.calendar,
                    ...(response.data.data?.calendar || {})
                }
            });
            setSectionMessage('consultations', 'Consultation settings saved');
        } catch (error) {
            setSectionMessage('consultations', error.response?.data?.message || 'Failed to save consultation settings');
        } finally {
            setSectionSaving('consultations', false);
        }
    };

    const savePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            setSectionMessage('password', 'Current and new passwords are required');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setSectionMessage('password', 'New password must be at least 8 characters');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setSectionMessage('password', 'Password confirmation does not match');
            return;
        }

        setSectionSaving('password', true);
        setSectionMessage('password', '');
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setPasswordForm(emptyPassword);
            setSectionMessage('password', 'Password changed successfully');
        } catch (error) {
            setSectionMessage('password', error.response?.data?.message || 'Failed to change password');
        } finally {
            setSectionSaving('password', false);
        }
    };

    const saveSecurity = async () => {
        setSectionSaving('security', true);
        setSectionMessage('security', '');
        try {
            const response = await api.put('/users/me/security', { mfaEnabled });
            const nextValue = Boolean(response.data.data.mfaEnabled);
            setMfaEnabled(nextValue);
            updateUser({ mfaEnabled: nextValue });
            setSectionMessage('security', 'Security settings saved');
        } catch (error) {
            setSectionMessage('security', error.response?.data?.message || 'Failed to update security settings');
        } finally {
            setSectionSaving('security', false);
        }
    };

    if (settingsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">{t('nav.settings')}</p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{t('settings.title')}</h1>
            </section>
            {messages.general && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {messages.general}
                </div>
            )}

            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800 xl:w-72">
                    <nav className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full rounded-2xl px-4 py-3 text-left transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-700'
                                }`}
                            >
                                <span className="mr-3">{tab.icon}</span>
                                <span className="font-medium">{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-1 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{roleTitle}</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Contact details and profile image used in the dashboard{isPractitioner ? ' and public doctor listing.' : '.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-dark-700 dark:bg-dark-900/40 sm:flex-row sm:items-center">
                                <Avatar
                                    src={profileAvatarPreview || profileForm.avatarUrl}
                                    firstName={profileForm.firstName}
                                    lastName={profileForm.lastName}
                                    size="xl"
                                    radius="2xl"
                                    alt="Photo du profil"
                                    className="shadow-md shadow-primary-500/15"
                                />
                                <div className="grid flex-1 gap-3 md:grid-cols-[1fr_auto]">
                                    <Field label="Image URL">
                                        <input
                                            type="url"
                                            value={profileForm.avatarUrl}
                                            onChange={(e) => {
                                                setProfileAvatarFile(null);
                                                setProfileAvatarPreview('');
                                                setProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }));
                                            }}
                                            className="input-field"
                                            placeholder="https://example.com/profile.jpg"
                                        />
                                    </Field>
                                    <Field label="Upload image">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setProfileAvatarFile(file);
                                                setProfileAvatarPreview(file ? URL.createObjectURL(file) : '');
                                            }}
                                            className="input-field"
                                        />
                                    </Field>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 md:col-span-2">
                                        JPG, PNG or WEBP. Doctors appear with this image in “Find doctors”; if empty, initials are shown.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="First Name">
                                    <input
                                        type="text"
                                        value={profileForm.firstName}
                                        onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Last Name">
                                    <input
                                        type="text"
                                        value={profileForm.lastName}
                                        onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Email">
                                    <input type="email" value={profileForm.email} className="input-field opacity-70" disabled />
                                </Field>
                                <Field label="Phone">
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="input-field"
                                    />
                                </Field>
                                {isPractitioner && (
                                    <>
                                        <Field label="Specialty">
                                            <input
                                                type="text"
                                                value={profileForm.specialty}
                                                onChange={(e) => setProfileForm((prev) => ({ ...prev, specialty: e.target.value }))}
                                                className="input-field"
                                            />
                                        </Field>
                                        <Field label="License Number">
                                            <input
                                                type="text"
                                                value={profileForm.licenseNumber}
                                                onChange={(e) => setProfileForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                                                className="input-field"
                                            />
                                        </Field>
                                    </>
                                )}
                            </div>

                            <StatusMessage message={messages.profile} />
                            <button onClick={saveProfile} disabled={saving.profile} className="btn-primary disabled:opacity-60">
                                {saving.profile ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'clinic' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Clinic Settings</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Clinic data is now loaded from the backend.
                                    {!isClinicAdmin && ' Only clinic admins can edit these values.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Clinic Name">
                                    <input
                                        type="text"
                                        value={clinicForm.name}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, name: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Type">
                                    <select
                                        value={clinicForm.type}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, type: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    >
                                        <option value="general">General Practice</option>
                                        <option value="dental">Dental Clinic</option>
                                        <option value="aesthetic">Aesthetic Clinic</option>
                                        <option value="veterinary">Veterinary Clinic</option>
                                    </select>
                                </Field>
                                <Field label="Address" className="md:col-span-2">
                                    <input
                                        type="text"
                                        value={clinicForm.address}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, address: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="City">
                                    <input
                                        type="text"
                                        value={clinicForm.city}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, city: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Postal Code">
                                    <input
                                        type="text"
                                        value={clinicForm.postalCode}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Country">
                                    <input
                                        type="text"
                                        value={clinicForm.country}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, country: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Phone">
                                    <input
                                        type="tel"
                                        value={clinicForm.phone}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Email">
                                    <input
                                        type="email"
                                        value={clinicForm.email}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, email: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                                <Field label="Website">
                                    <input
                                        type="text"
                                        value={clinicForm.website}
                                        onChange={(e) => setClinicForm((prev) => ({ ...prev, website: e.target.value }))}
                                        className="input-field"
                                        disabled={!isClinicAdmin}
                                    />
                                </Field>
                            </div>

                            <StatusMessage message={messages.clinic} />
                            {isClinicAdmin && (
                                <button onClick={saveClinic} disabled={saving.clinic} className="btn-primary disabled:opacity-60">
                                    {saving.clinic ? 'Saving...' : 'Save Clinic'}
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">These switches are now persisted in the backend.</p>
                            </div>

                            <div className="space-y-4">
                                {notificationItems.map((item) => (
                                    <ToggleSetting
                                        key={item.key}
                                        title={item.title}
                                        description={item.description}
                                        checked={Boolean(notificationsForm[item.key])}
                                        onChange={() => setNotificationsForm((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                    />
                                ))}
                            </div>

                            <StatusMessage message={messages.notifications} />
                            <button onClick={saveNotifications} disabled={saving.notifications} className="btn-primary disabled:opacity-60">
                                {saving.notifications ? 'Saving...' : 'Save Notifications'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'secretaryCreate' && canManageSecretaries && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.secretaries.createTitle')}</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('settings.secretaries.createSubtitle')}
                                </p>
                            </div>

                            {createdCredentials && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                    <p className="font-bold">{t('settings.secretaries.credentialsTitle')}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <code className="rounded-lg bg-white px-3 py-2 dark:bg-dark-800">{createdCredentials.email}</code>
                                        <code className="rounded-lg bg-white px-3 py-2 dark:bg-dark-800">{createdCredentials.password}</code>
                                    </div>
                                    <p className="mt-2 text-xs">{t('settings.secretaries.credentialsHint')}</p>
                                </div>
                            )}

                            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5 dark:border-dark-700 dark:bg-dark-900/40">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label={t('settings.secretaries.firstName')}>
                                        <input value={secretaryForm.firstName} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, firstName: e.target.value }))} className="input-field" />
                                    </Field>
                                    <Field label={t('settings.secretaries.lastName')}>
                                        <input value={secretaryForm.lastName} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, lastName: e.target.value }))} className="input-field" />
                                    </Field>
                                    <Field label={t('settings.secretaries.email')}>
                                        <input type="email" value={secretaryForm.email} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, email: e.target.value }))} className="input-field" placeholder="secretaire@gmail.com" />
                                    </Field>
                                    <Field label={t('settings.secretaries.phone')}>
                                        <input value={secretaryForm.phone} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, phone: e.target.value }))} className="input-field" />
                                    </Field>
                                    <Field label={t('settings.secretaries.password')}>
                                        <div className="flex gap-2">
                                            <input value={secretaryForm.password} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, password: e.target.value }))} className="input-field" />
                                            <button type="button" onClick={() => setSecretaryForm((prev) => ({ ...prev, password: generatePassword() }))} className="btn-secondary whitespace-nowrap">
                                                {t('settings.secretaries.generate')}
                                            </button>
                                        </div>
                                    </Field>
                                    {isClinicAdmin && (
                                        <Field label={t('settings.secretaries.assignedDoctor')}>
                                            <select value={secretaryForm.practitionerId} onChange={(e) => setSecretaryForm((prev) => ({ ...prev, practitionerId: e.target.value }))} className="input-field">
                                                <option value="">{t('settings.secretaries.noAssignedDoctor')}</option>
                                                {practitioners.map((practitioner) => (
                                                    <option key={practitioner.id} value={practitioner.id}>{practitioner.fullName}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    )}
                                </div>

                                <div className="mt-5">
                                    <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.secretaries.visiblePermissions')}</p>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {secretaryPermissionItems.map((item) => (
                                            <label key={item.key} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(secretaryForm.permissions[item.key])}
                                                    onChange={(e) => setSecretaryPermission(item.key, e.target.checked)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600"
                                                />
                                                <span>
                                                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{t(`settings.secretaries.permissions.${item.key}.label`)}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t(`settings.secretaries.permissions.${item.key}.description`)}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button onClick={createSecretary} disabled={saving.team} className="btn-primary disabled:opacity-60">
                                        {saving.team ? t('settings.secretaries.creating') : t('settings.secretaries.create')}
                                    </button>
                                </div>
                            </div>
                            <StatusMessage message={messages.team} />
                        </div>
                    )}

                    {activeTab === 'secretaryAccounts' && canManageSecretaries && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.secretaries.accountsTitle')}</h2>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.secretaries.accountsSubtitle')}</p>
                                </div>
                                <button type="button" onClick={() => setActiveTab('secretaryCreate')} className="btn-primary">
                                    {t('settings.tabs.secretaryCreate')}
                                </button>
                            </div>

                            <div className="relative">
                                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    value={secretarySearch}
                                    onChange={(e) => setSecretarySearch(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder={t('settings.secretaries.searchPlaceholder')}
                                />
                            </div>

                            <div className="space-y-4">
                                {filteredSecretaries.map((secretary) => (
                                    <div key={secretary.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-medical-500 text-sm font-bold text-white shadow-lg">
                                                    {`${secretary.firstName?.[0] || ''}${secretary.lastName?.[0] || ''}`.toUpperCase() || 'SC'}
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-bold text-slate-900 dark:text-white">{secretary.firstName} {secretary.lastName}</p>
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${secretary.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300'}`}>
                                                            {secretary.isActive ? t('settings.secretaries.active') : t('settings.secretaries.inactive')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500">{secretary.email}</p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {t('settings.secretaries.lastLogin')}: {secretary.lastLogin ? new Date(secretary.lastLogin).toLocaleString() : t('settings.secretaries.never')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => updateSecretary(secretary, { isActive: !secretary.isActive })} className="btn-secondary text-sm">
                                                    {secretary.isActive ? t('settings.secretaries.deactivate') : t('settings.secretaries.reactivate')}
                                                </button>
                                                <button onClick={() => deleteSecretary(secretary)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">
                                                    {t('settings.secretaries.delete')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                            <Field label={t('settings.secretaries.firstName')}>
                                                <input value={secretary.firstName || ''} onChange={(e) => updateSecretaryLocal(secretary.id, { firstName: e.target.value })} className="input-field" />
                                            </Field>
                                            <Field label={t('settings.secretaries.lastName')}>
                                                <input value={secretary.lastName || ''} onChange={(e) => updateSecretaryLocal(secretary.id, { lastName: e.target.value })} className="input-field" />
                                            </Field>
                                            <Field label={t('settings.secretaries.phone')}>
                                                <input value={secretary.phone || ''} onChange={(e) => updateSecretaryLocal(secretary.id, { phone: e.target.value })} className="input-field" />
                                            </Field>
                                            {isClinicAdmin && (
                                                <Field label={t('settings.secretaries.assignedDoctor')}>
                                                    <select
                                                        value={secretary.practitionerId || ''}
                                                        onChange={(e) => updateSecretary(secretary, { practitionerId: e.target.value })}
                                                        className="input-field"
                                                    >
                                                        <option value="">{t('settings.secretaries.noAssignedDoctor')}</option>
                                                        {practitioners.map((practitioner) => (
                                                            <option key={practitioner.id} value={practitioner.id}>{practitioner.fullName}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                            )}
                                            <Field label={t('settings.secretaries.resetPassword')}>
                                                <input
                                                    value={secretaryPasswords[secretary.id] || ''}
                                                    onChange={(e) => setSecretaryPasswords((prev) => ({ ...prev, [secretary.id]: e.target.value }))}
                                                    className="input-field"
                                                    placeholder={t('settings.secretaries.resetPasswordPlaceholder')}
                                                />
                                            </Field>
                                        </div>

                                        <div className="mt-5">
                                            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.secretaries.visiblePermissions')}</p>
                                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                {secretaryPermissionItems.map((item) => (
                                                    <label key={item.key} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 dark:bg-dark-900/40">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(secretary.permissions[item.key])}
                                                            onChange={(e) => updateSecretary(secretary, {
                                                                permissions: { ...secretary.permissions, [item.key]: e.target.checked }
                                                            })}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600"
                                                        />
                                                        <span>
                                                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{t(`settings.secretaries.permissions.${item.key}.label`)}</span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">{t(`settings.secretaries.permissions.${item.key}.description`)}</span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-5 flex justify-end">
                                            <button
                                                onClick={() => updateSecretary(secretary, secretaryPasswords[secretary.id] ? { password: secretaryPasswords[secretary.id] } : {})}
                                                className="btn-primary"
                                            >
                                                {t('settings.secretaries.save')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredSecretaries.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-dark-700">
                                        {t('settings.secretaries.empty')}
                                    </div>
                                )}
                            </div>
                            <StatusMessage message={messages.team} />
                        </div>
                    )}

                    {activeTab === 'consultations' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Consultation Settings</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Public doctor profile and online booking rules.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Consultation Fee (€)">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={consultationSettings.consultationFee}
                                        onChange={(e) => setConsultationSettings((prev) => ({ ...prev, consultationFee: Number(e.target.value) }))}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="In-person Payment Policy">
                                    <select
                                        value={consultationSettings.paymentPolicy}
                                        onChange={(e) => setConsultationSettings((prev) => ({ ...prev, paymentPolicy: e.target.value }))}
                                        className="input-field"
                                    >
                                        <option value="full-onsite">100% on site</option>
                                        <option value="deposit-30">30% at booking, rest on site</option>
                                    </select>
                                </Field>
                                <Field label="Public Doctor Bio" className="md:col-span-2">
                                    <textarea
                                        rows={4}
                                        value={consultationSettings.bio}
                                        onChange={(e) => setConsultationSettings((prev) => ({ ...prev, bio: e.target.value }))}
                                        className="input-field"
                                        placeholder="Displayed on the public doctors page"
                                    />
                                </Field>
                            </div>

                            <ToggleSetting
                                title="Enable Online Consultations"
                                description="When enabled, teleconsultation bookings are accepted with 100% advance payment."
                                checked={consultationSettings.acceptsOnline}
                                onChange={() => setConsultationSettings((prev) => ({ ...prev, acceptsOnline: !prev.acceptsOnline }))}
                            />

                            <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm dark:border-primary-900/30 dark:bg-dark-800">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Paramètres avancés du calendrier</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Définissez la durée réelle des consultations et les séances visibles dans le booking patient.
                                        </p>
                                    </div>
                                    <button type="button" onClick={addSession} className="btn-secondary text-sm">
                                        + Ajouter une séance
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <Field label="Durée consultation">
                                        <select
                                            value={consultationSettings.calendar?.defaultDurationMinutes || 30}
                                            onChange={(e) => updateCalendar({ defaultDurationMinutes: Number(e.target.value) })}
                                            className="input-field"
                                        >
                                            {[15, 20, 30, 45, 60, 90].map((value) => (
                                                <option key={value} value={value}>{value} min</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Pas des créneaux">
                                        <select
                                            value={consultationSettings.calendar?.slotStepMinutes || 30}
                                            onChange={(e) => updateCalendar({ slotStepMinutes: Number(e.target.value) })}
                                            className="input-field"
                                        >
                                            {[10, 15, 20, 30, 45, 60].map((value) => (
                                                <option key={value} value={value}>{value} min</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Délai minimum">
                                        <input
                                            type="number"
                                            min="0"
                                            max="168"
                                            value={consultationSettings.calendar?.minNoticeHours ?? 2}
                                            onChange={(e) => updateCalendar({ minNoticeHours: Number(e.target.value) })}
                                            className="input-field"
                                        />
                                    </Field>
                                    <Field label="Jours réservables">
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={consultationSettings.calendar?.maxBookingDays ?? 30}
                                            onChange={(e) => updateCalendar({ maxBookingDays: Number(e.target.value) })}
                                            className="input-field"
                                        />
                                    </Field>
                                </div>

                                <ToggleSetting
                                    title="Laisser le patient choisir le mode"
                                    description="Si activé, les créneaux mixtes permettent au patient de choisir présentiel ou en ligne."
                                    checked={consultationSettings.calendar?.allowPatientModeChoice !== false}
                                    onChange={() => updateCalendar({ allowPatientModeChoice: consultationSettings.calendar?.allowPatientModeChoice === false })}
                                />

                                <div className="mt-5 space-y-3">
                                    {(consultationSettings.calendar?.sessions || []).map((session, index) => (
                                        <div key={session.id || index} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900/40 md:grid-cols-[1fr_1fr_1fr_1.3fr_auto_auto]">
                                            <select
                                                value={session.dayOfWeek}
                                                onChange={(e) => updateSession(index, { dayOfWeek: Number(e.target.value) })}
                                                className="input-field"
                                            >
                                                {dayLabels.map((label, dayIndex) => (
                                                    <option key={label} value={dayIndex}>{label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="time"
                                                value={session.start}
                                                onChange={(e) => updateSession(index, { start: e.target.value })}
                                                className="input-field"
                                            />
                                            <input
                                                type="time"
                                                value={session.end}
                                                onChange={(e) => updateSession(index, { end: e.target.value })}
                                                className="input-field"
                                            />
                                            <select
                                                value={session.mode}
                                                onChange={(e) => updateSession(index, { mode: e.target.value })}
                                                className="input-field"
                                            >
                                                {Object.entries(modeLabels).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                            <label className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium dark:border-dark-600 dark:bg-dark-800">
                                                <input
                                                    type="checkbox"
                                                    checked={session.enabled}
                                                    onChange={(e) => updateSession(index, { enabled: e.target.checked })}
                                                />
                                                Active
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removeSession(index)}
                                                className="rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-700/60">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">Jitsi Meet</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Les rendez-vous en ligne utilisent Jitsi Meet. Aucun compte Google n&apos;est requis pour créer les liens.
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                            Actif
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300">
                                        {meetingProviderStatus.baseUrl}
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm dark:border-dark-600 dark:bg-dark-800">
                                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Provider</p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{meetingProviderStatus.provider}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm dark:border-dark-600 dark:bg-dark-800">
                                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Room Prefix</p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{meetingProviderStatus.roomPrefix}</p>
                                    </div>
                                </div>
                                <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                                    Le lien Jitsi est créé uniquement après validation du médecin. Les patients peuvent réserver en ligne sans connexion Google.
                                </p>
                            </div>

                            <StatusMessage message={messages.consultations} />
                            <button onClick={saveConsultationSettings} disabled={saving.consultations} className="btn-primary disabled:opacity-60">
                                {saving.consultations ? 'Saving...' : 'Save Consultation Settings'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Password change is active. MFA status is persisted for the account.</p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-700">
                                <h3 className="mb-4 font-medium text-gray-900 dark:text-white">Change Password</h3>
                                <div className="space-y-4">
                                    <input
                                        type="password"
                                        placeholder="Current password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                        className="input-field"
                                    />
                                    <input
                                        type="password"
                                        placeholder="New password"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        className="input-field"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="input-field"
                                    />
                                    <StatusMessage message={messages.password} />
                                    <button onClick={savePassword} disabled={saving.password} className="btn-primary disabled:opacity-60">
                                        {saving.password ? 'Saving...' : 'Change Password'}
                                    </button>
                                </div>
                            </div>

                            <ToggleSetting
                                title="Two-Factor Authentication"
                                description="Track whether MFA is enabled for this account."
                                checked={mfaEnabled}
                                onChange={() => setMfaEnabled((prev) => !prev)}
                            />

                            <StatusMessage message={messages.security} />
                            <button onClick={saveSecurity} disabled={saving.security} className="btn-secondary disabled:opacity-60">
                                {saving.security ? 'Saving...' : 'Save Security'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.appearanceTitle')}</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Theme preference is synchronized between frontend and backend.</p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-700">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.languageTitle')}</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.languageDescription')}</p>
                                    </div>
                                    <LanguageSwitch />
                                </div>
                            </div>

                            <ToggleSetting
                                title={t('settings.darkMode')}
                                description={t('settings.themeTitle')}
                                checked={appearanceForm.darkMode}
                                onChange={() => setAppearanceForm((prev) => ({ ...prev, darkMode: !prev.darkMode }))}
                            />

                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-700">
                                <h3 className="mb-4 font-medium text-gray-900 dark:text-white">{t('settings.accentColor')}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {accentColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setAppearanceForm((prev) => ({ ...prev, accentColor: color }))}
                                            className={`h-10 w-10 rounded-full ring-2 ring-offset-2 transition-all ${
                                                appearanceForm.accentColor === color ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Selected color: {appearanceForm.accentColor}</p>
                            </div>

                            <StatusMessage message={messages.appearance} />
                            <button onClick={saveAppearance} disabled={saving.appearance} className="btn-primary disabled:opacity-60">
                                {saving.appearance ? t('common.saving') : t('common.save')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, className = '', children }) => (
    <div className={className}>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {children}
    </div>
);

const StatusMessage = ({ message }) => {
    if (!message) {
        return null;
    }

    return (
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
    );
};

const ToggleSetting = ({ title, description, checked, onChange }) => (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-dark-700">
        <div className="pr-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <button
            onClick={onChange}
            className={`relative h-8 w-14 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
        >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
);

export default Settings;
