import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../stores/languageStore';

const labels = {
    fr: {
        eyebrow: 'File d’attente',
        secretaryEyebrow: 'Accueil patient',
        title: 'Demandes en attente',
        secretaryTitle: 'File d’attente accueil',
        subtitle: 'Proposez une place, confirmez un rendez-vous ou annulez une demande patient.',
        secretarySubtitle: 'Vue opérationnelle pour traiter les demandes, rappeler les patients et confirmer les créneaux libérés.',
        active: 'Actives',
        pending: 'En attente',
        offered: 'Proposées',
        all: 'Toutes',
        patient: 'Patient',
        slot: 'Créneau demandé',
        practitioner: 'Praticien',
        position: 'Position',
        contact: 'Contact',
        offer: 'Proposer',
        confirm: 'Confirmer',
        cancel: 'Annuler',
        calendar: 'Calendrier',
        appointments: 'Rendez-vous',
        refresh: 'Actualiser',
        choosePractitioner: 'Choisir un praticien',
        allPractitioners: 'Tous les praticiens',
        viewQueue: 'Voir la file',
        queueFor: 'File de',
        requests: 'demandes',
        emptyTitle: 'Aucune demande dans cette vue',
        emptyText: 'Les demandes de file d’attente apparaîtront ici dès qu’un patient demande un créneau complet.',
        error: 'Impossible de charger la file d’attente.',
        actionError: 'Action impossible sur cette demande.',
        actionSuccess: 'File d’attente mise à jour.',
        offeredUntil: 'Offre valable jusqu’à',
        before: 'patient(s) avant',
        online: 'En ligne',
        inPerson: 'Présentiel',
        statuses: {
            pending: 'En attente',
            offered: 'Place proposée',
            accepted: 'Acceptée',
            cancelled: 'Annulée'
        }
    },
    en: {
        eyebrow: 'Waitlist',
        secretaryEyebrow: 'Front desk',
        title: 'Pending requests',
        secretaryTitle: 'Front desk waitlist',
        subtitle: 'Offer a slot, confirm an appointment or cancel a patient request.',
        secretarySubtitle: 'Operational view to handle requests, call patients and confirm released slots.',
        active: 'Active',
        pending: 'Pending',
        offered: 'Offered',
        all: 'All',
        patient: 'Patient',
        slot: 'Requested slot',
        practitioner: 'Practitioner',
        position: 'Position',
        contact: 'Contact',
        offer: 'Offer',
        confirm: 'Confirm',
        cancel: 'Cancel',
        calendar: 'Calendar',
        appointments: 'Appointments',
        refresh: 'Refresh',
        choosePractitioner: 'Choose a practitioner',
        allPractitioners: 'All practitioners',
        viewQueue: 'View queue',
        queueFor: 'Queue for',
        requests: 'requests',
        emptyTitle: 'No request in this view',
        emptyText: 'Waitlist requests will appear here when a patient asks for a full slot.',
        error: 'Unable to load waitlist.',
        actionError: 'Unable to update this request.',
        actionSuccess: 'Waitlist updated.',
        offeredUntil: 'Offer valid until',
        before: 'patient(s) before',
        online: 'Online',
        inPerson: 'In person',
        statuses: {
            pending: 'Pending',
            offered: 'Offered',
            accepted: 'Accepted',
            cancelled: 'Cancelled'
        }
    }
};

const statusStyles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/30',
    offered: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/30',
    accepted: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-dark-700 dark:text-slate-200 dark:ring-dark-600',
    cancelled: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-900/30'
};

const isSecretaryRole = (role) => {
    const normalized = String(role || '').toLowerCase();
    return normalized === 'secretary' || normalized === 'receptionist';
};

const safeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value, locale) => {
    const date = safeDate(value);
    if (!date) return '-';
    return date.toLocaleString(locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatTime = (value, locale) => {
    const date = safeDate(value);
    if (!date) return '-';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

export default function Waitlist() {
    const { user } = useAuthStore();
    const { language } = useI18n();
    const t = labels[language] || labels.fr;
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const isSecretary = isSecretaryRole(user?.role);
    const [entries, setEntries] = useState([]);
    const [overviewEntries, setOverviewEntries] = useState([]);
    const [practitioners, setPractitioners] = useState([]);
    const [selectedPractitionerId, setSelectedPractitionerId] = useState('all');
    const [filter, setFilter] = useState('active');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [feedback, setFeedback] = useState(null);

    const loadWaitlist = useCallback(async () => {
        setLoading(true);
        setFeedback(null);
        try {
            const params = { status: filter };
            if (selectedPractitionerId !== 'all') {
                params.practitionerId = selectedPractitionerId;
            }
            const response = await api.get('/appointments/waitlist', { params });
            setEntries(response.data.data || []);
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || t.error });
        } finally {
            setLoading(false);
        }
    }, [filter, selectedPractitionerId, t.error]);

    const isClinicAdmin = user?.role === 'admin' || user?.clinicRole === 'admin';

    const loadPractitioners = useCallback(async () => {
        try {
            const [practitionersResult, waitlistResponse] = await Promise.all([
                isClinicAdmin
                    ? api.get('/users/practitioners/admin', { params: { status: 'active' } })
                    : Promise.resolve({ data: { data: [] } }),
                api.get('/appointments/waitlist', { params: { status: 'active' } })
            ]);
            setPractitioners(practitionersResult.data.data || []);
            setOverviewEntries(waitlistResponse.data.data || []);
        } catch (error) {
            setPractitioners([]);
            setOverviewEntries([]);
        }
    }, [isClinicAdmin]);

    useEffect(() => {
        loadWaitlist();
    }, [loadWaitlist]);

    useEffect(() => {
        loadPractitioners();
    }, [loadPractitioners]);

    const stats = useMemo(() => ({
        active: entries.filter((entry) => ['pending', 'offered'].includes(entry.status)).length,
        pending: entries.filter((entry) => entry.status === 'pending').length,
        offered: entries.filter((entry) => entry.status === 'offered').length,
        total: entries.length
    }), [entries]);

    const sortedEntries = useMemo(() => (
        [...entries].sort((a, b) => (safeDate(a.startTime)?.getTime() || 0) - (safeDate(b.startTime)?.getTime() || 0))
    ), [entries]);

    const practitionerStats = useMemo(() => {
        const counts = Object.fromEntries(practitioners.map((practitioner) => [practitioner.id, {
            active: 0,
            pending: 0,
            offered: 0
        }]));

        overviewEntries.forEach((entry) => {
            if (!counts[entry.practitionerId]) return;
            if (['pending', 'offered'].includes(entry.status)) counts[entry.practitionerId].active += 1;
            if (entry.status === 'pending') counts[entry.practitionerId].pending += 1;
            if (entry.status === 'offered') counts[entry.practitionerId].offered += 1;
        });

        return counts;
    }, [overviewEntries, practitioners]);

    const selectedPractitioner = practitioners.find((practitioner) => practitioner.id === selectedPractitionerId);

    const runAction = async (entry, action) => {
        const confirmed = window.confirm(`${action === 'offer' ? t.offer : action === 'confirm' ? t.confirm : t.cancel} - ${entry.patientName || t.patient}`);
        if (!confirmed) return;

        setActionLoading(`${entry.id}:${action}`);
        setFeedback(null);
        try {
            await api.post(`/appointments/waitlist/${entry.id}/${action}`);
            setFeedback({ type: 'success', message: t.actionSuccess });
            await loadWaitlist();
            await loadPractitioners();
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || t.actionError });
        } finally {
            setActionLoading('');
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isSecretary ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'}`}>
                            <HourglassIcon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
                                {isSecretary ? t.secretaryEyebrow : t.eyebrow}
                            </p>
                            <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                                {isSecretary ? t.secretaryTitle : t.title}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                                {isSecretary ? t.secretarySubtitle : t.subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link to="/calendar" className="btn-secondary">{t.calendar}</Link>
                        <Link to="/appointments" className="btn-primary">{t.appointments}</Link>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label={t.active} value={stats.active} tone="primary" />
                <MetricCard label={t.pending} value={stats.pending} tone="warning" />
                <MetricCard label={t.offered} value={stats.offered} tone="success" />
                <MetricCard label={t.all} value={stats.total} tone="neutral" />
            </div>

            {practitioners.length > 0 && (
                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">{t.choosePractitioner}</p>
                            <h2 className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">
                                {selectedPractitioner ? `${t.queueFor} ${selectedPractitioner.fullName}` : t.allPractitioners}
                            </h2>
                        </div>
                        <button onClick={() => setSelectedPractitionerId('all')} className={`rounded-2xl px-4 py-2 text-sm font-extrabold ${selectedPractitionerId === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-slate-200'}`}>
                            {t.allPractitioners}
                        </button>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {practitioners.map((practitioner) => {
                            const count = practitionerStats[practitioner.id]?.active || 0;
                            const selected = selectedPractitionerId === practitioner.id;
                            return (
                                <button
                                    type="button"
                                    key={practitioner.id}
                                    onClick={() => setSelectedPractitionerId(practitioner.id)}
                                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-primary-200 bg-primary-50 ring-2 ring-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:ring-primary-900/30' : 'border-slate-100 bg-slate-50 hover:border-primary-100 dark:border-dark-700 dark:bg-dark-700'}`}
                                >
                                    <Avatar src={practitioner.avatarUrl} firstName={practitioner.firstName} lastName={practitioner.lastName} size="md" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-extrabold text-slate-950 dark:text-white">{practitioner.fullName}</span>
                                        <span className="block truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{practitioner.specialty || '-'}</span>
                                    </span>
                                    <span className="rounded-2xl bg-white px-3 py-2 text-sm font-extrabold text-primary-700 ring-1 ring-slate-200 dark:bg-dark-800 dark:text-primary-200 dark:ring-dark-600">
                                        {count} {t.requests}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-dark-900/60">
                        {[
                            ['active', t.active],
                            ['pending', t.pending],
                            ['offered', t.offered],
                            ['all', t.all]
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${filter === key ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-200' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={loadWaitlist} className="btn-secondary">{t.refresh}</button>
                </div>

                {feedback && (
                    <div className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${feedback.type === 'error' ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200' : 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-200'}`}>
                        {feedback.message}
                    </div>
                )}

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 dark:border-dark-700">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                    ) : sortedEntries.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-dark-700">
                            {sortedEntries.map((entry) => (
                                <WaitlistRow
                                    key={entry.id}
                                    entry={entry}
                                    locale={locale}
                                    t={t}
                                    actionLoading={actionLoading}
                                    onOffer={() => runAction(entry, 'offer')}
                                    onConfirm={() => runAction(entry, 'confirm')}
                                    onCancel={() => runAction(entry, 'cancel')}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300">
                                <HourglassIcon className="h-8 w-8" />
                            </div>
                            <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">{t.emptyTitle}</h2>
                            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">{t.emptyText}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function MetricCard({ label, value, tone }) {
    const tones = {
        primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
        success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
        neutral: 'bg-slate-100 text-slate-700 dark:bg-dark-700 dark:text-slate-200'
    };

    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg dark:border-dark-700 dark:bg-dark-800">
            <div className={`inline-flex rounded-2xl px-3 py-2 text-sm font-extrabold ${tones[tone]}`}>{label}</div>
            <p className="mt-4 text-3xl font-extrabold text-slate-950 dark:text-white">{value}</p>
        </div>
    );
}

function WaitlistRow({ actionLoading, entry, locale, onCancel, onConfirm, onOffer, t }) {
    const isOffered = entry.status === 'offered';
    const patientsBefore = Math.max((entry.position || 1) - 1, 0);
    const busy = (action) => actionLoading === `${entry.id}:${action}`;
    const disabled = Boolean(actionLoading);

    return (
        <article className="bg-white p-5 transition hover:bg-slate-50 dark:bg-dark-800 dark:hover:bg-dark-900/40">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_220px_180px_300px] xl:items-center">
                <div className="flex items-start gap-4">
                    <Avatar
                        src={entry.patientAvatarUrl}
                        name={entry.patientName}
                        alt={entry.patientName || t.patient}
                        size="lg"
                        radius="xl"
                        className="ring-2 ring-white dark:ring-dark-700"
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-extrabold text-slate-950 dark:text-white">{entry.patientName || t.patient}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${statusStyles[entry.status] || statusStyles.pending}`}>
                                {t.statuses[entry.status] || entry.status || t.pending}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{entry.appointmentType || 'Consultation'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-dark-700 dark:text-slate-200">
                                {entry.consultationMode === 'online' ? t.online : t.inPerson}
                            </span>
                            {(entry.reasonDetail || entry.reasonCategory) && (
                                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                    {entry.reasonDetail || entry.reasonCategory}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <InfoBlock label={t.slot} value={`${formatDateTime(entry.startTime, locale)} - ${formatTime(entry.endTime, locale)}`} />
                <InfoBlock label={t.position} value={`#${entry.position || 1} · ${patientsBefore} ${t.before}`} />
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">{t.contact}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{entry.patientPhone || entry.patientEmail || '-'}</p>
                    {isOffered && entry.offerExpiresAt && (
                        <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                            {t.offeredUntil} {formatTime(entry.offerExpiresAt, locale)}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button onClick={onOffer} disabled={disabled || isOffered} className="btn-secondary text-sm disabled:opacity-50">
                    {busy('offer') ? '...' : t.offer}
                </button>
                <button onClick={onConfirm} disabled={disabled} className="btn-primary text-sm disabled:opacity-50">
                    {busy('confirm') ? '...' : t.confirm}
                </button>
                <button onClick={onCancel} disabled={disabled} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200">
                    {busy('cancel') ? '...' : t.cancel}
                </button>
            </div>
        </article>
    );
}

function InfoBlock({ label, value }) {
    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

function HourglassIcon(props) {
    return (
        <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3h12M6 21h12M8 3v4a4 4 0 001.172 2.828L12 12l2.828-2.172A4 4 0 0016 7V3M8 21v-4a4 4 0 011.172-2.828L12 12l2.828 2.172A4 4 0 0116 17v4" />
        </svg>
    );
}
