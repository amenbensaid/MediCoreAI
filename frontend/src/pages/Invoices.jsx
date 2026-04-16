import { useState, useEffect } from 'react';
import api from '../services/api';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(null);

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
        return <span className={`badge ${styles[status]}`}>{labels[status] || status}</span>;
    };

    const filteredInvoices = filter === 'all'
        ? invoices
        : invoices.filter(i => i.status === filter);

    const stats = {
        total: invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.totalAmount || 0), 0),
        pending: invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).reduce((sum, i) => sum + (i.balance || 0), 0)
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Facturation</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{invoices.length} factures</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
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
                                        <td className="table-cell font-medium">{invoice.totalAmount?.toFixed(2)} €</td>
                                        <td className="table-cell font-medium text-orange-500">{invoice.balance?.toFixed(2)} €</td>
                                        <td className="table-cell">{getStatusBadge(invoice.status)}</td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setShowDetailModal(invoice)}
                                                    title="View invoice"
                                                    className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {invoice.status !== 'paid' && (
                                                    <button
                                                        onClick={() => setShowPaymentModal(invoice)}
                                                        title="Record payment"
                                                        className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onSuccess={fetchInvoices} />}

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    invoice={showPaymentModal}
                    onClose={() => setShowPaymentModal(null)}
                    onSuccess={fetchInvoices}
                />
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <InvoiceDetailModal
                    invoice={showDetailModal}
                    onClose={() => setShowDetailModal(null)}
                />
            )}
        </div>
    );
};

const CreateInvoiceModal = ({ onClose, onSuccess }) => {
    const [patients, setPatients] = useState([]);
    const [formData, setFormData] = useState({
        patientId: '',
        dueDate: '',
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/patients?limit=100').then(res => setPatients(res.data.data.patients));
    }, []);

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    const getTotal = () => {
        return formData.items.reduce((sum, item) => {
            const subtotal = item.quantity * item.unitPrice;
            return sum + subtotal + (subtotal * item.taxRate / 100);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/invoices', formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content p-6 max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle Facture</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient</label>
                            <select value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                                className="input-field" required>
                                <option value="">Sélectionner</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'échéance</label>
                            <input type="date" value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="input-field" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Articles</label>
                        {formData.items.map((item, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                                <input type="text" placeholder="Description" value={item.description}
                                    onChange={e => updateItem(i, 'description', e.target.value)}
                                    className="input-field col-span-5" required />
                                <input type="number" placeholder="Qté" value={item.quantity} min="1"
                                    onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                    className="input-field col-span-2" required />
                                <input type="number" placeholder="Prix" value={item.unitPrice} min="0" step="0.01"
                                    onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="input-field col-span-3" required />
                                <button type="button" onClick={() => removeItem(i)}
                                    className="col-span-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addItem}
                            className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            + Ajouter un article
                        </button>
                    </div>

                    <div className="text-right border-t border-gray-200 dark:border-dark-600 pt-4">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            Total: {getTotal().toFixed(2)} €
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="input-field" rows={2} />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? 'Création...' : 'Créer la facture'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentModal = ({ invoice, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        amount: invoice.balance || 0,
        paymentMethod: 'card',
        referenceNumber: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/invoices/${invoice.id}/payments`, formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Payment — {invoice.invoiceNumber}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                    <p className="text-sm text-gray-500">Patient: <span className="font-medium text-gray-900 dark:text-white">{invoice.patientName}</span></p>
                    <p className="text-sm text-gray-500">Total: <span className="font-medium">{invoice.totalAmount?.toFixed(2)} €</span></p>
                    <p className="text-sm text-gray-500">Remaining: <span className="font-bold text-orange-500">{invoice.balance?.toFixed(2)} €</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                        <input type="number" step="0.01" min="0.01" max={invoice.balance}
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            className="input-field" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                        <select value={formData.paymentMethod}
                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="input-field">
                            <option value="card">Carte bancaire</option>
                            <option value="cash">Espèces</option>
                            <option value="check">Chèque</option>
                            <option value="transfer">Virement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label>
                        <input type="text" value={formData.referenceNumber}
                            onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                            className="input-field" placeholder="Optional" />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? 'Processing...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InvoiceDetailModal = ({ invoice, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Patient</p>
                        <p className="font-medium text-gray-900 dark:text-white">{invoice.patientName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900 dark:text-white">{new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Montant total</p>
                        <p className="font-bold text-gray-900 dark:text-white">{invoice.totalAmount?.toFixed(2)} €</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Payé</p>
                        <p className="font-bold text-green-500">{invoice.paidAmount?.toFixed(2)} €</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Solde</p>
                        <p className="font-bold text-orange-500">{invoice.balance?.toFixed(2)} €</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Statut</p>
                        <p>{invoice.status}</p>
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <button onClick={onClose} className="w-full btn-secondary">Close</button>
            </div>
        </div>
    </div>
);

export default Invoices;
