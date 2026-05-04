import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const periods = ['7days', '30days', '90days', '1year'];

const periodDayCounts = {
    '7days': 7,
    '30days': 30,
    '90days': 90
};

const statusColors = {
    completed: '#7c3aed',
    confirmed: '#10b981',
    scheduled: '#0ea5e9',
    awaiting_approval: '#f59e0b',
    in_progress: '#6366f1',
    cancelled: '#ef4444',
    no_show: '#f97316',
    pending: '#94a3b8'
};

const Analytics = () => {
    const { language, t } = useI18n();
    const [period, setPeriod] = useState('30days');
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState([]);
    const [appointmentStats, setAppointmentStats] = useState(null);
    const [patientData, setPatientData] = useState(null);
    const [financialSummary, setFinancialSummary] = useState(null);

    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [revenue, appointments, patients, financial] = await Promise.all([
                api.get('/analytics/revenue', { params: { period } }),
                api.get('/analytics/appointments', { params: { period } }),
                api.get('/analytics/patients'),
                api.get('/analytics/financial-summary', { params: { period } })
            ]);
            setRevenueData(revenue.data.data.dailyRevenue || []);
            setAppointmentStats(appointments.data.data);
            setPatientData(patients.data.data);
            setFinancialSummary(financial.data.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const revenueSeries = useMemo(() => buildRevenueSeries(revenueData, period, locale), [locale, period, revenueData]);
    const patientGrowthSeries = useMemo(() => buildPatientGrowthSeries(patientData?.growth || [], locale), [locale, patientData]);

    const statusDistribution = useMemo(() => {
        const rows = appointmentStats?.byStatus?.length
            ? appointmentStats.byStatus
            : fallbackStatusRows(appointmentStats?.summary);

        return rows
            .map((row) => ({
                status: row.status,
                name: t(`staffAnalytics.status.${row.status}`),
                value: Number(row.count || 0),
                color: statusColors[row.status] || '#94a3b8'
            }))
            .filter((row) => row.value > 0);
    }, [appointmentStats, t]);

    const consultationTypes = useMemo(() => (
        (appointmentStats?.byType || [])
            .map((row) => ({
                type: formatType(row.appointment_type, t),
                count: Number(row.count || 0)
            }))
            .filter((row) => row.count > 0)
    ), [appointmentStats, t]);

    const patientSources = useMemo(() => {
        const sources = patientData?.bySource || [];
        const total = sources.reduce((sum, source) => sum + Number(source.count || 0), 0);
        return sources.map((source) => ({
            ...source,
            count: Number(source.count || 0),
            percent: total > 0 ? Math.round((Number(source.count || 0) / total) * 100) : 0
        }));
    }, [patientData]);

    const hasRevenue = revenueSeries.some((row) => row.revenue > 0);
    const hasPatientGrowth = patientGrowthSeries.some((row) => row.count > 0);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                            {t('nav.analytics')}
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                            {t('staffAnalytics.title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {t('staffAnalytics.subtitle')}
                        </p>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {periods.map((item) => (
                            <button
                                key={item}
                                onClick={() => setPeriod(item)}
                                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    period === item
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-dark-700 dark:text-slate-300 dark:hover:bg-dark-600'
                                }`}
                            >
                                {t(`staffAnalytics.periods.${item}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KPICard title={t('staffAnalytics.stats.revenue')} value={formatMoney(financialSummary?.collected, locale)} tone="primary" />
                <KPICard title={t('staffAnalytics.stats.completionRate')} value={`${appointmentStats?.summary?.completionRate || 0}%`} tone="success" />
                <KPICard title={t('staffAnalytics.stats.totalAppointments')} value={appointmentStats?.summary?.total || 0} tone="info" />
                <KPICard title={t('staffAnalytics.stats.outstanding')} value={formatMoney(financialSummary?.outstanding, locale)} tone="warning" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <ChartPanel title={t('staffAnalytics.charts.revenueTrend')}>
                    {hasRevenue ? (
                        <ResponsiveContainer width="100%" height={310}>
                            <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#94a3b8" opacity={0.16} />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}€`}
                                    domain={[0, (max) => (max > 0 ? Math.ceil(max * 1.2) : 1)]}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value) => [formatMoney(value, locale), t('staffAnalytics.tooltip.revenue')]}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} fill="url(#analyticsRevenue)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart t={t} />
                    )}
                </ChartPanel>

                <ChartPanel title={t('staffAnalytics.charts.appointmentDistribution')}>
                    {statusDistribution.length > 0 ? (
                        <div className="grid min-h-[310px] gap-4 lg:grid-cols-[1fr_190px] lg:items-center">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={72}
                                        outerRadius={108}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {statusDistribution.map((entry) => (
                                            <Cell key={entry.status} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, t('staffAnalytics.tooltip.count')]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3">
                                {statusDistribution.map((row) => (
                                    <LegendItem key={row.status} color={row.color} label={row.name} value={row.value} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyChart t={t} />
                    )}
                </ChartPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ChartPanel title={t('staffAnalytics.charts.consultationTypes')}>
                    {consultationTypes.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={consultationTypes} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#94a3b8" opacity={0.16} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis dataKey="type" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, t('staffAnalytics.tooltip.count')]} />
                                <Bar dataKey="count" fill="#14b8a6" radius={[0, 10, 10, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart t={t} />
                    )}
                </ChartPanel>

                <ChartPanel title={t('staffAnalytics.charts.patientGrowth')}>
                    {hasPatientGrowth ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={patientGrowthSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="analyticsPatients" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#94a3b8" opacity={0.16} />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} minTickGap={16} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, (max) => (max > 0 ? Math.ceil(max * 1.2) : 1)]} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, t('staffAnalytics.tooltip.patients')]} />
                                <Area type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={3} fill="url(#analyticsPatients)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart t={t} />
                    )}
                </ChartPanel>
            </div>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <h2 className="font-bold text-slate-950 dark:text-white">{t('staffAnalytics.charts.patientSources')}</h2>
                {patientSources.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {patientSources.map((source) => (
                            <div key={source.source} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/40">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{source.count}</p>
                                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{source.source}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-600 ring-1 ring-slate-100 dark:bg-dark-800 dark:ring-dark-700">
                                        {source.percent}%
                                    </span>
                                </div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white dark:bg-dark-700">
                                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-medical-500" style={{ width: `${source.percent}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-dark-700/60 dark:text-slate-300">
                        {t('staffAnalytics.empty.sources')}
                    </p>
                )}
            </section>
        </div>
    );
};

const KPICard = ({ title, value, tone }) => {
    const tones = {
        primary: 'from-primary-500 to-violet-600',
        success: 'from-emerald-500 to-teal-600',
        info: 'from-sky-500 to-blue-600',
        warning: 'from-orange-500 to-amber-500'
    };

    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone]} text-white shadow-lg`}>
                <TrendIcon />
            </div>
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        </div>
    );
};

const ChartPanel = ({ title, children }) => (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
        <h2 className="font-bold text-slate-950 dark:text-white">{title}</h2>
        <div className="mt-4">{children}</div>
    </section>
);

const EmptyChart = ({ t }) => (
    <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-dark-600 dark:bg-dark-900/40">
        <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-dark-800">
                <TrendIcon />
            </div>
            <p className="mt-3 max-w-xs text-sm font-medium text-slate-500 dark:text-slate-300">
                {t('staffAnalytics.empty.chart')}
            </p>
        </div>
    </div>
);

const LegendItem = ({ color, label, value }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-dark-700/60">
        <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-extrabold text-slate-950 dark:text-white">{value}</span>
    </div>
);

const buildRevenueSeries = (rows, period, locale) => {
    if (period === '1year') {
        const monthMap = new Map();
        rows.forEach((row) => {
            const date = new Date(row.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthMap.set(key, (monthMap.get(key) || 0) + Number(row.revenue || 0));
        });

        return Array.from({ length: 12 }, (_, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - index), 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return {
                key,
                label: date.toLocaleDateString(locale, { month: 'short' }),
                revenue: monthMap.get(key) || 0
            };
        });
    }

    const days = periodDayCounts[period] || 30;
    const dayMap = new Map();
    rows.forEach((row) => {
        const date = new Date(row.date);
        dayMap.set(toDateKey(date), Number(row.revenue || 0));
    });

    return Array.from({ length: days }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (days - 1 - index));
        const key = toDateKey(date);
        return {
            key,
            label: date.toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
            revenue: dayMap.get(key) || 0
        };
    });
};

const buildPatientGrowthSeries = (rows, locale) => {
    const monthMap = new Map();
    rows.forEach((row) => {
        const date = new Date(row.month);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, Number(row.count || 0));
    });

    return Array.from({ length: 12 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - index), 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return {
            key,
            label: date.toLocaleDateString(locale, { month: 'short' }),
            count: monthMap.get(key) || 0
        };
    });
};

const fallbackStatusRows = (summary) => {
    if (!summary) return [];
    return [
        { status: 'completed', count: summary.completed },
        { status: 'cancelled', count: summary.cancelled },
        { status: 'no_show', count: summary.noShow },
        { status: 'scheduled', count: summary.scheduled },
        { status: 'confirmed', count: summary.confirmed },
        { status: 'awaiting_approval', count: summary.awaitingApproval },
        { status: 'in_progress', count: summary.inProgress }
    ];
};

const formatType = (value, t) => {
    const normalized = String(value || 'other').toLowerCase();
    const key = normalized.replace(/[\s-]+/g, '');
    if (key.includes('check')) return t('staffAnalytics.types.checkup');
    if (key.includes('follow') || key.includes('suivi')) return t('staffAnalytics.types.followup');
    if (key.includes('emergency') || key.includes('urgence')) return t('staffAnalytics.types.emergency');
    if (key.includes('consult')) return t('staffAnalytics.types.consultation');
    return value || t('staffAnalytics.types.other');
};

const formatMoney = (value, locale) => (
    `${Number(value || 0).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
);

const toDateKey = (date) => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const TrendIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const tooltipStyle = {
    backgroundColor: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.22)'
};

export default Analytics;
