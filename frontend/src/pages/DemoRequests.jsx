import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../stores/languageStore';

const statuses = ['all', 'pending', 'accepted', 'declined'];

const statusStyles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/30',
    accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/30',
    declined: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-900/30'
};

const DemoRequests = () => {
    const { user } = useAuthStore();
    const { language, t } = useI18n();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, declined: 0 });
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    const isAdmin = useMemo(
        () => user?.role === 'admin' || user?.clinicRole === 'admin',
        [user]
    );

    useEffect(() => {
        if (isAdmin) {
            fetchDemoRequests();
        } else {
            setLoading(false);
        }
    }, [isAdmin, activeStatus]);

    const fetchDemoRequests = async () => {
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const query = activeStatus === 'all' ? '' : `?status=${activeStatus}`;
            const response = await api.get(`/demo-requests${query}`);
            setRequests(response.data.data.requests || []);
            setStats(response.data.data.stats || { total: 0, pending: 0, accepted: 0, declined: 0 });
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffDemoRequests.feedback.loadError')
            });
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (requestId, status) => {
        setFeedback({ type: '', message: '' });
        try {
            await api.patch(`/demo-requests/${requestId}/status`, { status });
            setFeedback({ type: 'success', message: t(`staffDemoRequests.feedback.${status}`) });
            fetchDemoRequests();
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffDemoRequests.feedback.updateError')
            });
        }
    };

    const filteredRequests = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return requests.filter((request) => {
            const haystack = [
                request.full_name,
                request.company_name,
                request.email,
                request.phone,
                request.desired_plan,
                request.clinic_type,
                request.message,
                t(`staffDemoRequests.statuses.${request.status}`)
            ].join(' ').toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [requests, search, t]);

    if (!isAdmin) {
        return (
            <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300">
                    <ShieldIcon />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold text-slate-950 dark:text-white">{t('staffDemoRequests.restrictedTitle')}</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{t('staffDemoRequests.restrictedText')}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                            {t('nav.demoRequests')}
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                            {t('staffDemoRequests.title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {t('staffDemoRequests.subtitle')}
                        </p>
                    </div>
                    <button onClick={fetchDemoRequests} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-dark-600 dark:bg-dark-700 dark:text-slate-200 dark:hover:bg-dark-600">
                        {t('staffDemoRequests.refresh')}
                    </button>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:grid-cols-2 xl:grid-cols-4">
                    <Stat title={t('staffDemoRequests.stats.total')} value={stats.total} color="slate" />
                    <Stat title={t('staffDemoRequests.stats.pending')} value={stats.pending} color="amber" />
                    <Stat title={t('staffDemoRequests.stats.accepted')} value={stats.accepted} color="emerald" />
                    <Stat title={t('staffDemoRequests.stats.declined')} value={stats.declined} color="rose" />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="relative">
                        <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="input-field pl-12"
                            placeholder={t('staffDemoRequests.searchPlaceholder')}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statuses.map((status) => (
                            <button
                                key={status}
                                onClick={() => setActiveStatus(status)}
                                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    activeStatus === status
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-dark-700 dark:text-slate-300 dark:hover:bg-dark-600'
                                }`}
                            >
                                {t(`staffDemoRequests.filters.${status}`)}
                                <span className={`rounded-full px-2 py-0.5 text-xs ${activeStatus === status ? 'bg-white/20 text-white' : 'bg-white text-slate-500 dark:bg-dark-800 dark:text-slate-300'}`}>
                                    {status === 'all' ? stats.total : stats[status]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {feedback.message && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/30'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-900/30'
                }`}>
                    {feedback.message}
                </div>
            )}

            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                {loading ? (
                    <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-dark-700">
                            <ClipboardIcon />
                        </div>
                        <p className="mt-4 font-semibold text-slate-600 dark:text-slate-300">{t('staffDemoRequests.empty')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-dark-700">
                        {filteredRequests.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                locale={locale}
                                t={t}
                                onAccept={() => updateStatus(request.id, 'accepted')}
                                onDecline={() => updateStatus(request.id, 'declined')}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const Stat = ({ title, value, color }) => {
    const colors = {
        slate: 'from-slate-500 to-slate-700',
        amber: 'from-amber-500 to-orange-600',
        emerald: 'from-emerald-500 to-teal-600',
        rose: 'from-rose-500 to-red-600'
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[color]} text-white shadow-lg`}>
                    <ClipboardIcon small />
                </span>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-950 dark:text-white">{value}</p>
        </div>
    );
};

const RequestCard = ({ request, locale, t, onAccept, onDecline }) => (
    <article className="p-5 transition hover:bg-slate-50/70 dark:hover:bg-dark-700/40">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-medical-500 text-sm font-extrabold text-white shadow-lg">
                        {getInitials(request.full_name)}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-950 dark:text-white">{request.full_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{request.company_name}</p>
                    </div>
                    <StatusBadge status={request.status} t={t} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Info label={t('staffDemoRequests.fields.email')} value={request.email} />
                    <Info label={t('staffDemoRequests.fields.phone')} value={request.phone || '-'} />
                    <Info label={t('staffDemoRequests.fields.plan')} value={t(`staffDemoRequests.plans.${request.desired_plan || 'professional'}`)} />
                    <Info label={t('staffDemoRequests.fields.team')} value={request.team_size || '-'} />
                    <Info label={t('staffDemoRequests.fields.clinicType')} value={request.clinic_type ? t(`staffDemoRequests.clinicTypes.${request.clinic_type}`) : '-'} />
                    <Info label={t('staffDemoRequests.fields.desiredDate')} value={formatDateTime(request.preferred_demo_date, locale)} />
                    <Info label={t('staffDemoRequests.fields.submitted')} value={formatDateTime(request.created_at, locale)} />
                    <Info label={t('staffDemoRequests.fields.reviewed')} value={formatDateTime(request.reviewed_at, locale)} />
                </div>

                {request.message && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-dark-700/60">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('staffDemoRequests.fields.message')}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{request.message}</p>
                    </div>
                )}
            </div>

            {request.status === 'pending' && (
                <div className="flex shrink-0 gap-2 xl:flex-col">
                    <button onClick={onDecline} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-600 dark:text-slate-200 dark:hover:bg-dark-700 xl:w-32">
                        {t('staffDemoRequests.actions.decline')}
                    </button>
                    <button onClick={onAccept} className="flex-1 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-600 xl:w-32">
                        {t('staffDemoRequests.actions.accept')}
                    </button>
                </div>
            )}
        </div>
    </article>
);

const Info = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-dark-700/60">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
);

const StatusBadge = ({ status, t }) => (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status] || statusStyles.pending}`}>
        {t(`staffDemoRequests.statuses.${status}`)}
    </span>
);

const formatDateTime = (value, locale) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getInitials = (name = '') => (
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'DR'
);

const ClipboardIcon = ({ small = false }) => (
    <svg className={small ? 'h-5 w-5' : 'h-8 w-8'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-7 8h8a2 2 0 002-2V7.5A2.5 2.5 0 0015.5 5h-.75a2.75 2.75 0 00-5.5 0H8.5A2.5 2.5 0 006 7.5V19a2 2 0 002 2z" />
    </svg>
);

const ShieldIcon = () => (
    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 4.5-2.9 8.5-7 9.8-4.1-1.3-7-5.3-7-9.8V7l7-4z" />
    </svg>
);

export default DemoRequests;
