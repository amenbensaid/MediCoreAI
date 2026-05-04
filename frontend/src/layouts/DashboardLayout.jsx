import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';
import { canAccessModule, isClinicAdmin } from '../utils/access';
import { getLoginPathForUser } from '../utils/authRouting';
import Avatar from '../components/ui/Avatar';
import LanguageSwitch from '../components/ui/LanguageSwitch';
import { useI18n } from '../stores/languageStore';
import { registerWebPush } from '../utils/webPush';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState({ patients: [], appointments: [] });
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef(null);
    const { user, logout } = useAuthStore();
    const { isDarkMode, toggleTheme, initializeTheme } = useThemeStore();
    const { language, t, setLanguageScope } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();
    const unreadNotifications = notifications.filter((notification) => !notification.read);

    useEffect(() => {
        if (user) {
            initializeTheme(user);
            setLanguageScope(user);
            registerWebPush().catch(() => {});
        }
    }, [user]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications');
                setNotifications(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch dashboard notifications:', error);
            }
        };

        fetchNotifications();
        const interval = window.setInterval(fetchNotifications, 30000);
        return () => window.clearInterval(interval);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const query = searchTerm.trim();
        if (query.length < 2) {
            setSearchResults({ patients: [], appointments: [] });
            setSearching(false);
            return;
        }

        let active = true;
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const [patientsResponse, appointmentsResponse] = await Promise.all([
                    api.get('/patients', { params: { search: query, limit: 5, isActive: 'all' } }),
                    api.get('/appointments', { params: { search: query, limit: 5 } })
                ]);

                if (!active) return;

                setSearchResults({
                    patients: patientsResponse.data.data?.patients || [],
                    appointments: appointmentsResponse.data.data?.appointments || []
                });
            } catch (error) {
                if (active) {
                    setSearchResults({ patients: [], appointments: [] });
                }
            } finally {
                if (active) {
                    setSearching(false);
                }
            }
        }, 250);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [searchTerm]);

    const isAdmin = isClinicAdmin(user);
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const closeSearch = () => {
        setSearchOpen(false);
        setSearchTerm('');
        setSearchResults({ patients: [], appointments: [] });
    };

    const goToSearchResult = (path) => {
        navigate(path);
        closeSearch();
    };

    const handleLogout = () => {
        const confirmed = window.confirm(t('common.confirmLogout'));
        if (!confirmed) {
            return;
        }

        const loginPath = getLoginPathForUser(user);
        logout();
        navigate(loginPath, { replace: true });
    };

    const navigation = [
        ...(canAccessModule(user, 'dashboard') ? [{ name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon }] : []),
        ...(canAccessModule(user, 'platformAccounts') ? [{ name: t('nav.platformAccounts'), href: '/admin/accounts', icon: UsersIcon }] : []),
        ...(isAdmin ? [{ name: t('nav.adminDoctors'), href: '/admin/doctors', icon: UserBadgeIcon }] : []),
        ...(canAccessModule(user, 'patients') ? [{ name: t('nav.patients'), href: '/patients', icon: UsersIcon }] : []),
        ...(canAccessModule(user, 'animals') ? [{ name: t('nav.animals'), href: '/animals', icon: BugAntIcon }] : []),
        ...(canAccessModule(user, 'appointments') ? [{ name: t('nav.appointments'), href: '/appointments', icon: CalendarIcon }] : []),
        ...(canAccessModule(user, 'calendar') ? [{ name: t('nav.calendar'), href: '/calendar', icon: CalendarDaysIcon }] : []),
        ...(canAccessModule(user, 'teleconsultations') ? [{ name: t('nav.teleconsultations'), href: '/teleconsultations', icon: VideoCameraIcon }] : []),
        ...(canAccessModule(user, 'reviews') ? [{ name: t('nav.reviews'), href: '/reviews', icon: StarIcon }] : []),
        ...(canAccessModule(user, 'billing') ? [{ name: t('nav.billing'), href: '/invoices', icon: DocumentIcon }] : []),
        ...(canAccessModule(user, 'analytics') ? [{ name: t('nav.analytics'), href: '/analytics', icon: ChartIcon }] : []),
        ...(canAccessModule(user, 'dental') ? [{ name: t('nav.dental'), href: '/dental', icon: SparklesIcon }] : []),
        ...(canAccessModule(user, 'aesthetic') ? [{ name: t('nav.aesthetic'), href: '/aesthetic', icon: CubeTransparentIcon }] : []),
        ...(canAccessModule(user, 'veterinary') ? [{ name: t('nav.veterinary'), href: '/veterinary', icon: SparklesIcon }] : []),
        ...(isAdmin ? [{ name: t('nav.demoRequests'), href: '/admin/demo-requests', icon: ClipboardCheckIcon }] : []),
        ...(canAccessModule(user, 'settings') ? [{ name: t('nav.settings'), href: '/settings', icon: SettingsIcon }] : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-900 transition-colors duration-300">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full bg-white dark:bg-dark-800 border-r border-slate-200 dark:border-dark-700 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        {sidebarOpen && <span className="text-xl font-bold text-gray-900 dark:text-white">MediCore</span>}
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.name}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* User section - Minimal */}
                <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-dark-700">
                    {/* Patient Portal Link */}
                    <a href="/patient/login" target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-3 mx-4 mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-medical-500/10 to-primary-500/10 border border-medical-500/20 hover:from-medical-500/20 hover:to-primary-500/20 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}>
                        <svg className="w-5 h-5 text-medical-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {sidebarOpen && <span className="text-sm font-medium text-medical-600 dark:text-medical-400">{t('common.patientPortal')}</span>}
                    </a>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Top header */}
                <header className="h-16 bg-white/90 backdrop-blur dark:bg-dark-800 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    {/* Mobile menu button */}
                    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Search */}
                    <div className="flex-1 max-w-md mx-4" ref={searchRef}>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder={t('dashboard.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setSearchOpen(true);
                                }}
                                onFocus={() => setSearchOpen(true)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-dark-700 border-0 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500"
                            />
                            {searchOpen && searchTerm && (
                                <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-2xl z-50 overflow-hidden">
                                    {searchTerm.trim().length < 2 ? (
                                        <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {t('dashboard.searchHint')}
                                        </div>
                                    ) : searching ? (
                                        <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {t('dashboard.searching')}
                                        </div>
                                    ) : searchResults.patients.length === 0 && searchResults.appointments.length === 0 ? (
                                        <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {t('dashboard.noSearchResults')}
                                        </div>
                                    ) : (
                                        <div className="max-h-96 overflow-y-auto py-2">
                                            {searchResults.patients.length > 0 && (
                                                <div className="py-1">
                                                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.searchPatients')}</p>
                                                    {searchResults.patients.map((patient) => (
                                                        <button
                                                            key={patient.id}
                                                            type="button"
                                                            onClick={() => goToSearchResult(`/patients/${patient.id}`)}
                                                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                                                        >
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.fullName}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{patient.email || patient.phone || patient.patientNumber}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {searchResults.appointments.length > 0 && (
                                                <div className="py-1 border-t border-slate-100 dark:border-dark-700">
                                                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.searchAppointments')}</p>
                                                    {searchResults.appointments.map((appointment) => (
                                                        <button
                                                            key={appointment.id}
                                                            type="button"
                                                            onClick={() => goToSearchResult(`/appointments?patientId=${appointment.patientId || appointment.patient?.id || ''}`)}
                                                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                                                        >
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{appointment.patient?.fullName || appointment.patientName || appointment.type}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {appointment.type || appointment.appointmentType} - {appointment.start ? new Date(appointment.start).toLocaleString(locale) : ''}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        <LanguageSwitch compact className="hidden sm:inline-flex" />

                        {/* Theme toggle */}
                        <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                            {isDarkMode ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 relative"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadNotifications.length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </button>

                            {/* Notification dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.notifications')}</h3>
                                            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full font-medium">
                                                {t('common.newCount', { count: unreadNotifications.length })}
                                            </span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-700">
                                            {notifications.length > 0 ? notifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    onClick={async () => {
                                                        if (!notif.read) {
                                                            await api.patch(`/notifications/${notif.id}/read`).catch(() => {});
                                                            setNotifications((prev) => prev.map((item) => item.id === notif.id ? { ...item, read: true, readAt: new Date().toISOString() } : item));
                                                        }
                                                        if (notif.url) navigate(notif.url);
                                                        setShowNotifications(false);
                                                    }}
                                                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer ${!notif.read ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                                            notif.type === 'warning' ? 'bg-yellow-500' :
                                                            notif.type === 'success' ? 'bg-green-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR') : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                                                    {t('common.noNotifications')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Profile Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-all"
                            >
                                <Avatar
                                    src={user?.avatarUrl}
                                    firstName={user?.firstName}
                                    lastName={user?.lastName}
                                    size="sm"
                                    alt={t('patient.profileAlt')}
                                />
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 z-50 overflow-hidden">
                                        <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-700">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={user?.avatarUrl}
                                                    firstName={user?.firstName}
                                                    lastName={user?.lastName}
                                                    size="md"
                                                    alt={t('patient.profileAlt')}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {user?.firstName} {user?.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-2">
                                            <button
                                                onClick={() => { navigate('/doctor/profile'); setShowProfileMenu(false); }}
                                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                            >
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {t('common.profile')}
                                            </button>
                                            <button
                                                onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                            >
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {t('common.settings')}
                                            </button>
                                        </div>
                                        <div className="py-2 border-t border-gray-100 dark:border-dark-700">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                {t('common.logout')}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// Icons
const HomeIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const UsersIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const UserBadgeIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 20.25a7.5 7.5 0 0115 0" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 4.5h3m-1.5-1.5v3" />
    </svg>
);

const CalendarIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CalendarDaysIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
);

const DocumentIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const StarIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.02 6.214a1 1 0 00.95.69h6.534c.969 0 1.371 1.24.588 1.81l-5.286 3.84a1 1 0 00-.364 1.118l2.019 6.214c.3.922-.755 1.688-1.538 1.118l-5.286-3.84a1 1 0 00-1.176 0l-5.286 3.84c-.783.57-1.838-.196-1.538-1.118l2.019-6.214a1 1 0 00-.364-1.118l-5.286-3.84c-.783-.57-.38-1.81.588-1.81h6.534a1 1 0 00.95-.69l2.02-6.214z" />
    </svg>
);

const VideoCameraIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 5h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const ChartIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const SparklesIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
);

const CubeTransparentIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22V12m0 0l9-5.2m-9 5.2L3 6.8" />
    </svg>
);

const BugAntIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const SettingsIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClipboardCheckIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l2 2 4-4" />
    </svg>
);

export default DashboardLayout;
