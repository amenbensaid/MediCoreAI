import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const statusOptions = ['all', 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];

const statusStyles = {
    draft: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    sent: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:ring-blue-900/30',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/30',
    partial: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/30',
    overdue: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-900/30',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
};

const Invoices = () => {
    const { language, t } = useI18n();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(null);

    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data.data.invoices || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return invoices.filter((invoice) => {
            const matchesStatus = filter === 'all' || invoice.status === filter;
            const translatedStatus = t(`staffInvoices.statuses.${invoice.status}`).toLowerCase();
            const haystack = [
                invoice.invoiceNumber,
                invoice.patientName,
                invoice.patientEmail,
                invoice.status,
                translatedStatus
            ].join(' ').toLowerCase();

            return matchesStatus && haystack.includes(normalizedSearch);
        });
    }, [filter, invoices, search, t]);

    const stats = useMemo(() => {
        const total = invoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
        const paid = invoices.reduce((sum, invoice) => sum + toNumber(invoice.paidAmount), 0);
        const pending = invoices
            .filter((invoice) => !['paid', 'cancelled'].includes(invoice.status))
            .reduce((sum, invoice) => sum + toNumber(invoice.balance), 0);
        const overdue = invoices
            .filter((invoice) => invoice.status === 'overdue')
            .reduce((sum, invoice) => sum + toNumber(invoice.balance), 0);

        return { total, paid, pending, overdue };
    }, [invoices]);

    const statusCounts = useMemo(() => (
        statusOptions.reduce((acc, status) => {
            acc[status] = status === 'all'
                ? invoices.length
                : invoices.filter((invoice) => invoice.status === status).length;
            return acc;
        }, {})
    ), [invoices]);

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                            {t('nav.billing')}
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                            {t('staffInvoices.title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {t('staffInvoices.subtitle')}
                        </p>
                        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                            {t('staffInvoices.invoiceCount', { count: invoices.length })}
                        </p>
                    </div>

                    <button onClick={() => setShowCreateModal(true)} className="btn-primary inline-flex items-center justify-center gap-2">
                        <PlusIcon />
                        {t('staffInvoices.newInvoice')}
                    </button>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label={t('staffInvoices.stats.total')} value={formatMoney(stats.total, locale)} tone="primary" />
                    <MetricCard label={t('staffInvoices.stats.paid')} value={formatMoney(stats.paid, locale)} tone="success" />
                    <MetricCard label={t('staffInvoices.stats.pending')} value={formatMoney(stats.pending, locale)} tone="warning" />
                    <MetricCard label={t('staffInvoices.stats.overdue')} value={formatMoney(stats.overdue, locale)} tone="danger" />
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
                            placeholder={t('staffInvoices.searchPlaceholder')}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statusOptions.map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    filter === status
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-dark-700 dark:text-slate-300 dark:hover:bg-dark-600'
                                }`}
                            >
                                {t(`staffInvoices.filters.${status}`)}
                                <span className={`rounded-full px-2 py-0.5 text-xs ${
                                    filter === status ? 'bg-white/20 text-white' : 'bg-white text-slate-500 dark:bg-dark-800 dark:text-slate-300'
                                }`}>
                                    {statusCounts[status] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-dark-700 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-950 dark:text-white">{t('staffInvoices.tableTitle')}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('staffInvoices.tableSubtitle', { count: filteredInvoices.length })}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                ) : filteredInvoices.length === 0 ? (
                    <EmptyState t={t} />
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full">
                                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-400 dark:bg-dark-700/50">
                                    <tr>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.invoice')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.patient')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.date')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.dueDate')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.amount')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.balance')}</th>
                                        <th className="px-5 py-4 text-left font-bold">{t('staffInvoices.headers.status')}</th>
                                        <th className="px-5 py-4 text-right font-bold">{t('staffInvoices.headers.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
                                    {filteredInvoices.map((invoice) => (
                                        <InvoiceRow
                                            key={invoice.id}
                                            invoice={invoice}
                                            locale={locale}
                                            t={t}
                                            onView={() => setShowDetailModal(invoice)}
                                            onPayment={() => setShowPaymentModal(invoice)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-dark-700 lg:hidden">
                            {filteredInvoices.map((invoice) => (
                                <InvoiceCard
                                    key={invoice.id}
                                    invoice={invoice}
                                    locale={locale}
                                    t={t}
                                    onView={() => setShowDetailModal(invoice)}
                                    onPayment={() => setShowPaymentModal(invoice)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            {showCreateModal && (
                <CreateInvoiceModal
                    locale={locale}
                    t={t}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchInvoices}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    invoice={showPaymentModal}
                    locale={locale}
                    t={t}
                    onClose={() => setShowPaymentModal(null)}
                    onSuccess={fetchInvoices}
                />
            )}

            {showDetailModal && (
                <InvoiceDetailModal
                    invoice={showDetailModal}
                    locale={locale}
                    t={t}
                    onClose={() => setShowDetailModal(null)}
                />
            )}
        </div>
    );
};

const MetricCard = ({ label, value, tone }) => {
    const tones = {
        primary: 'from-primary-500 to-medical-500 text-primary-600',
        success: 'from-emerald-500 to-teal-500 text-emerald-600',
        warning: 'from-amber-500 to-orange-500 text-orange-600',
        danger: 'from-rose-500 to-red-500 text-rose-600'
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone]?.split(' text-')[0] || tones.primary.split(' text-')[0]} text-white shadow-lg`}>
                <DocumentIcon />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${tones[tone]?.match(/text-\S+/)?.[0] || 'text-primary-600'} dark:text-white`}>
                {value}
            </p>
        </div>
    );
};

const InvoiceRow = ({ invoice, locale, t, onView, onPayment }) => (
    <tr className="transition hover:bg-slate-50/80 dark:hover:bg-dark-700/40">
        <td className="px-5 py-5">
            <p className="font-bold text-primary-600 dark:text-primary-300">{invoice.invoiceNumber}</p>
            <p className="mt-1 text-xs text-slate-400">{invoice.patientEmail || '-'}</p>
        </td>
        <td className="px-5 py-5 font-medium text-slate-900 dark:text-white">{invoice.patientName}</td>
        <td className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">{formatDate(invoice.createdAt, locale)}</td>
        <td className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">{formatDate(invoice.dueDate, locale)}</td>
        <td className="px-5 py-5 font-bold text-slate-900 dark:text-white">{formatMoney(invoice.totalAmount, locale)}</td>
        <td className="px-5 py-5 font-bold text-orange-600 dark:text-orange-300">{formatMoney(invoice.balance, locale)}</td>
        <td className="px-5 py-5"><StatusBadge status={invoice.status} t={t} /></td>
        <td className="px-5 py-5">
            <div className="flex justify-end gap-2">
                <IconButton title={t('staffInvoices.actions.view')} onClick={onView}>
                    <EyeIcon />
                </IconButton>
                {invoice.status !== 'paid' && (
                    <IconButton title={t('staffInvoices.actions.recordPayment')} onClick={onPayment} tone="success">
                        <PaymentIcon />
                    </IconButton>
                )}
            </div>
        </td>
    </tr>
);

const InvoiceCard = ({ invoice, locale, t, onView, onPayment }) => (
    <article className="p-5">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="font-bold text-primary-600 dark:text-primary-300">{invoice.invoiceNumber}</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">{invoice.patientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.patientEmail || '-'}</p>
            </div>
            <StatusBadge status={invoice.status} t={t} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoTile label={t('staffInvoices.headers.date')} value={formatDate(invoice.createdAt, locale)} />
            <InfoTile label={t('staffInvoices.headers.dueDate')} value={formatDate(invoice.dueDate, locale)} />
            <InfoTile label={t('staffInvoices.headers.amount')} value={formatMoney(invoice.totalAmount, locale)} strong />
            <InfoTile label={t('staffInvoices.headers.balance')} value={formatMoney(invoice.balance, locale)} warning />
        </div>
        <div className="mt-4 flex gap-2">
            <button onClick={onView} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-dark-600 dark:text-slate-200 dark:hover:bg-dark-700">
                {t('staffInvoices.actions.view')}
            </button>
            {invoice.status !== 'paid' && (
                <button onClick={onPayment} className="flex-1 rounded-xl bg-primary-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20">
                    {t('staffInvoices.actions.recordPayment')}
                </button>
            )}
        </div>
    </article>
);

const InfoTile = ({ label, value, strong = false, warning = false }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-dark-700/60">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-1 ${strong ? 'font-bold text-slate-950 dark:text-white' : warning ? 'font-bold text-orange-600 dark:text-orange-300' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
            {value}
        </p>
    </div>
);

const StatusBadge = ({ status, t }) => (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status] || statusStyles.draft}`}>
        {t(`staffInvoices.statuses.${status}`)}
    </span>
);

const IconButton = ({ title, onClick, children, tone = 'primary' }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`rounded-xl p-2 transition ${
            tone === 'success'
                ? 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20'
                : 'text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20'
        }`}
    >
        {children}
    </button>
);

const EmptyState = ({ t }) => (
    <div className="p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-dark-700">
            <DocumentIcon large />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">{t('staffInvoices.empty.title')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('staffInvoices.empty.subtitle')}</p>
    </div>
);

const CreateInvoiceModal = ({ locale, t, onClose, onSuccess }) => {
    const [patients, setPatients] = useState([]);
    const [formData, setFormData] = useState({
        patientId: '',
        dueDate: '',
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/patients?limit=100')
            .then((res) => setPatients(res.data.data.patients || []))
            .catch((error) => console.error('Error fetching patients:', error));
    }, []);

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
        }));
    };

    const removeItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items
        }));
    };

    const updateItem = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        }));
    };

    const total = formData.items.reduce((sum, item) => {
        const subtotal = toNumber(item.quantity) * toNumber(item.unitPrice);
        return sum + subtotal + (subtotal * toNumber(item.taxRate) / 100);
    }, 0);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            await api.post('/invoices', formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert(t('staffInvoices.create.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay items-start overflow-y-auto py-6" onClick={onClose}>
            <div className="modal-content max-w-3xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <ModalHeader title={t('staffInvoices.create.title')} subtitle={t('staffInvoices.create.subtitle')} onClose={onClose} />
                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t('staffInvoices.create.patient')}>
                            <select
                                value={formData.patientId}
                                onChange={(event) => setFormData({ ...formData, patientId: event.target.value })}
                                className="input-field"
                                required
                            >
                                <option value="">{t('staffInvoices.create.selectPatient')}</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t('staffInvoices.create.dueDate')}>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                                className="input-field"
                                required
                            />
                        </Field>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('staffInvoices.create.items')}</label>
                            <button type="button" onClick={addItem} className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                                + {t('staffInvoices.create.addItem')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-700 dark:bg-dark-900/40 md:grid-cols-[1fr_90px_130px_44px]">
                                    <input
                                        type="text"
                                        placeholder={t('staffInvoices.create.description')}
                                        value={item.description}
                                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                                        className="input-field"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('staffInvoices.create.quantity')}
                                        value={item.quantity}
                                        min="1"
                                        onChange={(event) => updateItem(index, 'quantity', parseInt(event.target.value, 10) || 1)}
                                        className="input-field"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('staffInvoices.create.price')}
                                        value={item.unitPrice}
                                        min="0"
                                        step="0.01"
                                        onChange={(event) => updateItem(index, 'unitPrice', parseFloat(event.target.value) || 0)}
                                        className="input-field"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        aria-label={t('common.cancel')}
                                        className="flex h-11 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Field label={t('staffInvoices.create.notes')}>
                        <textarea
                            value={formData.notes}
                            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                            className="input-field"
                            rows={3}
                        />
                    </Field>

                    <div className="rounded-2xl bg-slate-50 p-4 text-right dark:bg-dark-700/60">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('staffInvoices.create.total')}</p>
                        <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{formatMoney(total, locale)}</p>
                    </div>

                    <ModalActions
                        t={t}
                        loading={loading}
                        submitLabel={loading ? t('staffInvoices.create.creating') : t('staffInvoices.create.submit')}
                        onClose={onClose}
                    />
                </form>
            </div>
        </div>
    );
};

const PaymentModal = ({ invoice, locale, t, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        amount: invoice.balance || 0,
        paymentMethod: 'card',
        referenceNumber: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            await api.post(`/invoices/${invoice.id}/payments`, formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert(t('staffInvoices.payment.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <ModalHeader title={`${t('staffInvoices.payment.title')} ${invoice.invoiceNumber}`} onClose={onClose} />
                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-dark-700/60">
                        <p className="font-bold text-slate-950 dark:text-white">{invoice.patientName}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <InfoTile label={t('staffInvoices.headers.amount')} value={formatMoney(invoice.totalAmount, locale)} strong />
                            <InfoTile label={t('staffInvoices.payment.remaining')} value={formatMoney(invoice.balance, locale)} warning />
                        </div>
                    </div>

                    <Field label={t('staffInvoices.payment.amount')}>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={invoice.balance}
                            value={formData.amount}
                            onChange={(event) => setFormData({ ...formData, amount: parseFloat(event.target.value) || 0 })}
                            className="input-field"
                            required
                        />
                    </Field>
                    <Field label={t('staffInvoices.payment.method')}>
                        <select
                            value={formData.paymentMethod}
                            onChange={(event) => setFormData({ ...formData, paymentMethod: event.target.value })}
                            className="input-field"
                        >
                            {['card', 'cash', 'check', 'transfer'].map((method) => (
                                <option key={method} value={method}>{t(`staffInvoices.payment.methods.${method}`)}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label={t('staffInvoices.payment.reference')}>
                        <input
                            type="text"
                            value={formData.referenceNumber}
                            onChange={(event) => setFormData({ ...formData, referenceNumber: event.target.value })}
                            className="input-field"
                            placeholder={t('staffInvoices.payment.optional')}
                        />
                    </Field>

                    <ModalActions
                        t={t}
                        loading={loading}
                        submitLabel={loading ? t('staffInvoices.payment.processing') : t('staffInvoices.payment.submit')}
                        onClose={onClose}
                    />
                </form>
            </div>
        </div>
    );
};

const InvoiceDetailModal = ({ invoice, locale, t, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <ModalHeader title={t('staffInvoices.detail.title')} subtitle={invoice.invoiceNumber} onClose={onClose} />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-dark-700/60">
                    <div>
                        <p className="font-bold text-slate-950 dark:text-white">{invoice.patientName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.patientEmail || '-'}</p>
                    </div>
                    <StatusBadge status={invoice.status} t={t} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile label={t('staffInvoices.headers.date')} value={formatDate(invoice.createdAt, locale)} />
                    <InfoTile label={t('staffInvoices.headers.dueDate')} value={formatDate(invoice.dueDate, locale)} />
                    <InfoTile label={t('staffInvoices.detail.subtotal')} value={formatMoney(invoice.subtotal, locale)} />
                    <InfoTile label={t('staffInvoices.detail.tax')} value={formatMoney(invoice.taxAmount, locale)} />
                    <InfoTile label={t('staffInvoices.headers.amount')} value={formatMoney(invoice.totalAmount, locale)} strong />
                    <InfoTile label={t('staffInvoices.detail.paid')} value={formatMoney(invoice.paidAmount, locale)} strong />
                    <InfoTile label={t('staffInvoices.detail.balance')} value={formatMoney(invoice.balance, locale)} warning />
                </div>
                <button onClick={onClose} className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-dark-600 dark:text-slate-200 dark:hover:bg-dark-700">
                    {t('staffInvoices.actions.close')}
                </button>
            </div>
        </div>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
    <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-primary-700 to-medical-600 px-6 py-5 text-white">
        <div>
            <h2 className="text-xl font-extrabold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/75">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white">
            <CloseIcon />
        </button>
    </div>
);

const Field = ({ label, children }) => (
    <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
        {children}
    </label>
);

const ModalActions = ({ t, loading, submitLabel, onClose }) => (
    <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-dark-600 dark:text-slate-200 dark:hover:bg-dark-700">
            {t('common.cancel')}
        </button>
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-60">
            {submitLabel}
        </button>
    </div>
);

const formatMoney = (value, locale) => (
    `${toNumber(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
);

const formatDate = (value, locale) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(locale);
};

const toNumber = (value) => Number(value || 0);

const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
);

const DocumentIcon = ({ large = false }) => (
    <svg className={large ? 'h-8 w-8' : 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0118 9.414V19a2 2 0 01-2 2z" />
    </svg>
);

const EyeIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const PaymentIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const CloseIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default Invoices;
