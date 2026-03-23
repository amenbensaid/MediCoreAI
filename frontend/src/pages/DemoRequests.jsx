import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

const statuses = ['all', 'pending', 'accepted', 'declined'];

const DemoRequests = () => {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, declined: 0 });
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('all');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

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
                message: error.response?.data?.message || 'Impossible de charger les demandes de démo.'
            });
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (requestId, status) => {
        setFeedback({ type: '', message: '' });
        try {
            await api.patch(`/demo-requests/${requestId}/status`, { status });
            setFeedback({ type: 'success', message: `Demande ${status === 'accepted' ? 'acceptée' : 'refusée'} avec succès.` });
            fetchDemoRequests();
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || 'Mise à jour impossible pour cette demande.'
            });
        }
    };

    if (!isAdmin) {
        return (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accès restreint</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Cette section est réservée aux administrateurs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Demandes de démo</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Validez ou refusez les demandes commerciales depuis le CRM admin.</p>
                </div>
                <button onClick={fetchDemoRequests} className="btn-secondary">Rafraîchir</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat title="Total" value={stats.total} color="slate" />
                <Stat title="En attente" value={stats.pending} color="yellow" />
                <Stat title="Acceptées" value={stats.accepted} color="green" />
                <Stat title="Refusées" value={stats.declined} color="red" />
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex flex-wrap gap-2">
                    {statuses.map((status) => (
                        <button
                            key={status}
                            onClick={() => setActiveStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeStatus === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {status === 'all' ? 'Tous' : status === 'pending' ? 'En attente' : status === 'accepted' ? 'Acceptées' : 'Refusées'}
                        </button>
                    ))}
                </div>

                {feedback.message && (
                    <div className={`mx-4 mt-4 rounded-lg px-4 py-3 text-sm ${feedback.type === 'success'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {feedback.message}
                    </div>
                )}

                {loading ? (
                    <div className="p-10 flex items-center justify-center"><div className="spinner" /></div>
                ) : requests.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">Aucune demande trouvée.</div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-700">
                        {requests.map((request) => (
                            <article key={request.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{request.full_name}</h3>
                                        <StatusBadge status={request.status} />
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{request.company_name} · {request.email}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Offre: <span className="font-medium">{request.desired_plan || 'professional'}</span>
                                        {request.team_size ? ` · Équipe: ${request.team_size}` : ''}
                                    </p>
                                    {request.preferred_demo_date && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Date souhaitée: {new Date(request.preferred_demo_date).toLocaleString('fr-FR')}
                                        </p>
                                    )}
                                    {request.message && (
                                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                                            {request.message}
                                        </p>
                                    )}
                                </div>

                                {request.status === 'pending' ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateStatus(request.id, 'declined')} className="btn-secondary !px-4 !py-2">Refuser</button>
                                        <button onClick={() => updateStatus(request.id, 'accepted')} className="btn-primary !px-4 !py-2">Accepter</button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Traité le {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('fr-FR') : '-'}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Stat = ({ title, value, color }) => {
    const colors = {
        slate: 'from-slate-500 to-slate-600',
        yellow: 'from-amber-500 to-orange-600',
        green: 'from-emerald-500 to-green-600',
        red: 'from-rose-500 to-red-600'
    };

    return (
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[color]}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{value}</p>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const classes = {
        pending: 'badge-warning',
        accepted: 'badge-success',
        declined: 'badge-danger'
    };

    const labels = {
        pending: 'En attente',
        accepted: 'Acceptée',
        declined: 'Refusée'
    };

    return <span className={`badge ${classes[status] || 'badge-neutral'}`}>{labels[status] || status}</span>;
};

export default DemoRequests;
