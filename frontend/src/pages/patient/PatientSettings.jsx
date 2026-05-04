import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import { useI18n } from '../../stores/languageStore';
import { useThemeStore } from '../../stores/themeStore';
import {
    PATIENT_LOGIN_PATH,
    clearPatientSession,
    getDisplayName,
    isPatientSessionActive
} from '../../utils/authRouting';

const PatientSettings = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useI18n();
    const { isDarkMode, setTheme } = useThemeStore();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    
    // Settings states
    const [settings, setSettings] = useState({
        emailNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        labResultsNotifications: true,
        marketingEmails: false,
        language: 'fr',
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        theme: isDarkMode ? 'dark' : 'light',
        twoFactorEnabled: false,
        sessionTimeout: '30min'
    });

    const getSettingsKey = (patientUser = user) => {
        const identifier = patientUser?.id || patientUser?.email || 'anonymous';
        return `patient-settings:${identifier}`;
    };

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData || !isPatientSessionActive()) { 
            navigate(PATIENT_LOGIN_PATH); 
            return; 
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchProfileAndSettings(token, parsedUser);
    }, []);

    useEffect(() => {
        if (!loading && location.hash === '#help') {
            document.getElementById('patient-help')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [loading, location.hash]);

    const fetchProfileAndSettings = async (token, patientUser) => {
        try {
            const [profileRes] = await Promise.all([
                api.get('/public/my-profile', { 
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setProfile(profileRes.data.data);
            
            // Load settings from localStorage or use defaults
            const savedSettings = localStorage.getItem(getSettingsKey(patientUser));
            if (savedSettings) {
                setSettings({ ...settings, ...JSON.parse(savedSettings) });
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            setFeedback({ type: 'error', message: t('patientSettings.loadError') });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            // Save settings to localStorage (in a real app, this would be saved to backend)
            localStorage.setItem(getSettingsKey(), JSON.stringify(settings));
            
            setTheme(settings.theme === 'dark' ? 'dark' : 'light');
            
            setFeedback({ type: 'success', message: t('patientSettings.saved') });
        } catch (err) {
            setFeedback({ type: 'error', message: t('patientSettings.saveError') });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        clearPatientSession();
        navigate(PATIENT_LOGIN_PATH, { replace: true });
    };

    const handleDeleteAccount = () => {
        const confirmed = window.confirm(
            t('patientSettings.deleteConfirm')
        );
        if (confirmed) {
            // In a real app, this would call an API endpoint
            clearPatientSession();
            navigate(PATIENT_LOGIN_PATH, { replace: true });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />
            
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <Link 
                            to="/patient/portal" 
                            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('patientSettings.backToDashboard')}
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-medical-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            ⚙️
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('patientSettings.title')}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {t('patientSettings.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                {feedback.message && (
                    <div className={`rounded-xl border px-4 py-3 text-sm mb-6 ${
                        feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Notifications */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {t('patientSettings.notifications.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {t('patientSettings.notifications.subtitle')}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.notifications.email')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.notifications.emailDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.emailNotifications ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.notifications.sms')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.notifications.smsDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, smsNotifications: !settings.smsNotifications })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.smsNotifications ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.notifications.appointments')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.notifications.appointmentsDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, appointmentReminders: !settings.appointmentReminders })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.appointmentReminders ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.appointmentReminders ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.notifications.labResults')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.notifications.labResultsDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, labResultsNotifications: !settings.labResultsNotifications })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.labResultsNotifications ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.labResultsNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.notifications.marketing')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.notifications.marketingDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, marketingEmails: !settings.marketingEmails })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.marketingEmails ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.marketingEmails ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                {t('patientSettings.preferences.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {t('patientSettings.preferences.subtitle')}
                            </p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('common.language')}
                                </label>
                                <LanguageSwitch />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('patientSettings.preferences.timezone')}
                                </label>
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                >
                                    <option value="Europe/Paris">Europe/Paris</option>
                                    <option value="Europe/London">Europe/London</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                                </select>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientSettings.preferences.dateFormat')}
                                    </label>
                                    <select
                                        value={settings.dateFormat}
                                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    >
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientSettings.preferences.timeFormat')}
                                    </label>
                                    <select
                                        value={settings.timeFormat}
                                        onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    >
                                        <option value="24h">{t('patientSettings.preferences.twentyFourHours')}</option>
                                        <option value="12h">{t('patientSettings.preferences.twelveHours')}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('patientSettings.preferences.theme')}
                                </label>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            setSettings({ ...settings, theme: 'light' });
                                            setTheme('light');
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            settings.theme === 'light'
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="w-8 h-8 bg-white border border-gray-300 rounded mb-2 mx-auto"></div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('patientSettings.preferences.light')}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSettings({ ...settings, theme: 'dark' });
                                            setTheme('dark');
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            settings.theme === 'dark'
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="w-8 h-8 bg-gray-800 border border-gray-600 rounded mb-2 mx-auto"></div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('patientSettings.preferences.dark')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                {t('patientSettings.security.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {t('patientSettings.security.subtitle')}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-gray-900 dark:text-white">{t('patientSettings.security.twoFactor')}</label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientSettings.security.twoFactorDescription')}</p>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, twoFactorEnabled: !settings.twoFactorEnabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.twoFactorEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('patientSettings.security.sessionTimeout')}
                                </label>
                                <select
                                    value={settings.sessionTimeout}
                                    onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                >
                                    <option value="15min">15 minutes</option>
                                    <option value="30min">30 minutes</option>
                                    <option value="1hour">{t('patientSettings.security.oneHour')}</option>
                                    <option value="4hours">{t('patientSettings.security.fourHours')}</option>
                                    <option value="never">{t('patientSettings.security.never')}</option>
                                </select>
                            </div>
                            <div className="pt-4 space-y-3">
                                <button className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                    {t('patientSettings.security.changePassword')}
                                </button>
                                <Link 
                                    to="/patient/edit-profile"
                                    className="block w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-center"
                                >
                                    {t('patientSettings.security.editProfile')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Help */}
                    <div id="patient-help" className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('patientSettings.help.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {t('patientSettings.help.subtitle')}
                            </p>
                        </div>
                        <div className="p-6 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
                                <div className="text-2xl mb-3">?</div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{t('patientSettings.help.faqTitle')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('patientSettings.help.faqDescription')}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
                                <div className="text-2xl mb-3">@</div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{t('patientSettings.help.contactTitle')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('patientSettings.help.contactDescription')}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
                                <div className="text-2xl mb-3">#</div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{t('patientSettings.help.privacyTitle')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('patientSettings.help.privacyDescription')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
                        <div className="p-6 border-b border-red-200 dark:border-red-800">
                            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 flex items-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                {t('patientSettings.danger.title')}
                            </h2>
                            <p className="text-red-600 dark:text-red-400 mt-2">
                                {t('patientSettings.danger.subtitle')}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-red-700 dark:text-red-300">{t('patientSettings.danger.deleteAccount')}</p>
                                    <p className="text-sm text-red-600 dark:text-red-400">{t('patientSettings.danger.deleteDescription')}</p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                                >
                                    {t('patientSettings.danger.deleteButton')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {t('patientSettings.saveSettings')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PatientSettings;
