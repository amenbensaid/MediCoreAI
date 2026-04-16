import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PatientPortal = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) {
            navigate('/patient/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchAppointments(token);
    }, []);

    const fetchAppointments = async (token) => {
        try {
            const res = await api.get('/public/my-appointments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(res.data.data);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('patient-token');
        localStorage.removeItem('patient-user');
        navigate('/patient/login');
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            'no-show': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        };
        return `px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.scheduled}`;
    };

    const upcoming = appointments.filter(a => new Date(a.startTime) >= new Date() && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.startTime) < new Date() || a.status === 'cancelled');

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">MediCore</span>
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">Patient Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                            Welcome, <span className="font-medium text-gray-900 dark:text-white">{user?.firstName}</span>
                        </span>
                        <button onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* Welcome + Book CTA */}
                <div className="bg-gradient-to-r from-primary-500 to-medical-500 rounded-2xl p-6 sm:p-8 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Hello, {user?.firstName}! 👋</h1>
                            <p className="text-white/80 mt-1">Manage your appointments and health records</p>
                        </div>
                        <Link to="/patient/book" className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Book Appointment
                        </Link>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 text-center">
                        <p className="text-2xl font-bold text-primary-500">{upcoming.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upcoming</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 text-center">
                        <p className="text-2xl font-bold text-green-500">{appointments.filter(a => a.status === 'completed').length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{appointments.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
                    </div>
                </div>

                {/* Upcoming Appointments */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Appointments</h2>
                    {upcoming.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-8 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No upcoming appointments</p>
                            <Link to="/patient/book" className="btn-primary inline-flex items-center gap-2">
                                Book Your First Appointment
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcoming.map(apt => (
                                <div key={apt.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex flex-col items-center justify-center flex-shrink-0">
                                            <span className="text-xs text-primary-500 font-medium">
                                                {new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-bold text-primary-600">
                                                {new Date(apt.startTime).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{apt.practitioner}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {apt.type} • {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {apt.specialty && <p className="text-xs text-gray-400 dark:text-gray-500">{apt.specialty}</p>}
                                        </div>
                                    </div>
                                    <span className={getStatusBadge(apt.status)}>
                                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Past Appointments */}
                {past.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Past Appointments</h2>
                        <div className="space-y-2">
                            {past.map(apt => (
                                <div key={apt.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-75">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                                            <span className="text-xs text-gray-400 font-medium">
                                                {new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-bold text-gray-500">
                                                {new Date(apt.startTime).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-300">{apt.practitioner}</p>
                                            <p className="text-sm text-gray-400">
                                                {apt.type} • {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={getStatusBadge(apt.status)}>
                                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default PatientPortal;
