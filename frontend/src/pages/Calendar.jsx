import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';
import Avatar from '../components/ui/Avatar';

const Calendar = ({ adminPicker = false }) => {
    const { language, t } = useI18n();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [practitioners, setPractitioners] = useState([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [practitionersLoading, setPractitionersLoading] = useState(false);
    const [view, setView] = useState('month');
    const [calendarSettings, setCalendarSettings] = useState(null);
    const navigate = useNavigate();
    const readOnlyPractitionerCalendar = adminPicker && Boolean(selectedPractitioner);
    const shouldPickPractitioner = adminPicker && !selectedPractitioner;

    useEffect(() => {
        if (shouldPickPractitioner) {
            setLoading(false);
            return;
        }
        fetchAppointments();
    }, [currentMonth, selectedPractitioner?.id, shouldPickPractitioner]);

    useEffect(() => {
        if (!adminPicker) return;

        const fetchPractitioners = async () => {
            try {
                setPractitionersLoading(true);
                const response = await api.get('/users/practitioners/admin', { params: { status: 'active' } });
                setPractitioners(response.data.data || []);
            } catch (error) {
                console.error('Error fetching practitioners:', error);
                setPractitioners([]);
            } finally {
                setPractitionersLoading(false);
            }
        };

        fetchPractitioners();
    }, [adminPicker]);

    useEffect(() => {
        if (adminPicker) return;

        const fetchCalendarSettings = async () => {
            try {
                const response = await api.get('/users/me/consultation-settings');
                setCalendarSettings(response.data.data.calendar);
            } catch (error) {
                console.error('Error fetching calendar settings:', error);
            }
        };

        fetchCalendarSettings();
    }, [adminPicker]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const start = startOfMonth(currentMonth).toISOString();
            const end = endOfMonth(currentMonth).toISOString();
            const params = { start, end };
            if (selectedPractitioner?.id) {
                params.practitionerId = selectedPractitioner.id;
            }
            const response = await api.get('/appointments/calendar', { params });
            setAppointments(response.data.data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAppointmentTone = (appointment) => {
        if (appointment.status === 'awaiting_approval') {
            return {
                className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800',
                label: t('staffCalendar.request')
            };
        }

        if (appointment.status === 'confirmed') {
            return {
                className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800',
                label: t('staffCalendar.confirmed')
            };
        }

        return {
            className: 'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:text-primary-200 dark:border-primary-800',
            label: appointment.status || t('staffCalendar.scheduled')
        };
    };

    const locale = language === 'en' ? enUS : fr;
    const localeCode = language === 'en' ? 'en-US' : 'fr-FR';
    const dayLabels = t('staffCalendar.daysShort');
    const getModeLabel = (mode) => {
        if (mode === 'both') return t('staffCalendar.modesCount', { count: 2 });
        if (mode === 'online') return t('staffCalendar.online');
        return t('staffCalendar.inPerson');
    };
    const getDocumentText = (appointment) => {
        const requested = Array.isArray(appointment.requestedDocuments) ? appointment.requestedDocuments.length : 0;
        const received = Number(appointment.sharedDocumentsCount || 0);
        if (requested > 0) return t('staffCalendar.documentsStatus', { received, requested });
        if (received > 0) return t('staffCalendar.sharedDocuments', { received });
        return '';
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                </h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary text-sm">{t('staffCalendar.today')}</button>
                {readOnlyPractitionerCalendar && (
                    <button onClick={() => setSelectedPractitioner(null)} className="btn-secondary text-sm">{t('common.back') || 'Retour'}</button>
                )}
                {!readOnlyPractitionerCalendar && (
                    <button onClick={() => navigate('/settings')} className="btn-secondary text-sm">{t('staffCalendar.settings')}</button>
                )}
                <div className="flex bg-gray-100 dark:bg-dark-700 rounded-xl p-1">
                    {['month', 'week'].map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-white dark:bg-dark-800 shadow' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                            {v === 'month' ? t('staffCalendar.month') : t('staffCalendar.week')}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDays = () => {
        return (
            <div className="grid grid-cols-7 mb-2">
                {dayLabels.map(day => (
                    <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = view === 'week'
            ? startOfWeek(selectedDate, { weekStartsOn: 1 })
            : startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = view === 'week'
            ? endOfWeek(selectedDate, { weekStartsOn: 1 })
            : endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const formattedDate = format(day, 'd');
                const cloneDay = day;
                const dayAppointments = appointments.filter(apt =>
                    isSameDay(new Date(apt.start), cloneDay)
                );

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => {
                            setSelectedDate(cloneDay);
                            if (!readOnlyPractitionerCalendar) {
                                navigate(`/calendar/day/${format(cloneDay, 'yyyy-MM-dd')}`);
                            }
                        }}
                        className={`min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-dark-700 transition-colors
              ${!isSameMonth(day, monthStart) ? 'bg-gray-50 dark:bg-dark-900/50' : 'bg-white dark:bg-dark-800'}
              ${isSameDay(day, selectedDate) ? 'ring-2 ring-primary-500 ring-inset' : ''}
              ${readOnlyPractitionerCalendar ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700/50'}`}
                    >
                        <div className={`text-sm font-medium mb-1 ${isSameDay(day, new Date())
                                ? 'w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center'
                                : !isSameMonth(day, monthStart)
                                    ? 'text-gray-400'
                                    : 'text-gray-900 dark:text-white'
                            }`}>
                            {formattedDate}
                        </div>
                        <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map(apt => {
                                const tone = getAppointmentTone(apt);
                                return (
                                <div key={apt.id}
                                    className={`text-xs p-1 rounded truncate ${tone.className}`}>
                                    {format(new Date(apt.start), 'HH:mm')} {apt.patientName?.split(' ')[0]} - {tone.label}
                                </div>
                            );})}
                            {dayAppointments.length > 3 && (
                                <div className="text-xs text-gray-500">{t('staffCalendar.more', { count: dayAppointments.length - 3 })}</div>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
            days = [];
        }
        return <div className="border-l border-t border-gray-100 dark:border-dark-700 rounded-xl overflow-hidden">{rows}</div>;
    };

    const selectedDayAppointments = appointments.filter(apt =>
        isSameDay(new Date(apt.start), selectedDate)
    );

    if (shouldPickPractitioner) {
        return (
            <div className="animate-fade-in space-y-6">
                <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-primary-500">{t('staffCalendar.practitionerPickerEyebrow') || 'Planning cabinet'}</p>
                            <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{t('staffCalendar.practitionerPickerTitle') || 'Choisir un praticien'}</h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                                {t('staffCalendar.practitionerPickerSubtitle') || 'Sélectionnez un praticien pour consulter son calendrier en lecture seule.'}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-extrabold text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">
                            {t('staffCalendar.practitionersCount', { count: practitioners.length }) || `${practitioners.length} praticien(s)`}
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    {practitionersLoading ? (
                        <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                    ) : practitioners.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                            {t('staffCalendar.noPractitioner') || 'Aucun médecin ou administrateur clinique trouvé.'}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {practitioners.map((practitioner) => (
                                <button
                                    key={practitioner.id}
                                    type="button"
                                    onClick={() => setSelectedPractitioner(practitioner)}
                                    className="group rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800"
                                >
                                    <div className="flex items-start gap-4">
                                        <Avatar src={practitioner.avatarUrl} firstName={practitioner.firstName} lastName={practitioner.lastName} size="lg" radius="2xl" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-lg font-extrabold text-slate-950 dark:text-white">{practitioner.fullName}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-bold text-primary-600 dark:text-primary-300">{practitioner.specialty || '-'}</p>
                                                {practitioner.isClinicAdmin && (
                                                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                                                        {t('staffDoctors.roleClinicAdmin') || 'Admin clinique'}
                                                    </span>
                                                )}
                                            </div>
                                            {practitioner.clinic?.name && (
                                                <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    {practitioner.clinic.name}{practitioner.clinic.city ? ` · ${practitioner.clinic.city}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                        <CalendarMetric label={t('staffDoctors.stats.appointments') || 'RDV'} value={practitioner.metrics?.appointments || 0} />
                                        <CalendarMetric label={t('staffDoctors.stats.upcoming') || 'À venir'} value={practitioner.metrics?.upcomingAppointments || 0} />
                                        <CalendarMetric label={t('staffDoctors.stats.patients') || 'Patients'} value={practitioner.metrics?.patients || 0} />
                                    </div>
                                    <div className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-center text-sm font-extrabold text-primary-700 transition group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/20 dark:text-primary-200">
                                        {t('staffCalendar.viewCalendar') || 'Voir calendrier'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {readOnlyPractitionerCalendar && (
                <section className="mb-6 rounded-3xl border border-primary-100 bg-white p-5 shadow-sm dark:border-primary-900/30 dark:bg-dark-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar src={selectedPractitioner.avatarUrl} firstName={selectedPractitioner.firstName} lastName={selectedPractitioner.lastName} size="lg" radius="2xl" />
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">{t('staffCalendar.readOnly') || 'Lecture seule'}</p>
                                <h1 className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">{selectedPractitioner.fullName}</h1>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{selectedPractitioner.specialty || '-'}</p>
                                    {selectedPractitioner.isClinicAdmin && (
                                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                                            {t('staffDoctors.roleClinicAdmin') || 'Admin clinique'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedPractitioner(null)} className="btn-secondary">{t('common.back') || 'Retour'}</button>
                    </div>
                </section>
            )}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar */}
                <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    {renderHeader()}
                    {loading ? (
                        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
                    ) : (
                        <>
                            {renderDays()}
                            {renderCells()}
                        </>
                    )}
                </div>

                {/* Selected Day Panel */}
                <div className="lg:w-80 space-y-4">
                <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {format(selectedDate, 'EEEE, MMMM d', { locale })}
                    </h3>
                    {selectedDayAppointments.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDayAppointments.map(apt => (
                                <div key={apt.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg font-semibold text-primary-500">
                                            {format(new Date(apt.start), 'HH:mm')}
                                        </span>
                                        <span className={`badge ${apt.status === 'confirmed' ? 'badge-success' : apt.status === 'awaiting_approval' ? 'badge-warning' : 'badge-info'}`}>
                                            {apt.status === 'awaiting_approval' ? t('staffCalendar.request') : apt.status === 'confirmed' ? t('staffCalendar.confirmed') : apt.status}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                                    <p className="text-sm text-gray-500">{apt.type}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                            apt.consultationMode === 'online'
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                            {apt.consultationMode === 'online' ? t('staffCalendar.online') : t('staffCalendar.inPerson')}
                                        </span>
                                        {apt.meeting?.status && apt.consultationMode === 'online' && (
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                apt.meeting.status === 'ready'
                                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    : apt.meeting.status === 'completed'
                                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            }`}>
                                                {apt.meeting.status === 'ready'
                                                    ? t('staffCalendar.jitsiReady')
                                                    : apt.meeting.status === 'completed'
                                                        ? t('staffCalendar.sessionCompleted')
                                                        : t('staffCalendar.sessionPending')}
                                            </span>
                                        )}
                                    </div>
                                    {(apt.reasonDetail || apt.reasonCategory || apt.preparationNotes || getDocumentText(apt)) && (
                                        <div className="mt-3 space-y-2 text-sm">
                                            {(apt.reasonDetail || apt.reasonCategory) && (
                                                <p className="rounded-lg bg-cyan-50 px-2 py-1 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                                    <span className="font-semibold">{t('staffCalendar.reason')}:</span> {apt.reasonDetail || apt.reasonCategory}
                                                </p>
                                            )}
                                            {apt.preparationNotes && (
                                                <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                                                    <span className="font-semibold">{t('staffCalendar.preparation')}:</span> {apt.preparationNotes}
                                                </p>
                                            )}
                                            {getDocumentText(apt) && (
                                                <p className="rounded-lg bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                                                    <span className="font-semibold">{t('staffCalendar.requestedDocuments')}:</span> {getDocumentText(apt)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {apt.meetLink && apt.status !== 'cancelled' && (
                                        <a
                                            href={apt.meetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 inline-flex text-sm font-medium text-primary-500 hover:underline"
                                        >
                                            {t('staffCalendar.joinJitsi')}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400">{t('staffCalendar.selectedDayEmpty')}</p>
                        </div>
                    )}
                    {!readOnlyPractitionerCalendar && (
                        <button onClick={() => navigate(`/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}&new=1`)} className="w-full btn-primary mt-4">
                            {t('staffCalendar.addAppointment')}
                        </button>
                    )}
                </div>

                {calendarSettings && !readOnlyPractitionerCalendar && (
                    <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-lg dark:border-primary-900/30 dark:bg-dark-800">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{t('staffCalendar.patientRules')}</h3>
                            <button onClick={() => navigate('/settings')} className="text-xs font-semibold text-primary-500 hover:underline">
                                {t('staffCalendar.edit')}
                            </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-dark-700">
                                <p className="text-xs text-slate-500">{t('staffCalendar.duration')}</p>
                                <p className="font-bold text-slate-900 dark:text-white">{calendarSettings.defaultDurationMinutes} min</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-dark-700">
                                <p className="text-xs text-slate-500">{t('staffCalendar.step')}</p>
                                <p className="font-bold text-slate-900 dark:text-white">{calendarSettings.slotStepMinutes} min</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {(calendarSettings.sessions || []).filter((session) => session.enabled).slice(0, 4).map((session) => (
                                <div key={session.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs dark:border-dark-700">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {t('staffCalendar.dayNames')[session.dayOfWeek]} {session.start}-{session.end}
                                    </span>
                                    <span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                                        {getModeLabel(session.mode)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

const CalendarMetric = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-dark-700">
        <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
);

export default Calendar;
