import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import { PATIENT_LOGIN_PATH, clearPatientSession } from '../../utils/authRouting';
import { useI18n } from '../../stores/languageStore';

const statusTone = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    partial: 'bg-amber-50 text-amber-700 ring-amber-100',
    pending: 'bg-orange-50 text-orange-700 ring-orange-100',
    draft: 'bg-slate-100 text-slate-700 ring-slate-200',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200'
};

const PatientInvoices = () => {
    const navigate = useNavigate();
    const { language } = useI18n();
    const [user, setUser] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState('');
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const labels = language === 'en'
        ? {
            eyebrow: 'Billing',
            title: 'My invoices',
            subtitle: 'View session invoices, payment status and download PDFs.',
            paid: 'Paid',
            outstanding: 'Outstanding',
            total: 'Total',
            empty: 'No invoice available yet.',
            download: 'Download PDF',
            appointment: 'Session',
            due: 'Due date',
            back: 'Back to dashboard'
        }
        : {
            eyebrow: 'Facturation',
            title: 'Mes factures',
            subtitle: 'Consultez les factures de séances, le statut de paiement et téléchargez le PDF.',
            paid: 'Payé',
            outstanding: 'À régler',
            total: 'Total',
            empty: 'Aucune facture disponible pour le moment.',
            download: 'Télécharger PDF',
            appointment: 'Séance',
            due: 'Échéance',
            back: 'Retour dashboard'
        };

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const storedUser = localStorage.getItem('patient-user');
        if (!token || !storedUser) {
            navigate(PATIENT_LOGIN_PATH, { replace: true });
            return;
        }
        setUser(JSON.parse(storedUser));
        api.get('/public/my-invoices', { headers: { Authorization: `Bearer ${token}` } })
            .then((response) => setInvoices(response.data.data || []))
            .catch(() => setInvoices([]))
            .finally(() => setLoading(false));
    }, [navigate]);

    const stats = useMemo(() => ({
        total: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
        paid: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0),
        outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0)
    }), [invoices]);

    const money = (value) => `${Number(value || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const date = (value) => {
        if (!value) return '-';
        const nextDate = new Date(value);
        if (Number.isNaN(nextDate.getTime())) return '-';
        return nextDate.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const downloadPdf = async (invoice) => {
        const token = localStorage.getItem('patient-token');
        setDownloadingId(invoice.id);
        try {
            const response = await api.get(`/public/my-invoices/${invoice.id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${invoice.invoiceNumber || 'facture'}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setDownloadingId('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PatientNavbar user={user} onLogout={() => clearPatientSession()} />
            <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Link to="/patient/portal" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary-600 shadow-sm hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900">
                    ← {labels.back}
                </Link>

                <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-600">{labels.eyebrow}</p>
                            <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{labels.title}</h1>
                            <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{labels.subtitle}</p>
                        </div>
                        <div className="rounded-3xl bg-primary-50 p-5 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">
                            <p className="text-sm font-bold">{labels.outstanding}</p>
                            <p className="text-3xl font-black">{money(stats.outstanding)}</p>
                        </div>
                    </div>
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30 md:grid-cols-3">
                        <Metric label={labels.total} value={money(stats.total)} />
                        <Metric label={labels.paid} value={money(stats.paid)} tone="success" />
                        <Metric label={labels.outstanding} value={money(stats.outstanding)} tone="warning" />
                    </div>
                </section>

                {loading ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center font-bold text-slate-500">...</div>
                ) : invoices.length === 0 ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-lg font-black text-slate-950 dark:text-white">{labels.empty}</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {invoices.map((invoice) => (
                            <article key={invoice.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-lg font-black text-slate-950 dark:text-white">{invoice.invoiceNumber}</p>
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone[invoice.status] || statusTone.draft}`}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            {labels.appointment}: {invoice.appointmentType || '-'} · {date(invoice.appointmentStart || invoice.createdAt)}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {labels.due}: {date(invoice.dueDate)}
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3 md:min-w-[460px]">
                                        <Info label={labels.total} value={money(invoice.totalAmount)} />
                                        <Info label={labels.paid} value={money(invoice.paidAmount)} success />
                                        <Info label={labels.outstanding} value={money(invoice.balance)} warning />
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadPdf(invoice)}
                                    className="mt-4 inline-flex rounded-2xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700"
                                >
                                    {downloadingId === invoice.id ? '...' : labels.download}
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const Metric = ({ label, value, tone = 'primary' }) => (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-black ${tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-orange-600' : 'text-slate-950 dark:text-white'}`}>{value}</p>
    </div>
);

const Info = ({ label, value, success = false, warning = false }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/40">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className={`font-black ${success ? 'text-emerald-600' : warning ? 'text-orange-600' : 'text-slate-950 dark:text-white'}`}>{value}</p>
    </div>
);

export default PatientInvoices;
