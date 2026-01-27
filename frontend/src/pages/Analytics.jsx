import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import api from '../services/api';

const Analytics = () => {
    const [period, setPeriod] = useState('30days');
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState([]);
    const [appointmentStats, setAppointmentStats] = useState(null);
    const [patientData, setPatientData] = useState(null);
    const [financialSummary, setFinancialSummary] = useState(null);

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
                api.get('/analytics/financial-summary')
            ]);
            setRevenueData(revenue.data.data.dailyRevenue);
            setAppointmentStats(appointments.data.data);
            setPatientData(patients.data.data);
            setFinancialSummary(financial.data.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

    const appointmentPieData = appointmentStats ? [
        { name: 'Terminés', value: appointmentStats.summary.completed },
        { name: 'Annulés', value: appointmentStats.summary.cancelled },
        { name: 'Absents', value: appointmentStats.summary.noShow }
    ] : [];

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & BI</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Tableaux de bord et indicateurs de performance</p>
                </div>
                <div className="flex gap-2">
                    {['7days', '30days', '90days', '1year'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${period === p
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                                }`}>
                            {p === '7days' ? '7 jours' : p === '30days' ? '30 jours' : p === '90days' ? '90 jours' : '1 an'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Chiffre d'affaires"
                    value={`${financialSummary?.collected?.toLocaleString('fr-FR') || 0} €`}
                    change="+12%"
                    trend="up"
                    color="primary"
                />
                <KPICard
                    title="Taux de complétion"
                    value={`${appointmentStats?.summary?.completionRate || 0}%`}
                    change="+5%"
                    trend="up"
                    color="green"
                />
                <KPICard
                    title="RDV totaux"
                    value={appointmentStats?.summary?.total || 0}
                    change="+8%"
                    trend="up"
                    color="blue"
                />
                <KPICard
                    title="En attente"
                    value={`${financialSummary?.outstanding?.toLocaleString('fr-FR') || 0} €`}
                    change="-3%"
                    trend="down"
                    color="orange"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Évolution du CA</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Appointments Pie Chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Répartition des RDV</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={appointmentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                                {appointmentPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appointment Types */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Types de consultation</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={appointmentStats?.byType || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                            <YAxis dataKey="appointment_type" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Patient Growth */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Croissance patientèle</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={patientData?.growth || []}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { month: 'short' })} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Area type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sources */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Sources patients</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(patientData?.bySource || []).map((source, i) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{source.count}</p>
                            <p className="text-sm text-gray-500">{source.source}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, change, trend, color }) => {
    const colors = {
        primary: 'from-primary-500 to-primary-600',
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-cyan-600',
        orange: 'from-orange-500 to-amber-600'
    };

    return (
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                {change && (
                    <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {change}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
        </div>
    );
};

export default Analytics;
