import { useState, useEffect } from 'react';
import api from '../services/api';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data.data.invoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'badge-neutral',
            sent: 'badge-info',
            paid: 'badge-success',
            partial: 'badge-warning',
            overdue: 'badge-danger',
            cancelled: 'badge-neutral'
        };
        const labels = {
            draft: 'Brouillon',
            sent: 'Envoyée',
            paid: 'Payée',
            partial: 'Partielle',
            overdue: 'En retard',
            cancelled: 'Annulée'
        };
        return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
    };

    const filteredInvoices = filter === 'all'
        ? invoices
        : invoices.filter(i => i.status === filter);

    const stats = {
        total: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0),
        pending: invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).reduce((sum, i) => sum + i.balance, 0)
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Facturation</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{invoices.length} factures</p>
                </div>
                <button className="btn-primary">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nouvelle Facture
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total facturé</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString('fr-FR')} €</p>
                </div>
                <div className="stat-card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Encaissé</p>
                    <p className="text-2xl font-bold text-green-500">{stats.paid.toLocaleString('fr-FR')} €</p>
                </div>
                <div className="stat-card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">À encaisser</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.pending.toLocaleString('fr-FR')} €</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'draft', 'sent', 'paid', 'partial', 'overdue'].map(status => (
                    <button key={status} onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}>
                        {status === 'all' ? 'Toutes' : status === 'draft' ? 'Brouillons' : status === 'sent' ? 'Envoyées' : status === 'paid' ? 'Payées' : status === 'partial' ? 'Partielles' : 'En retard'}
                    </button>
                ))}
            </div>

            {/* Invoice List */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucune facture</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-dark-700">
                                <tr>
                                    <th className="table-header">Facture</th>
                                    <th className="table-header">Patient</th>
                                    <th className="table-header">Date</th>
                                    <th className="table-header">Montant</th>
                                    <th className="table-header">Solde</th>
                                    <th className="table-header">Statut</th>
                                    <th className="table-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                                {filteredInvoices.map(invoice => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <td className="table-cell font-medium text-primary-500">{invoice.invoiceNumber}</td>
                                        <td className="table-cell">{invoice.patientName}</td>
                                        <td className="table-cell">{new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</td>
                                        <td className="table-cell font-medium">{invoice.totalAmount.toFixed(2)} €</td>
                                        <td className="table-cell font-medium text-orange-500">{invoice.balance.toFixed(2)} €</td>
                                        <td className="table-cell">{getStatusBadge(invoice.status)}</td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Invoices;
