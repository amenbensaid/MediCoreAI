import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { user, logout } = useAuthStore();
    const { isDarkMode, toggleTheme, initializeTheme } = useThemeStore();
    const location = useLocation();

    useEffect(() => {
        initializeTheme();
    }, []);

    const isAdmin = user?.role === 'admin' || user?.clinicRole === 'admin';
    const isDemoAdmin = user?.email === 'admin@medicore.ai';

    const notifications = [
        { id: 1, type: 'warning', title: 'No-show risk', message: '3 patients have high no-show probability today', time: '5 min ago' },
        { id: 2, type: 'info', title: 'New appointment', message: 'New appointment scheduled for tomorrow at 10:00', time: '15 min ago' },
        { id: 3, type: 'success', title: 'Payment received', message: 'Invoice INV-2026-00012 has been paid', time: '1 hour ago' },
        { id: 4, type: 'info', title: 'AI Insight', message: 'Monthly revenue target exceeded by 12%', time: '2 hours ago' },
    ];

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        ...(isDemoAdmin || user?.clinicType === 'veterinary' 
            ? [{ name: 'Animals', href: '/animals', icon: BugAntIcon }] 
            : [{ name: 'Patients', href: '/patients', icon: UsersIcon }]),
        ...(isDemoAdmin ? [{ name: 'Patients', href: '/patients', icon: UsersIcon }] : []),
        { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
        { name: 'Calendar', href: '/calendar', icon: CalendarDaysIcon },
        { name: 'Billing', href: '/invoices', icon: DocumentIcon },
        { name: 'Analytics', href: '/analytics', icon: ChartIcon },
        ...(isDemoAdmin || user?.clinicType === 'dental' ? [{ name: 'Dental', href: '/dental', icon: SparklesIcon }] : []),
        ...(isDemoAdmin || user?.clinicType === 'aesthetic' ? [{ name: 'Aesthetic', href: '/aesthetic', icon: CubeTransparentIcon }] : []),
        ...(isDemoAdmin || user?.clinicType === 'veterinary' ? [{ name: 'Veterinary', href: '/veterinary', icon: SparklesIcon }] : []),
        ...(isAdmin ? [{ name: 'Demo Requests', href: '/admin/demo-requests', icon: ClipboardCheckIcon }] : []),
        { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-700">
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

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-dark-700">
                    <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center text-white font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Top header */}
                <header className="h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    {/* Mobile menu button */}
                    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Search */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search patients, appointments..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
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
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>

                            {/* Notification dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full font-medium">
                                                {notifications.length} new
                                            </span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-700">
                                            {notifications.map(notif => (
                                                <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                                            notif.type === 'warning' ? 'bg-yellow-500' :
                                                            notif.type === 'success' ? 'bg-green-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notif.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-700 text-center">
                                            <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                                                View all notifications
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Logout */}
                        <button onClick={logout} className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700" title="Logout">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
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
