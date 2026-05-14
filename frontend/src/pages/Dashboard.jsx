import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getDisplayName } from '../utils/authRouting';
import { useI18n } from '../stores/languageStore';

const getRoleTranslationKey = (user) => {
    if (user?.role === 'patient') return 'patient';
    if (user?.role === 'admin') return 'admin';
    if (user?.clinicRole === 'admin') return 'clinicAdmin';
    if (user?.role === 'practitioner') return 'practitioner';
    if (user?.role === 'secretary') return 'secretary';
    if (user?.role === 'receptionist') return 'receptionist';
    return 'user';
};

const extractFirstNumber = (value) => String(value || '').match(/\d+/)?.[0] || '0';
const extractGrowth = (value) => String(value || '').match(/[+-]?\d+(?:[.,]\d+)?%/)?.[0] || '0%';
const weekdayKeys = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

const Dashboard = () => {
    const { user } = useAuthStore();
    const { language, t } = useI18n();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [waitlistEntries, setWaitlistEntries] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [chartData, setChartData] = useState({ revenue: [], appointments: [] });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [response, waitlistResponse] = await Promise.all([
                api.get('/dashboard'),
                api.get('/appointments/waitlist', { params: { status: 'active' } }).catch(() => ({ data: { data: [] } }))
            ]);
            setStats(response.data.data.stats);
            setUpcomingAppointments(response.data.data.upcomingAppointments);
            setWaitlistEntries(waitlistResponse.data.data || []);
            setAlerts(response.data.data.alerts || []);
            setChartData(response.data.data.charts || { revenue: [], appointments: [] });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const roleLabel = t(`dashboard.roles.${getRoleTranslationKey(user)}`);
    const isClinicAdmin = user?.role === 'admin' || user?.clinicRole === 'admin';
    const isPractitioner = user?.role === 'practitioner';
    const isSecretary = user?.role === 'secretary' || user?.role === 'receptionist';
    const isEnglish = language === 'en';
    const awaitingCount = upcomingAppointments.filter((appointment) => (
        appointment.status === 'awaiting_approval' || appointment.status === 'scheduled'
    )).length;
    const greeting = new Date().getHours() >= 18 || new Date().getHours() < 5
        ? t('dashboard.goodEvening')
        : t('dashboard.goodMorning');

    const localizeChartRows = (rows) => rows.map((row) => ({
        ...row,
        name: weekdayKeys.has(row.name) ? t(`dashboard.days.${row.name}`) : row.name
    }));

    const localizedRevenue = useMemo(() => localizeChartRows(chartData.revenue || []), [chartData.revenue, language]);
    const localizedAppointments = useMemo(() => localizeChartRows(chartData.appointments || []), [chartData.appointments, language]);
    const displayedWaitlist = waitlistEntries.slice(0, 3);

    const getWaitlistDateKey = (entry) => {
        if (!entry?.startTime) return '';
        const datePart = String(entry.startTime).split('T')[0];
        return datePart || '';
    };

    const formatWaitlistTime = (entry) => {
        if (!entry?.startTime) return '';
        return new Date(entry.startTime).toLocaleString(locale, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAlertContent = (alert) => {
        switch (alert.id) {
            case 'overdue-invoices':
                return {
                    title: t('dashboard.alertMessages.overdueInvoicesTitle'),
                    message: t('dashboard.alertMessages.overdueInvoices', { count: extractFirstNumber(alert.message) })
                };
            case 'scheduled-today':
                return {
                    title: t('dashboard.alertMessages.scheduledTodayTitle'),
                    message: t('dashboard.alertMessages.scheduledToday', { count: extractFirstNumber(alert.message) })
                };
            case 'low-stock':
                return {
                    title: t('dashboard.alertMessages.lowStockTitle'),
                    message: t('dashboard.alertMessages.lowStock', { count: extractFirstNumber(alert.message) })
                };
            case 'revenue-growth':
                return {
                    title: t('dashboard.alertMessages.revenueGrowthTitle'),
                    message: t('dashboard.alertMessages.revenueGrowth', { growth: extractGrowth(alert.message) })
                };
            case 'all-clear':
                return {
                    title: t('dashboard.alertMessages.allClearTitle'),
                    message: t('dashboard.alertMessages.allClear')
                };
            default:
                return { title: alert.title, message: alert.message };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">
                        {roleLabel}
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                        {greeting}, {getDisplayName(user)}
                    </h1>
                    <p className="mt-1 text-slate-600 dark:text-gray-400">
                        {isSecretary
                            ? (isEnglish ? 'Front desk priorities, patient requests, schedule and billing follow-up.' : 'Priorités accueil, demandes patients, planning et suivi facturation.')
                            : t('dashboard.overview')}
                    </p>
                </div>
                <div className="flex gap-3">
                    {isClinicAdmin && (
                        <Link to="/admin/doctors" className="btn-secondary">
                            {t('dashboard.manageDoctors')}
                        </Link>
                    )}
                    {isPractitioner && (
                        <Link to="/settings" className="btn-secondary">
                            {t('dashboard.manageSecretaries')}
                        </Link>
                    )}
                    <Link to="/appointments" className="btn-secondary">
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('dashboard.newAppointment')}
                    </Link>
                    <Link to="/patients" className="btn-primary">
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        {t('dashboard.newPatient')}
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={isSecretary ? (isEnglish ? 'Today schedule' : 'Planning du jour') : t('dashboard.stats.todaysAppointments')}
                    value={stats?.appointmentsToday || 0}
                    subtitle={isSecretary ? `${awaitingCount} ${isEnglish ? 'to handle' : 'à traiter'}` : t('dashboard.stats.completed', { count: stats?.appointmentsCompleted || 0 })}
                    icon={<CalendarIcon />}
                    color="primary"
                    trend={stats?.appointmentsTrend}
                />
                <StatCard
                    title={isSecretary ? (isEnglish ? 'Today collections' : 'Encaissements jour') : t('dashboard.stats.todaysRevenue')}
                    value={`${(stats?.revenueToday || 0).toLocaleString(locale)} €`}
                    subtitle={t('dashboard.stats.vsYesterday')}
                    icon={<CurrencyIcon />}
                    color="green"
                    trend={stats?.revenueTrend}
                />
                <StatCard
                    title={isSecretary ? (isEnglish ? 'Patient files' : 'Dossiers patients') : t('dashboard.stats.totalPatients')}
                    value={stats?.totalPatients || 0}
                    subtitle={t('dashboard.stats.thisMonth', { count: stats?.newPatientsMonth || 0 })}
                    icon={<UsersIcon />}
                    color="blue"
                    trend={stats?.patientsTrend}
                />
                <StatCard
                    title={isSecretary ? (isEnglish ? 'To follow up' : 'À relancer') : t('dashboard.stats.outstanding')}
                    value={`${(stats?.pendingInvoicesAmount || 0).toLocaleString(locale)} €`}
                    subtitle={t('dashboard.stats.invoices', { count: stats?.pendingInvoicesCount || 0 })}
                    icon={<InvoiceIcon />}
                    color="orange"
                    trend={stats?.pendingInvoicesTrend}
                />
            </div>

            {isSecretary ? (
                <SecretaryDesk stats={stats} locale={locale} language={language} awaitingCount={awaitingCount} />
            ) : (
                <RevenueSummary stats={stats} locale={locale} language={language} />
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-lg p-6 border border-slate-100 dark:border-dark-700">
                    <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-6">{t('dashboard.charts.revenue')}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={localizedRevenue}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Appointments Chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('dashboard.charts.appointments')}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={localizedAppointments}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Bar dataKey="appts" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-lg dark:border-amber-900/30 dark:bg-dark-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                            {t('dashboard.waitlist.eyebrow')}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
                            {t('dashboard.waitlist.title')}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t('dashboard.waitlist.subtitle')}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-5 py-3 text-center dark:bg-amber-900/20">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">{t('dashboard.waitlist.active')}</p>
                        <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-100">{waitlistEntries.length}</p>
                    </div>
                </div>

                <div className="mt-5 grid gap-3">
                    {displayedWaitlist.length > 0 ? displayedWaitlist.map((entry) => {
                        const dateKey = getWaitlistDateKey(entry);
                        const patientsBefore = Math.max((entry.position || 1) - 1, 0);
                        return (
                            <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-slate-950 dark:text-white">{entry.patientName || t('patient.badge')}</p>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-dark-800 dark:text-amber-200 dark:ring-amber-900/30">
                                            {entry.status === 'offered' ? t('staffCalendar.waitlist.status.offered') : t('staffCalendar.waitlist.status.pending')}
                                        </span>
                                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                            {patientsBefore} {t('staffCalendar.waitlist.before')}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {formatWaitlistTime(entry)} · {entry.appointmentType || 'Consultation'}
                                    </p>
                                    {(entry.reasonDetail || entry.reasonCategory) && (
                                        <p className="mt-2 inline-flex rounded-xl bg-white px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-dark-800 dark:text-slate-200 dark:ring-dark-700">
                                            {entry.reasonDetail || entry.reasonCategory}
                                        </p>
                                    )}
                                </div>
                                <Link to={dateKey ? `/calendar/day/${dateKey}` : '/waitlist'} className="btn-secondary text-center">
                                    {t('dashboard.waitlist.manage')}
                                </Link>
                            </div>
                        );
                    }) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-dark-700 dark:text-slate-400">
                            {t('dashboard.waitlist.empty')}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.upcomingAppointments')}</h3>
                        <Link to="/calendar" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            {t('dashboard.viewAll')}
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-dark-700">
                        {upcomingAppointments.length > 0 ? upcomingAppointments.map((apt) => (
                            <div key={apt.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center">
                                        <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                            {apt.patientName?.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{apt.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(apt.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <span className={`badge ${apt.status === 'confirmed' ? 'badge-success' : 'badge-info'}`}>
                                        {apt.status === 'confirmed' ? t('dashboard.statuses.confirmed') : t('dashboard.statuses.pending')}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                {t('dashboard.noUpcomingAppointments')}
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Alerts */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            {t('dashboard.aiAlerts')}
                        </h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {alerts.length > 0 ? alerts.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                type={alert.type}
                                title={getAlertContent(alert).title}
                                message={getAlertContent(alert).message}
                            />
                        )) : (
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-dark-700 text-sm text-gray-500 dark:text-gray-400">
                                {t('dashboard.noAlerts')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RevenueSummary = ({ stats, locale, language }) => {
    const isEnglish = language === 'en';
    const money = (value) => `${Number(value || 0).toLocaleString(locale)} €`;
    const pendingAmount = Number(stats?.pendingInvoicesAmount || 0);
    const pendingCount = Number(stats?.pendingInvoicesCount || 0);

    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <CurrencyIcon />
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                            {isEnglish ? 'Revenue control' : 'Contrôle revenus'}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
                            {isEnglish ? 'Exact collected revenue' : 'Revenu encaissé exact'}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {isEnglish
                                ? 'Dashboard revenue is calculated from recorded payments. Open invoices remain in outstanding balance until paid.'
                                : 'Le dashboard calcule le revenu depuis les paiements enregistrés. Les factures ouvertes restent dans le solde à encaisser jusqu’au paiement.'}
                        </p>
                    </div>
                </div>
                <Link to="/invoices" className="btn-secondary self-start lg:self-center">
                    {isEnglish ? 'Open invoices' : 'Voir factures'}
                </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-dark-900/40">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        {isEnglish ? 'Today collected' : 'Encaissé jour'}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{money(stats?.revenueToday)}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                        {stats?.paymentsTodayCount || 0} {isEnglish ? 'payment(s)' : 'paiement(s)'}
                    </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-dark-900/40">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        {isEnglish ? 'Month collected' : 'Encaissé mois'}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{money(stats?.revenueMonth)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {isEnglish ? 'Real paid sessions' : 'Séances réellement payées'}
                    </p>
                </div>
                <div className={`rounded-2xl p-4 ${pendingAmount > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.12em] ${pendingAmount > 0 ? 'text-orange-600 dark:text-orange-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                        {isEnglish ? 'Outstanding' : 'À encaisser'}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{money(pendingAmount)}</p>
                    <p className={`mt-1 text-sm font-semibold ${pendingAmount > 0 ? 'text-orange-700 dark:text-orange-200' : 'text-emerald-700 dark:text-emerald-200'}`}>
                        {pendingCount} {isEnglish ? 'open invoice(s)' : 'facture(s) ouverte(s)'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const SecretaryDesk = ({ stats, locale, language, awaitingCount }) => {
    const isEnglish = language === 'en';
    const money = (value) => `${Number(value || 0).toLocaleString(locale)} €`;
    const priorities = [
        {
            title: isEnglish ? 'Requests to approve' : 'Demandes à valider',
            subtitle: isEnglish ? 'Confirm or offer a slot from the agenda.' : 'Confirmer ou proposer un créneau depuis le planning.',
            value: awaitingCount,
            to: '/waitlist',
            color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-300',
            icon: <CalendarIcon />
        },
        {
            title: isEnglish ? 'Patient records' : 'Dossiers patients',
            subtitle: isEnglish ? 'Create, update and verify patient contact details.' : 'Créer, mettre à jour et vérifier les coordonnées patients.',
            value: stats?.totalPatients || 0,
            to: '/patients',
            color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300',
            icon: <UsersIcon />
        },
        {
            title: isEnglish ? 'Open invoices' : 'Factures ouvertes',
            subtitle: `${money(stats?.pendingInvoicesAmount)} · ${stats?.pendingInvoicesCount || 0} ${isEnglish ? 'invoice(s)' : 'facture(s)'}`,
            value: stats?.pendingInvoicesCount || 0,
            to: '/invoices',
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300',
            icon: <InvoiceIcon />
        }
    ];

    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-8 4h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                            {isEnglish ? 'Front desk' : 'Accueil clinique'}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
                            {isEnglish ? 'Secretary dashboard' : 'Dashboard secrétaire'}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {isEnglish
                                ? 'A focused view for requests, patient files, daily agenda and billing follow-up.'
                                : 'Une vue claire pour les demandes, dossiers patients, agenda du jour et suivi des paiements.'}
                        </p>
                    </div>
                </div>
                <Link to="/calendar" className="btn-secondary self-start lg:self-center">
                    {isEnglish ? 'Open calendar' : 'Ouvrir calendrier'}
                </Link>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {priorities.map((item) => (
                    <Link key={item.title} to={item.to} className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-dark-700 dark:bg-dark-900/40 dark:hover:bg-dark-800">
                        <div className="flex items-start justify-between gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}>
                                {item.icon}
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-slate-900 ring-1 ring-slate-200 dark:bg-dark-800 dark:text-white dark:ring-dark-700">
                                {item.value}
                            </span>
                        </div>
                        <h3 className="mt-4 font-extrabold text-slate-950 dark:text-white">{item.title}</h3>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color, trend }) => {
    const colorClasses = {
        primary: 'from-primary-500 to-primary-600',
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-cyan-600',
        orange: 'from-orange-500 to-amber-600',
    };

    return (
        <div className="stat-card card-hover">
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
                    <div className="text-white">{icon}</div>
                </div>
                {trend && (
                    <span className={`text-sm font-medium ${String(trend).startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>{trend}</span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
            </div>
        </div>
    );
};

// Alert Card Component
const AlertCard = ({ type, title, message }) => {
    const styles = {
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400',
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400',
    };

    return (
        <div className={`p-4 rounded-xl border ${styles[type]}`}>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs opacity-80 mt-1">{message}</p>
        </div>
    );
};

// Icons
const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CurrencyIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UsersIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const InvoiceIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export default Dashboard;
