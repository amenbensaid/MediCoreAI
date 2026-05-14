import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import {
    PATIENT_LOGIN_PATH,
    clearPatientSession,
    isPatientSessionActive
} from '../../utils/authRouting';
import { registerWebPush } from '../../utils/webPush';
import { useI18n } from '../../stores/languageStore';

const copy = {
    fr: {
        back: 'Retour au tableau de bord',
        title: 'Notifications',
        subtitle: 'Suivez les confirmations, rappels et demandes importantes de votre parcours patient.',
        unread: 'Non lues',
        total: 'Total',
        appointments: 'Rendez-vous',
        reminders: 'Rappels',
        enablePush: 'Activer le push web',
        pushEnabled: 'Notifications push activées sur ce navigateur.',
        pushUnavailable: 'Push web indisponible ou non configuré.',
        pushDenied: 'Permission refusée pour ce navigateur.',
        pushError: 'Impossible d\'activer le push web.',
        markAllRead: 'Tout marquer comme lu',
        emptyTitle: 'Aucune notification',
        emptyText: 'Les confirmations et rappels apparaîtront ici.',
        filterAll: 'Toutes',
        filterUnread: 'Non lues',
        filterAppointment: 'Rendez-vous',
        read: 'Lu',
        unreadBadge: 'Nouveau',
        open: 'Ouvrir'
    },
    en: {
        back: 'Back to dashboard',
        title: 'Notifications',
        subtitle: 'Track confirmations, reminders, and important requests from your patient journey.',
        unread: 'Unread',
        total: 'Total',
        appointments: 'Appointments',
        reminders: 'Reminders',
        enablePush: 'Enable web push',
        pushEnabled: 'Push notifications enabled on this browser.',
        pushUnavailable: 'Web push is unavailable or not configured.',
        pushDenied: 'Permission denied for this browser.',
        pushError: 'Unable to enable web push.',
        markAllRead: 'Mark all as read',
        emptyTitle: 'No notifications',
        emptyText: 'Confirmations and reminders will appear here.',
        filterAll: 'All',
        filterUnread: 'Unread',
        filterAppointment: 'Appointments',
        read: 'Read',
        unreadBadge: 'New',
        open: 'Open'
    }
};

const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('patient-token')}`
});

const PatientNotifications = () => {
    const navigate = useNavigate();
    const { language } = useI18n();
    const t = copy[language === 'en' ? 'en' : 'fr'];
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [pushLoading, setPushLoading] = useState(false);

    const stats = useMemo(() => {
        const unread = notifications.filter((item) => !item.read).length;
        const appointments = notifications.filter((item) => item.type === 'appointment').length;
        const reminders = notifications.filter((item) => ['reminder', 'warning'].includes(item.type)).length;
        return { unread, appointments, reminders, total: notifications.length };
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') return notifications.filter((item) => !item.read);
        if (filter === 'appointment') return notifications.filter((item) => item.type === 'appointment');
        return notifications;
    }, [filter, notifications]);

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData || !isPatientSessionActive()) {
            navigate(PATIENT_LOGIN_PATH);
            return;
        }
        setUser(JSON.parse(userData));
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = getAuthHeaders();
            const params = { _ts: Date.now() };
            const [notificationsRes, profileRes] = await Promise.all([
                api.get('/public/notifications', { headers, params }),
                api.get('/public/my-profile', { headers, params }).catch(() => null)
            ]);
            setNotifications(notificationsRes.data.data || []);
            if (profileRes) setProfile(profileRes.data.data);
        } catch (error) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearPatientSession();
        navigate(PATIENT_LOGIN_PATH, { replace: true });
    };

    const markAsRead = async (notificationId) => {
        await api.patch(`/public/notifications/${notificationId}/read`, {}, {
            headers: getAuthHeaders()
        }).catch(() => {});
        setNotifications((prev) => prev.map((item) => (
            item.id === notificationId ? { ...item, read: true } : item
        )));
    };

    const markAllRead = async () => {
        const unreadItems = notifications.filter((item) => !item.read);
        await Promise.all(unreadItems.map((item) => markAsRead(item.id)));
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) await markAsRead(notification.id);
        if (notification.url) {
            if (/^https?:\/\//.test(notification.url)) {
                window.location.href = notification.url;
                return;
            }
            navigate(notification.url);
        }
    };

    const handleEnablePush = async () => {
        setPushLoading(true);
        setFeedback({ type: '', message: '' });
        try {
            const result = await registerWebPush({ patientToken: localStorage.getItem('patient-token') });
            if (result.enabled) {
                setFeedback({ type: 'success', message: t.pushEnabled });
            } else if (result.reason === 'permission_denied' || result.reason === 'permission_not_granted') {
                setFeedback({ type: 'error', message: t.pushDenied });
            } else {
                setFeedback({ type: 'error', message: t.pushUnavailable });
            }
        } catch (error) {
            setFeedback({ type: 'error', message: t.pushError });
        } finally {
            setPushLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <Link to="/patient/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300">
                    <span aria-hidden="true">←</span>
                    {t.back}
                </Link>

                <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-primary-500">{t.title}</p>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-5xl">{t.title}</h1>
                            <p className="mt-3 max-w-2xl text-gray-500 dark:text-gray-400">{t.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleEnablePush}
                                disabled={pushLoading}
                                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {pushLoading ? '...' : t.enablePush}
                            </button>
                            {stats.unread > 0 && (
                                <button type="button" onClick={markAllRead} className="btn-primary">
                                    {t.markAllRead}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {feedback.message && (
                    <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                        feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label={t.total} value={stats.total} color="primary" />
                    <StatCard label={t.unread} value={stats.unread} color="amber" />
                    <StatCard label={t.appointments} value={stats.appointments} color="green" />
                    <StatCard label={t.reminders} value={stats.reminders} color="cyan" />
                </div>

                <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-6">
                    <div className="mb-5 flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: t.filterAll },
                            { key: 'unread', label: t.filterUnread },
                            { key: 'appointment', label: t.filterAppointment }
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilter(item.key)}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                    filter === item.key
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-700 dark:bg-slate-900/40 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <div className="spinner" />
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    language={language}
                                    labels={t}
                                    onOpen={() => handleNotificationClick(notification)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{t.emptyTitle}</h2>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">{t.emptyText}</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

const StatCard = ({ label, value, color }) => {
    const colorClasses = {
        primary: 'bg-primary-500',
        amber: 'bg-amber-500',
        green: 'bg-green-500',
        cyan: 'bg-cyan-500'
    };

    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className={`mb-5 h-1.5 w-16 rounded-full ${colorClasses[color] || colorClasses.primary}`} />
            <p className="text-4xl font-black text-gray-900 dark:text-white">{value}</p>
            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

const NotificationItem = ({ notification, language, labels, onOpen }) => (
    <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-2xl border p-4 text-left transition hover:border-primary-200 hover:bg-primary-50 dark:hover:border-primary-800 dark:hover:bg-primary-900/20 ${
            notification.read
                ? 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900/20'
                : 'border-primary-100 bg-primary-50/70 dark:border-primary-900/50 dark:bg-primary-900/20'
        }`}
    >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    notification.type === 'appointment'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                        : notification.type === 'warning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a3 3 0 006 0" />
                    </svg>
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-gray-900 dark:text-white">{notification.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            notification.read
                                ? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
                                : 'bg-primary-600 text-white'
                        }`}>
                            {notification.read ? labels.read : labels.unreadBadge}
                        </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{notification.message}</p>
                    <p className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                        {new Date(notification.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')}
                    </p>
                </div>
            </div>
            {notification.url && (
                <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-bold text-primary-600 shadow-sm dark:bg-slate-800 dark:text-primary-300">
                    {labels.open}
                </span>
            )}
        </div>
    </button>
);

export default PatientNotifications;
