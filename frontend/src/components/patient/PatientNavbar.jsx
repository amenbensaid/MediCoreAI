import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDisplayName, clearPatientSession, PATIENT_LOGIN_PATH } from '../../utils/authRouting';
import { getAssetUrl } from '../../utils/assets';
import api from '../../services/api';
import LanguageSwitch from '../ui/LanguageSwitch';
import { useI18n } from '../../stores/languageStore';
import { useThemeStore } from '../../stores/themeStore';
import { registerWebPush } from '../../utils/webPush';

const PatientNavbar = ({ user, profile, onLogout }) => {
    const navigate = useNavigate();
    const { language, t, setLanguageScope } = useI18n();
    const { setThemeScope } = useThemeStore();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notificationsRef = useRef(null);
    const userDropdownRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;
    const greeting = new Date().getHours() >= 18 || new Date().getHours() < 5
        ? t('patient.goodEvening')
        : t('patient.goodMorning');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user) {
            setLanguageScope(user);
            setThemeScope(user);
            registerWebPush({ patientToken: localStorage.getItem('patient-token') }).catch(() => {});
            const token = localStorage.getItem('patient-token');
            if (token) {
                api.get('/public/notifications', { headers: { Authorization: `Bearer ${token}` } })
                    .then((response) => setNotifications(response.data.data || []))
                    .catch(() => setNotifications([]));
            }
        }
    }, [user]);

    const handleLogoutClick = () => {
        const confirmed = window.confirm(t('common.confirmLogout'));
        if (confirmed) {
            clearPatientSession();
            navigate(PATIENT_LOGIN_PATH, { replace: true });
            if (onLogout) onLogout();
        }
    };

    const handleProfileClick = () => {
        // Redirige vers la page de profil
        navigate('/patient/edit-profile');
        setShowUserDropdown(false);
    };

    const handleSettingsClick = () => {
        // Redirige vers la page de paramètres
        navigate('/patient/settings');
        setShowUserDropdown(false);
    };

    const handleHelpClick = () => {
        navigate('/patient/settings#help');
        setShowUserDropdown(false);
    };

    return (
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo et branding */}
                    <div className="flex items-center gap-4">
                        <Link to="/patient/portal" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center transform transition-transform group-hover:scale-105 shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">MediCore</span>
                                <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">{t('patient.badge')}</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation centrale */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/doctors" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                            {t('nav.findDoctor')}
                        </Link>
                        <Link to="/patient/book" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                            {t('nav.bookAppointment')}
                        </Link>
                    </nav>

                    {/* Actions à droite */}
                    <div className="flex items-center gap-4">
                        <LanguageSwitch compact className="hidden sm:inline-flex" />

                        {/* Notifications */}
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown notifications */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.notifications')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('common.unreadCount', { count: unreadCount })}
                                        </p>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    onClick={async () => {
                                                        if (!notification.read) {
                                                            const token = localStorage.getItem('patient-token');
                                                            await api.patch(`/public/notifications/${notification.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                                                            setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, read: true } : item));
                                                        }
                                                        if (notification.url) navigate(notification.url);
                                                        setShowNotifications(false);
                                                    }}
                                                    className={`p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-2xl">{notification.type === 'appointment' ? '📅' : notification.type === 'warning' ? '⚠️' : '🔔'}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{notification.title}</p>
                                                            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{notification.message}</p>
                                                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">{new Date(notification.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')}</p>
                                                        </div>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <div className="text-4xl mb-3">🔔</div>
                                                <p className="text-gray-500 dark:text-gray-400">{t('common.noNotifications')}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                                        <button className="w-full text-center text-sm text-primary-500 hover:text-primary-600 font-medium">
                                            {t('patient.viewAllNotifications')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Menu utilisateur */}
                        <div className="relative" ref={userDropdownRef}>
                            <button
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center text-white font-semibold text-sm">
                                    {profile?.avatarUrl || user?.avatarUrl ? (
                                        <img src={getAssetUrl(profile?.avatarUrl || user?.avatarUrl)} alt={t('patient.profileAlt')} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                                    )}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{getDisplayName(user)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{greeting}</p>
                                </div>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown utilisateur */}
                            {showUserDropdown && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                                        <p className="font-medium text-gray-900 dark:text-white">{getDisplayName(user)}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <div className="py-2">
                                        <button
                                            onClick={handleProfileClick}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {t('common.profile')}
                                        </button>
                                        <button
                                            onClick={handleSettingsClick}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {t('common.settings')}
                                        </button>
                                        <button
                                            onClick={handleHelpClick}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('common.help')}
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-slate-700 p-2">
                                        <button
                                            onClick={handleLogoutClick}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            {t('common.logout')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Menu mobile */}
                        <button className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PatientNavbar;
