import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const modeBadgeClass = {
    both: 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-200',
    online: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-200',
    'in-person': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200'
};

const CalendarDay = () => {
    const { language, t } = useI18n();
    const { date } = useParams();
    const navigate = useNavigate();
    const selectedDate = parseISO(date || '');
    const safeDate = isValid(selectedDate) ? selectedDate : new Date();
    const dateKey = format(safeDate, 'yyyy-MM-dd');
    const [appointments, setAppointments] = useState([]);
    const [waitlist, setWaitlist] = useState([]);
    const [calendarSettings, setCalendarSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [message, setMessage] = useState('');
    const locale = language === 'en' ? enUS : fr;
    const getModeLabel = (mode) => {
        if (mode === 'both') return t('staffCalendar.bothModes');
        if (mode === 'online') return t('staffCalendar.onlineOnly');
        return t('staffCalendar.inPersonOnly');
    };
    const getShortModeLabel = (mode) => (
        mode === 'online' ? t('staffCalendar.online') : t('staffCalendar.inPerson')
    );
    const getDocumentText = (appointment) => {
        const requested = Array.isArray(appointment.requestedDocuments) ? appointment.requestedDocuments.length : 0;
        const received = Number(appointment.sharedDocumentsCount || 0);
        if (requested > 0) return t('staffCalendar.documentsStatus', { received, requested });
        if (received > 0) return t('staffCalendar.sharedDocuments', { received });
        return '';
    };

    useEffect(() => {
        const fetchDay = async () => {
            setLoading(true);
            try {
                const start = new Date(`${dateKey}T00:00:00`);
                const end = addDays(start, 1);
                const [appointmentsResponse, waitlistResponse, settingsResponse] = await Promise.all([
                    api.get('/appointments/calendar', {
                        params: {
                            start: start.toISOString(),
                            end: end.toISOString()
                        }
                    }),
                    api.get('/appointments/waitlist', {
                        params: {
                            date: dateKey,
                            status: 'active'
                        }
                    }),
                    api.get('/users/me/consultation-settings')
                ]);
                setAppointments(appointmentsResponse.data.data || []);
                setWaitlist(waitlistResponse.data.data || []);
                setCalendarSettings(settingsResponse.data.data.calendar || null);
            } catch (error) {
                console.error('Error fetching day calendar:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDay();
    }, [dateKey]);

    const refreshDay = async () => {
        const start = new Date(`${dateKey}T00:00:00`);
        const end = addDays(start, 1);
        const [appointmentsResponse, waitlistResponse] = await Promise.all([
            api.get('/appointments/calendar', {
                params: { start: start.toISOString(), end: end.toISOString() }
            }),
            api.get('/appointments/waitlist', {
                params: { date: dateKey, status: 'active' }
            })
        ]);
        setAppointments(appointmentsResponse.data.data || []);
        setWaitlist(waitlistResponse.data.data || []);
    };

    const handleWaitlistAction = async (entry, action) => {
        setMessage('');
        setActionLoading(`${entry.id}:${action}`);
        try {
            const response = await api.post(`/appointments/waitlist/${entry.id}/${action}`);
            setMessage(response.data.message || t(`staffCalendar.waitlist.feedback.${action}`));
            await refreshDay();
        } catch (error) {
            setMessage(error.response?.data?.message || t('staffCalendar.waitlist.feedback.error'));
        } finally {
            setActionLoading('');
        }
    };

    const daySessions = useMemo(() => {
        const dayOfWeek = safeDate.getDay();
        return (calendarSettings?.sessions || [])
            .filter((session) => session.enabled && Number(session.dayOfWeek) === dayOfWeek)
            .sort((a, b) => a.start.localeCompare(b.start));
    }, [calendarSettings, safeDate]);

    const sortedAppointments = useMemo(() => (
        [...appointments].sort((a, b) => new Date(a.start) - new Date(b.start))
    ), [appointments]);

    const addAppointment = (startTime) => {
        const query = new URLSearchParams({ date: dateKey, new: '1' });
        if (startTime) {
            query.set('start', startTime);
        }
        navigate(`/appointments?${query.toString()}`);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link to="/calendar" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('staffCalendar.day.back')}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {format(safeDate, 'EEEE d MMMM yyyy', { locale })}
                    </h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                        {t('staffCalendar.day.subtitle')}
                    </p>
                </div>
                <button onClick={() => addAppointment(daySessions[0]?.start)} className="btn-primary">
                    {t('staffCalendar.addAppointment')}
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('staffCalendar.day.sessionsTitle')}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('staffCalendar.dayNames')[safeDate.getDay()]}</p>
                        </div>
                        <div className="rounded-xl bg-primary-50 px-3 py-2 text-center dark:bg-primary-900/20">
                            <p className="text-xs text-primary-600 dark:text-primary-300">{t('staffCalendar.duration')}</p>
                            <p className="font-bold text-primary-700 dark:text-primary-200">
                                {calendarSettings?.defaultDurationMinutes || 30} min
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {loading ? (
                            <div className="flex h-32 items-center justify-center"><div className="spinner" /></div>
                        ) : daySessions.length > 0 ? (
                            daySessions.map((session) => (
                                <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/40">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-bold text-slate-950 dark:text-white">
                                                {session.start} - {session.end}
                                            </p>
                                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${modeBadgeClass[session.mode] || modeBadgeClass.both}`}>
                                                {getModeLabel(session.mode)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => addAppointment(session.start)}
                                            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-primary-600 shadow-sm ring-1 ring-slate-200 hover:bg-primary-50 dark:bg-dark-800 dark:ring-dark-700 dark:hover:bg-primary-900/20"
                                        >
                                            {t('staffCalendar.day.add')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-dark-700">
                                <p className="font-semibold text-slate-900 dark:text-white">{t('staffCalendar.day.noSessionTitle')}</p>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {t('staffCalendar.day.noSessionDescription')}
                                </p>
                                <div className="mt-4 flex flex-col gap-2">
                                    <button onClick={() => addAppointment('09:00')} className="btn-primary">
                                        {t('staffCalendar.addAppointment')}
                                    </button>
                                    <button onClick={() => navigate('/settings')} className="btn-secondary">
                                        {t('staffCalendar.day.configureSessions')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('staffCalendar.day.appointmentsTitle')}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('staffCalendar.day.appointmentsCount', { count: sortedAppointments.length })}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {loading ? (
                            <div className="flex h-48 items-center justify-center"><div className="spinner" /></div>
                        ) : sortedAppointments.length > 0 ? (
                            sortedAppointments.map((appointment) => (
                                <article key={appointment.id} className="rounded-2xl border border-slate-100 p-4 transition hover:border-primary-100 hover:bg-primary-50/40 dark:border-dark-700 dark:hover:bg-primary-900/10">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar
                                                    src={appointment.patientAvatarUrl}
                                                    name={appointment.patientName}
                                                    alt={t('staffCalendar.patientPhotoAlt', { name: appointment.patientName || t('patient.badge') })}
                                                    size="lg"
                                                    radius="xl"
                                                    className="ring-2 ring-white dark:ring-dark-700"
                                                />
                                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                                    {format(new Date(appointment.start), 'HH:mm')}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-950 dark:text-white">{appointment.patientName || t('patient.badge')}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.type || 'Consultation'}</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-700 dark:text-slate-200">
                                                        {getShortModeLabel(appointment.consultationMode)}
                                                    </span>
                                                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">
                                                        {t(`staffAppointments.statuses.${appointment.status}`) || appointment.status}
                                                    </span>
                                                </div>
                                                {(appointment.reasonDetail || appointment.reasonCategory || appointment.preparationNotes || getDocumentText(appointment)) && (
                                                    <div className="mt-3 space-y-2 text-sm">
                                                        {(appointment.reasonDetail || appointment.reasonCategory) && (
                                                            <p className="rounded-lg bg-cyan-50 px-2 py-1 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                                                <span className="font-semibold">{t('staffCalendar.reason')}:</span> {appointment.reasonDetail || appointment.reasonCategory}
                                                            </p>
                                                        )}
                                                        {appointment.preparationNotes && (
                                                            <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                                                                <span className="font-semibold">{t('staffCalendar.preparation')}:</span> {appointment.preparationNotes}
                                                            </p>
                                                        )}
                                                        {getDocumentText(appointment) && (
                                                            <p className="rounded-lg bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                                                                <span className="font-semibold">{t('staffCalendar.requestedDocuments')}:</span> {getDocumentText(appointment)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate('/appointments')}
                                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:text-primary-600 dark:border-dark-700 dark:text-slate-200"
                                        >
                                            {t('staffCalendar.day.viewInAppointments')}
                                        </button>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-dark-700">
                                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="mt-4 font-bold text-slate-950 dark:text-white">{t('staffCalendar.day.emptyTitle')}</h3>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {t('staffCalendar.day.emptyDescription')}
                                </p>
                                <button onClick={() => addAppointment(daySessions[0]?.start || '09:00')} className="btn-primary mt-5">
                                    {t('staffCalendar.addAppointment')}
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-amber-100 bg-white p-6 shadow-lg dark:border-amber-900/30 dark:bg-dark-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-600">{t('staffCalendar.waitlist.eyebrow')}</p>
                        <h2 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">{t('staffCalendar.waitlist.title')}</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('staffCalendar.waitlist.subtitle')}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-900/20">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">{t('staffCalendar.waitlist.active')}</p>
                        <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-200">{waitlist.length}</p>
                    </div>
                </div>

                {message && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                        {message}
                    </div>
                )}

                <div className="mt-5 grid gap-4">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center"><div className="spinner" /></div>
                    ) : waitlist.length > 0 ? (
                        waitlist.map((entry) => (
                            <WaitlistStaffCard
                                key={entry.id}
                                entry={entry}
                                language={language}
                                t={t}
                                actionLoading={actionLoading}
                                onOffer={() => handleWaitlistAction(entry, 'offer')}
                                onConfirm={() => handleWaitlistAction(entry, 'confirm')}
                                onCancel={() => handleWaitlistAction(entry, 'cancel')}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-dark-700">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">⏳</div>
                            <p className="font-bold text-slate-900 dark:text-white">{t('staffCalendar.waitlist.emptyTitle')}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('staffCalendar.waitlist.emptyText')}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

const WaitlistStaffCard = ({ entry, language, t, actionLoading, onOffer, onConfirm, onCancel }) => {
    const patientsBefore = Math.max((entry.position || 1) - 1, 0);
    const isOffered = entry.status === 'offered';
    const isBusy = (action) => actionLoading === `${entry.id}:${action}`;
    const statusClass = isOffered
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200'
        : 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-200';

    return (
        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/30">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                    <Avatar
                        src={entry.patientAvatarUrl}
                        name={entry.patientName}
                        alt={entry.patientName}
                        size="lg"
                        radius="xl"
                        className="ring-2 ring-white dark:ring-dark-700"
                    />
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-950 dark:text-white">{entry.patientName}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass}`}>
                                {isOffered ? t('staffCalendar.waitlist.status.offered') : t('staffCalendar.waitlist.status.pending')}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-dark-800 dark:text-slate-200 dark:ring-dark-700">
                                {patientsBefore} {t('staffCalendar.waitlist.before')}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {entry.appointmentType} • {new Date(entry.startTime).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.endTime).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                                {entry.consultationMode === 'online' ? t('staffCalendar.online') : t('staffCalendar.inPerson')}
                            </span>
                            {(entry.reasonDetail || entry.reasonCategory) && (
                                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                    {entry.reasonDetail || entry.reasonCategory}
                                </span>
                            )}
                        </div>
                        {isOffered && entry.offerExpiresAt && (
                            <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                {t('staffCalendar.waitlist.offerExpires')} {new Date(entry.offerExpiresAt).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 xl:w-[420px]">
                    <button onClick={onOffer} disabled={isOffered || Boolean(actionLoading)} className="btn-secondary text-sm disabled:opacity-50">
                        {isBusy('offer') ? t('common.loading') : t('staffCalendar.waitlist.offer')}
                    </button>
                    <button onClick={onConfirm} disabled={Boolean(actionLoading)} className="btn-primary text-sm">
                        {isBusy('confirm') ? t('common.loading') : t('staffCalendar.waitlist.confirm')}
                    </button>
                    <button onClick={onCancel} disabled={Boolean(actionLoading)} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                        {isBusy('cancel') ? t('common.loading') : t('staffCalendar.waitlist.cancel')}
                    </button>
                </div>
            </div>
        </article>
    );
};

export default CalendarDay;
