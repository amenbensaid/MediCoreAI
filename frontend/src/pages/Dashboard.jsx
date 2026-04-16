import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/dashboard');
            setStats(response.data.data.stats);
            setUpcomingAppointments(response.data.data.upcomingAppointments);
            setRecentPatients(response.data.data.recentPatients);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data for charts
    const revenueData = [
        { name: 'Mon', revenue: 1200 },
        { name: 'Tue', revenue: 1800 },
        { name: 'Wed', revenue: 1500 },
        { name: 'Thu', revenue: 2100 },
        { name: 'Fri', revenue: 2400 },
        { name: 'Sat', revenue: 1800 },
        { name: 'Sun', revenue: 0 },
    ];

    const appointmentData = [
        { name: 'Mon', appts: 12 },
        { name: 'Tue', appts: 15 },
        { name: 'Wed', appts: 10 },
        { name: 'Thu', appts: 18 },
        { name: 'Fri', appts: 20 },
        { name: 'Sat', appts: 8 },
        { name: 'Sun', appts: 0 },
    ];

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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your activity</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/appointments" className="btn-secondary">
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Appointment
                    </Link>
                    <Link to="/patients" className="btn-primary">
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        New Patient
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Appointments"
                    value={stats?.appointmentsToday || 0}
                    subtitle={`${stats?.appointmentsCompleted || 0} completed`}
                    icon={<CalendarIcon />}
                    color="primary"
                    trend="+12%"
                />
                <StatCard
                    title="Today's Revenue"
                    value={`${(stats?.revenueToday || 0).toLocaleString('fr-FR')} €`}
                    subtitle="vs yesterday"
                    icon={<CurrencyIcon />}
                    color="green"
                    trend="+8%"
                />
                <StatCard
                    title="Total Patients"
                    value={stats?.totalPatients || 0}
                    subtitle={`+${stats?.newPatientsMonth || 0} this month`}
                    icon={<UsersIcon />}
                    color="blue"
                    trend="+5%"
                />
                <StatCard
                    title="Outstanding"
                    value={`${(stats?.pendingInvoicesAmount || 0).toLocaleString('fr-FR')} €`}
                    subtitle={`${stats?.pendingInvoicesCount || 0} invoices`}
                    icon={<InvoiceIcon />}
                    color="orange"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={revenueData}>
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Appointments</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={appointmentData}>
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

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
                        <Link to="/calendar" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            View all →
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
                                        {new Date(apt.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <span className={`badge ${apt.status === 'confirmed' ? 'badge-success' : 'badge-info'}`}>
                                        {apt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                No upcoming appointments
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Alerts */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            AI Alerts
                        </h3>
                    </div>
                    <div className="p-4 space-y-3">
                        <AlertCard
                            type="warning"
                            title="No-show Risk"
                            message="3 patients have high no-show probability today"
                        />
                        <AlertCard
                            type="info"
                            title="Low Stock"
                            message="Low inventory level for 2 products"
                        />
                        <AlertCard
                            type="success"
                            title="Target Achieved"
                            message="Monthly revenue target exceeded by 12%"
                        />
                    </div>
                </div>
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
                    <span className="text-sm font-medium text-green-500">{trend}</span>
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
