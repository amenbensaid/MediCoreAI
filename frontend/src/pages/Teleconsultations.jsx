import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const formatDateTime = (value, locale) => new Date(value).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
});

const formatTime = (value, locale) => new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
});

const Teleconsultations = () => {
    const { language, t } = useI18n();
    const [scope, setScope] = useState('upcoming');
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [summary, setSummary] = useState({ total: 0, ready: 0, upcomingToday: 0, pending: 0 });
    const [syncingAppointmentId, setSyncingAppointmentId] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    const fetchTeleconsultations = async (nextScope = scope) => {
        setLoading(true);
        try {
            const response = await api.get('/appointments/teleconsultations', {
                params: { scope: nextScope }
            });
            setAppointments(response.data.data.appointments || []);
            setSummary(response.data.data.summary || { total: 0, ready: 0, upcomingToday: 0, pending: 0 });
        } catch (error) {
            console.error('Failed to fetch teleconsultations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeleconsultations(scope);
    }, [scope]);

    const syncMeeting = async (appointmentId) => {
        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointmentId);
        try {
            const response = await api.post(`/appointments/${appointmentId}/sync-meeting`);
            setFeedback({ type: 'success', message: response.data.message || t('staffTeleconsultations.feedback.syncSuccess') });
            await fetchTeleconsultations(scope);
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffTeleconsultations.feedback.syncError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const confirmAppointment = async (appointment) => {
        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointment.id);
        try {
            const response = await api.put(`/appointments/${appointment.id}`, {
                status: 'confirmed',
                appointmentType: appointment.type,
                startTime: appointment.start,
                endTime: appointment.end,
                notes: appointment.notes || '',
                consultationMode: appointment.consultationMode || 'online'
            });
            setFeedback({
                type: 'success',
                message: response.data.message || t('staffTeleconsultations.feedback.confirmSuccess')
            });
            await fetchTeleconsultations(scope);
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffTeleconsultations.feedback.confirmError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const nextSession = useMemo(
        () => appointments.find((appointment) => appointment.status !== 'cancelled'),
        [appointments]
    );

    const getDocumentText = (appointment) => {
        const requested = Array.isArray(appointment.requestedDocuments) ? appointment.requestedDocuments.length : 0;
        const received = Number(appointment.sharedDocumentsCount || 0);
        if (requested > 0) return t('staffTeleconsultations.details.docsStatus', { received, requested });
        if (received > 0) return t('staffTeleconsultations.details.sharedDocs', { received });
        return '';
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">{t('staffTeleconsultations.eyebrow')}</p>
                    <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{t('staffTeleconsultations.title')}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        {t('staffTeleconsultations.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100 dark:bg-dark-800 dark:ring-dark-700">
                    {[
                        { key: 'upcoming', label: t('staffTeleconsultations.scope.upcoming') },
                        { key: 'today', label: t('staffTeleconsultations.scope.today') }
                    ].map((option) => (
                        <button
                            key={option.key}
                            onClick={() => setScope(option.key)}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                scope === option.key
                                    ? 'bg-primary-500 text-white'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={t('staffTeleconsultations.metrics.total')} value={summary.total} tone="slate" />
                <MetricCard label={t('staffTeleconsultations.metrics.ready')} value={summary.ready} tone="green" />
                <MetricCard label={t('staffTeleconsultations.metrics.today')} value={summary.upcomingToday} tone="blue" />
                <MetricCard label={t('staffTeleconsultations.metrics.pending')} value={summary.pending} tone="amber" />
            </div>

            {feedback.message && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    feedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                        : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                }`}>
                    {feedback.message}
                </div>
            )}

            {nextSession && (
                <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-700 p-6 text-white shadow-2xl">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{t('staffTeleconsultations.nextSession')}</p>
                            <h2 className="mt-2 text-2xl font-bold">{nextSession.patient?.fullName}</h2>
                            <p className="mt-1 text-sm text-white/75">
                                {nextSession.practitioner?.fullName || t('staffTeleconsultations.practitionerFallback')} - {formatDateTime(nextSession.start, locale)}
                            </p>
                            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                                {nextSession.type}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {nextSession.meeting?.joinUrl ? (
                                <a
                                    href={nextSession.meeting.joinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-primary-600 shadow-lg transition hover:bg-white/90"
                                >
                                    {t('staffTeleconsultations.joinJitsi')}
                                </a>
                            ) : nextSession.status === 'scheduled' ? (
                                <button
                                    onClick={() => confirmAppointment(nextSession)}
                                    disabled={syncingAppointmentId === nextSession.id}
                                    className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-primary-600 transition hover:bg-white/90 disabled:opacity-60"
                                >
                                    {syncingAppointmentId === nextSession.id ? t('staffTeleconsultations.approving') : t('staffTeleconsultations.approveAndCreate')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => syncMeeting(nextSession.id)}
                                    disabled={syncingAppointmentId === nextSession.id}
                                    className="inline-flex items-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/20 disabled:opacity-60"
                                >
                                    {syncingAppointmentId === nextSession.id ? t('staffTeleconsultations.syncing') : t('staffTeleconsultations.syncMeet')}
                                </button>
                            )}
                            <span className="inline-flex items-center rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-white/80">
                                {nextSession.meeting?.status === 'ready'
                                    ? t('staffTeleconsultations.sessionReady')
                                    : nextSession.meeting?.status === 'completed'
                                        ? t('staffTeleconsultations.sessionCompleted')
                                    : nextSession.status === 'scheduled'
                                        ? t('staffTeleconsultations.waitingDoctorApproval')
                                        : t('staffTeleconsultations.waitingSync')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg dark:border-dark-700 dark:bg-dark-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('staffTeleconsultations.queueTitle')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('staffTeleconsultations.queueSubtitle')}</p>
                    </div>
                    <button onClick={() => fetchTeleconsultations(scope)} className="btn-secondary text-sm">
                        {t('staffTeleconsultations.refresh')}
                    </button>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                ) : appointments.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('staffTeleconsultations.emptyTitle')}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('staffTeleconsultations.emptyDescription')}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-dark-700">
                        {appointments.map((appointment) => (
                            <div key={appointment.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.4fr_0.9fr_1fr_auto] lg:items-center">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{appointment.patient?.fullName}</p>
                                        <ModeBadge mode={appointment.consultationMode} t={t} />
                                        <MeetingStatusBadge status={appointment.meeting?.status} t={t} />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {appointment.practitioner?.fullName || t('staffTeleconsultations.practitionerFallback')} - {appointment.type}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{formatDateTime(appointment.start, locale)}</span>
                                        {appointment.patient?.email && <span>{appointment.patient.email}</span>}
                                        {appointment.patient?.phone && <span>{appointment.patient.phone}</span>}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <p className="font-medium text-gray-900 dark:text-white">{t('staffTeleconsultations.consultationWindow')}</p>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {formatTime(appointment.start, locale)} - {formatTime(appointment.end, locale)}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {t('staffTeleconsultations.appointmentStatus')}: <span className="font-medium text-gray-600 dark:text-gray-300">{t(`staffAppointments.statuses.${appointment.status}`) || appointment.status}</span>
                                    </p>
                                    {(appointment.reasonDetail || appointment.reasonCategory || appointment.preparationNotes || appointment.notes || getDocumentText(appointment)) && (
                                        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            {(appointment.reasonDetail || appointment.reasonCategory) && (
                                                <p><span className="font-semibold">{t('staffTeleconsultations.details.reason')}:</span> {appointment.reasonDetail || appointment.reasonCategory}</p>
                                            )}
                                            {appointment.notes && (
                                                <p><span className="font-semibold">{t('staffTeleconsultations.details.patientNote')}:</span> {appointment.notes}</p>
                                            )}
                                            {appointment.preparationNotes && (
                                                <p><span className="font-semibold">{t('staffTeleconsultations.details.preparation')}:</span> {appointment.preparationNotes}</p>
                                            )}
                                            {getDocumentText(appointment) && (
                                                <p><span className="font-semibold">{t('staffTeleconsultations.details.requestedDocs')}:</span> {getDocumentText(appointment)}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <p className="font-medium text-gray-900 dark:text-white">{t('staffTeleconsultations.synchronization')}</p>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {appointment.meeting?.lastSyncAt
                                            ? t('staffTeleconsultations.lastSync', { date: formatDateTime(appointment.meeting.lastSyncAt, locale) })
                                            : t('staffTeleconsultations.notSynced')}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {appointment.meeting?.joinUrl
                                            ? t('staffTeleconsultations.linkAvailable')
                                            : appointment.status === 'scheduled'
                                                ? t('staffTeleconsultations.needsApproval')
                                                : t('staffTeleconsultations.linkUnavailable')}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {appointment.meeting?.joinUrl ? (
                                        <a
                                            href={appointment.meeting.joinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
                                        >
                                            {t('staffTeleconsultations.joinSession')}
                                        </a>
                                    ) : appointment.status === 'scheduled' ? (
                                        <button
                                            onClick={() => confirmAppointment(appointment)}
                                            disabled={syncingAppointmentId === appointment.id}
                                            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-200 disabled:opacity-60 dark:bg-green-900/30 dark:text-green-300"
                                        >
                                            {syncingAppointmentId === appointment.id ? t('staffTeleconsultations.approving') : t('staffTeleconsultations.validateAndCreate')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => syncMeeting(appointment.id)}
                                            disabled={syncingAppointmentId === appointment.id}
                                            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-200 disabled:opacity-60 dark:bg-amber-900/30 dark:text-amber-300"
                                        >
                                            {syncingAppointmentId === appointment.id ? t('staffTeleconsultations.syncShort') : t('staffTeleconsultations.syncJitsi')}
                                        </button>
                                    )}
                                    <a href={`/appointments`} className="text-center text-sm font-medium text-primary-500 hover:underline">
                                        {t('staffTeleconsultations.openAppointment')}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, tone }) => {
    const tones = {
        slate: 'from-slate-50 to-white text-slate-700',
        green: 'from-green-50 to-white text-green-700',
        blue: 'from-blue-50 to-white text-blue-700',
        amber: 'from-amber-50 to-white text-amber-700'
    };

    return (
        <div className={`rounded-3xl border border-gray-100 bg-gradient-to-br p-5 shadow-sm ${tones[tone] || tones.slate}`}>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>
    );
};

const ModeBadge = ({ mode, t }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        mode === 'online'
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    }`}>
        {mode === 'online' ? t('staffTeleconsultations.online') : t('staffTeleconsultations.inPerson')}
    </span>
);

const MeetingStatusBadge = ({ status, t }) => {
    const styles = {
        ready: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        awaiting_approval: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        completed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        not_required: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}>
            {t(`staffTeleconsultations.meetingStatus.${status}`) || status}
        </span>
    );
};

export default Teleconsultations;
