import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const formatDateTimeInput = (date) => {
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }

    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
};

const getDayKey = (date) => formatDateTimeInput(date).slice(0, 10);

const buildDateTimeFromDateAndTime = (dateKey, time = '09:00') => {
    if (!dateKey) return '';
    return `${dateKey}T${time}`;
};

const getSessionForDate = (dateKey, sessions = []) => {
    if (!dateKey) return null;
    const date = new Date(`${dateKey}T00:00:00`);
    return sessions.find((session) => session.enabled && Number(session.dayOfWeek) === date.getDay()) || null;
};

const doctorAppointmentTypes = ['Consultation', 'Bilan', 'Suivi', 'Urgence', 'Contrôle', 'Autre'];

const addMinutesToInputValue = (value, minutes) => {
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) {
        return '';
    }

    return formatDateTimeInput(new Date(start.getTime() + minutes * 60000));
};

const Appointments = () => {
    const [searchParams] = useSearchParams();
    const { language, t } = useI18n();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [confirmingAppointment, setConfirmingAppointment] = useState(null);
    const [preparingAppointment, setPreparingAppointment] = useState(null);
    const [filter, setFilter] = useState('all');
    const [syncingAppointmentId, setSyncingAppointmentId] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const preselectedPatientId = searchParams.get('patientId') || '';
    const preselectedDate = searchParams.get('date') || '';
    const preselectedStart = searchParams.get('start') || '';
    const shouldOpenNew = searchParams.get('new') === '1';

    useEffect(() => {
        fetchAppointments();
    }, []);

    useEffect(() => {
        if (preselectedPatientId || shouldOpenNew) {
            setShowModal(true);
        }
    }, [preselectedPatientId, shouldOpenNew]);

    const fetchAppointments = async () => {
        try {
            const today = new Date();
            const startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endDate = new Date(today.setDate(today.getDate() + 30)).toISOString();

            const response = await api.get('/appointments', { params: { startDate, endDate } });
            setAppointments(response.data.data.appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('staffAppointments.confirmDelete'))) return;
        try {
            await api.delete(`/appointments/${id}`);
            setAppointments(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert(t('staffAppointments.deleteError'));
        }
    };

    const handleEdit = (apt) => {
        setEditingAppointment(apt);
    };

    const handleSyncMeeting = async (appointmentId) => {
        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointmentId);
        try {
            const response = await api.post(`/appointments/${appointmentId}/sync-meeting`);
            setFeedback({ type: 'success', message: response.data.message || t('staffAppointments.syncSuccess') });
            await fetchAppointments();
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffAppointments.syncError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const handleConfirmAppointment = async (appointment, preparation = {}) => {
        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointment.id);
        try {
            const response = await api.put(`/appointments/${appointment.id}`, {
                status: 'confirmed',
                appointmentType: appointment.type,
                startTime: appointment.start,
                endTime: appointment.end,
                notes: appointment.notes || '',
                consultationMode: appointment.consultationMode || 'in-person',
                preparationNotes: preparation.preparationNotes || '',
                requestedDocuments: preparation.requestedDocuments || [],
                createMedicalRecord: Boolean(preparation.createMedicalRecord),
                medicalRecord: preparation.createMedicalRecord ? {
                    recordType: 'pre_consultation',
                    chiefComplaint: appointment.reasonDetail || appointment.reasonCategory || appointment.type,
                    symptoms: appointment.notes || '',
                    treatmentPlan: preparation.medicalRecordPlan || '',
                    notes: preparation.preparationNotes || ''
                } : undefined
            });
            setFeedback({
                type: 'success',
                message: response.data.message || t('staffAppointments.confirmSuccess')
            });
            await fetchAppointments();
            setConfirmingAppointment(null);
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffAppointments.confirmError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const handleCompleteAppointment = async (appointment) => {
        const confirmed = window.confirm(
            t('staffAppointments.completeConfirm', { name: appointment.patient?.fullName || t('patient.badge') })
        );
        if (!confirmed) return;

        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointment.id);
        try {
            const response = await api.put(`/appointments/${appointment.id}`, {
                status: 'completed',
                appointmentType: appointment.type,
                startTime: appointment.start,
                endTime: appointment.end,
                notes: appointment.notes || '',
                consultationMode: appointment.consultationMode || 'in-person'
            });
            setFeedback({
                type: 'success',
                message: response.data.message || t('staffAppointments.completeSuccess')
            });
            await fetchAppointments();
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffAppointments.completeError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const handlePrepareAppointment = async (appointment, preparation = {}) => {
        setFeedback({ type: '', message: '' });
        setSyncingAppointmentId(appointment.id);
        try {
            const response = await api.put(`/appointments/${appointment.id}`, {
                status: appointment.status,
                appointmentType: appointment.type,
                startTime: appointment.start,
                endTime: appointment.end,
                notes: appointment.notes || '',
                consultationMode: appointment.consultationMode || 'in-person',
                preparationNotes: preparation.preparationNotes || '',
                requestedDocuments: preparation.requestedDocuments || [],
                createMedicalRecord: Boolean(preparation.createMedicalRecord),
                medicalRecord: preparation.createMedicalRecord ? {
                    recordType: 'pre_consultation',
                    chiefComplaint: appointment.reasonDetail || appointment.reasonCategory || appointment.type,
                    symptoms: appointment.notes || '',
                    treatmentPlan: preparation.medicalRecordPlan || '',
                    notes: preparation.preparationNotes || ''
                } : undefined
            });
            setFeedback({ type: 'success', message: response.data.message || t('staffAppointments.prepareSuccess') });
            await fetchAppointments();
            setPreparingAppointment(null);
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || t('staffAppointments.prepareError')
            });
        } finally {
            setSyncingAppointmentId(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'badge-info',
            awaiting_approval: 'badge-warning',
            confirmed: 'badge-success',
            in_progress: 'badge-warning',
            completed: 'badge-neutral',
            cancelled: 'badge-danger',
            no_show: 'badge-danger'
        };
        return <span className={`badge ${styles[status]}`}>{t(`staffAppointments.statuses.${status}`)}</span>;
    };

    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const getDocumentStatus = (apt) => {
        const requested = Array.isArray(apt.requestedDocuments) ? apt.requestedDocuments.length : 0;
        const received = Number(apt.sharedDocumentsCount || 0);

        if (requested > 0) {
            return {
                tone: received >= requested && received > 0 ? 'ready' : 'pending',
                label: t('staffAppointments.documentsReceived', { received, requested })
            };
        }

        if (received > 0) {
            return {
                tone: 'ready',
                label: t('staffAppointments.documentsReceivedNoRequest', { received })
            };
        }

        return {
            tone: 'empty',
            label: t('staffAppointments.noDocumentsReceived')
        };
    };

    const filteredAppointments = filter === 'all'
        ? appointments
        : appointments.filter(a => a.status === filter);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('staffAppointments.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('staffAppointments.subtitle', { count: appointments.length })}
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('staffAppointments.newAppointment')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'awaiting_approval', 'scheduled', 'confirmed', 'completed', 'cancelled'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}
                    >
                        {status === 'all' ? t('staffAppointments.filters.all') : t(`staffAppointments.filters.${status}`)}
                    </button>
                ))}
            </div>

            {feedback.message && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                    feedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-green-200 bg-green-50 text-green-700'
                }`}>
                    {feedback.message}
                </div>
            )}

            {/* Appointments List */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('staffAppointments.empty')}</h3>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-dark-700">
                        {filteredAppointments.map(apt => (
                            <div
                                key={apt.id}
                                onClick={() => setPreparingAppointment(apt)}
                                className="cursor-pointer p-6 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                                title={t('staffAppointments.clickTitle')}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={apt.patient?.avatarUrl}
                                            firstName={apt.patient?.firstName}
                                            lastName={apt.patient?.lastName}
                                            name={apt.patient?.fullName}
                                            alt={t('staffAppointments.patientPhotoAlt', { name: apt.patient?.fullName || t('patient.badge') })}
                                            size="lg"
                                            radius="xl"
                                            className="ring-2 ring-white dark:ring-dark-700"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{apt.patient?.fullName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{apt.type}</p>
                                            {apt.consultationMode && (
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <p className="text-sm text-blue-500">
                                                        {apt.consultationMode === 'online' ? t('staffAppointments.consultationOnline') : t('staffAppointments.consultationInPerson')}
                                                    </p>
                                                    {apt.meeting?.status && apt.consultationMode === 'online' && (
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                            apt.meeting.status === 'ready'
                                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                : apt.meeting.status === 'cancelled'
                                                                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        }`}>
                                                            {apt.meeting.status === 'ready'
                                                                ? t('staffAppointments.jitsiReady')
                                                                : apt.meeting.status === 'cancelled'
                                                                    ? t('staffAppointments.meetCancelled')
                                                                    : apt.meeting.status === 'completed'
                                                                        ? t('staffAppointments.sessionCompleted')
                                                                    : apt.meeting.status === 'awaiting_approval'
                                                                        ? t('staffAppointments.approvalRequired')
                                                                        : t('staffAppointments.meetPending')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {apt.practitioner && (
                                                <p className="text-sm text-primary-500">{apt.practitioner.fullName}</p>
                                            )}
                                            {(apt.reasonCategory || apt.reasonDetail) && (
                                                <div className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                                                    <span className="font-semibold">{t('staffAppointments.reason')}:</span> {apt.reasonDetail || apt.reasonCategory}
                                                </div>
                                            )}
                                            {apt.notes && (
                                                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-dark-700 dark:text-slate-300">
                                                    <span className="font-semibold">{t('staffAppointments.patientNote')}:</span> {apt.notes}
                                                </div>
                                            )}
                                            {apt.preparationNotes && (
                                                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                                                    <span className="font-semibold">{t('staffAppointments.preparation')}:</span> {apt.preparationNotes}
                                                </div>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {(apt.requestedDocuments || []).length > 0 ? (
                                                    <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700 dark:bg-violet-900/20 dark:text-violet-200">
                                                        <span className="font-semibold">{t('staffAppointments.requestedDocumentsShort')}:</span> {apt.requestedDocuments.join(', ')}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-dark-700 dark:text-slate-300">
                                                        {t('staffAppointments.noRequestedDocuments')}
                                                    </div>
                                                )}
                                                {(() => {
                                                    const documentStatus = getDocumentStatus(apt);
                                                    return (
                                                        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                                                            documentStatus.tone === 'ready'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                                                                : documentStatus.tone === 'pending'
                                                                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
                                                                    : 'bg-slate-50 text-slate-500 dark:bg-dark-700 dark:text-slate-300'
                                                        }`}>
                                                            {documentStatus.label}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {apt.meetLink && (
                                                <a
                                                    onClick={(event) => event.stopPropagation()}
                                                    href={apt.meetLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-block text-sm font-medium text-blue-500 hover:underline"
                                                >
                                                    {t('staffAppointments.joinJitsi')}
                                                </a>
                                            )}
                                            {apt.consultationMode === 'online' && !apt.meetLink && apt.status !== 'cancelled' && (
                                                <p className="mt-1 text-sm text-amber-600">
                                                    {['scheduled', 'awaiting_approval'].includes(apt.status)
                                                        ? t('staffAppointments.validateForMeet')
                                                        : apt.status === 'completed'
                                                            ? t('staffAppointments.teleconsultationDone')
                                                        : t('staffAppointments.generateMeet')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {new Date(apt.start).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className="text-lg font-semibold text-primary-500">
                                                {new Date(apt.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(apt.status)}
                                            <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                                                {['scheduled', 'awaiting_approval'].includes(apt.status) && (
                                                    <button
                                                        onClick={() => setConfirmingAppointment(apt)}
                                                        disabled={syncingAppointmentId === apt.id}
                                                        title={t('staffAppointments.actions.validate')}
                                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {['scheduled', 'awaiting_approval', 'confirmed', 'in_progress'].includes(apt.status) && (
                                                    <button
                                                        onClick={() => handleCompleteAppointment(apt)}
                                                        disabled={syncingAppointmentId === apt.id}
                                                        title={t('staffAppointments.actions.complete')}
                                                        className="p-2 text-gray-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {apt.consultationMode === 'online' && apt.status === 'confirmed' && apt.meeting?.status !== 'ready' && (
                                                    <button
                                                        onClick={() => handleSyncMeeting(apt.id)}
                                                        disabled={syncingAppointmentId === apt.id}
                                                        title={t('staffAppointments.actions.sync')}
                                                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                    >
                                                        <svg className={`w-5 h-5 ${syncingAppointmentId === apt.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-13.66-4.66L4 5.68M4 16a8 8 0 0013.66 4.66L20 18.32" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(apt)}
                                                    title={t('staffAppointments.actions.edit')}
                                                    className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(apt.id)}
                                                    title={t('staffAppointments.actions.delete')}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Appointment Modal */}
            {showModal && (
                <AddAppointmentModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchAppointments}
                    preselectedPatientId={preselectedPatientId}
                    preselectedDate={preselectedDate}
                    preselectedStart={preselectedStart}
                />
            )}

            {/* Edit Appointment Modal */}
            {editingAppointment && (
                <EditAppointmentModal
                    appointment={editingAppointment}
                    onClose={() => setEditingAppointment(null)}
                    onSuccess={fetchAppointments}
                />
            )}

            {confirmingAppointment && (
                <ConfirmAppointmentModal
                    appointment={confirmingAppointment}
                    loading={syncingAppointmentId === confirmingAppointment.id}
                    onClose={() => setConfirmingAppointment(null)}
                    onConfirm={(preparation) => handleConfirmAppointment(confirmingAppointment, preparation)}
                    language={language}
                    t={t}
                />
            )}

            {preparingAppointment && (
                <ConfirmAppointmentModal
                    mode="prepare"
                    appointment={preparingAppointment}
                    loading={syncingAppointmentId === preparingAppointment.id}
                    onClose={() => setPreparingAppointment(null)}
                    onConfirm={(preparation) => handlePrepareAppointment(preparingAppointment, preparation)}
                    language={language}
                    t={t}
                />
            )}
        </div>
    );
};

const ConfirmAppointmentModal = ({ appointment, loading, onClose, onConfirm, mode = 'confirm', language = 'fr', t = (key) => key }) => {
    const [preparationNotes, setPreparationNotes] = useState(appointment.preparationNotes || '');
    const [createMedicalRecord, setCreateMedicalRecord] = useState(!appointment.medicalRecordId);
    const [medicalRecordPlan, setMedicalRecordPlan] = useState('');
    const [requestedDocInput, setRequestedDocInput] = useState((appointment.requestedDocuments || []).join(', '));
    const [sharedDocuments, setSharedDocuments] = useState([]);
    const reason = appointment.reasonDetail || appointment.reasonCategory || appointment.type || 'Consultation';
    const isConfirmMode = mode === 'confirm';
    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    useEffect(() => {
        api.get(`/appointments/${appointment.id}/documents`)
            .then((res) => setSharedDocuments(res.data.data || []))
            .catch(() => setSharedDocuments([]));
    }, [appointment.id]);

    const submit = (event) => {
        event.preventDefault();
        const requestedDocuments = requestedDocInput
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        onConfirm({ preparationNotes, createMedicalRecord, medicalRecordPlan, requestedDocuments });
    };

    return (
        <div className="modal-overlay items-start justify-start overflow-y-auto py-6" onClick={onClose}>
            <div className="modal-content flex max-h-[calc(100vh-3rem)] max-w-2xl flex-col overflow-hidden p-0 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="shrink-0 bg-gradient-to-r from-slate-900 via-primary-700 to-medical-600 px-6 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">{isConfirmMode ? t('staffAppointments.modal.confirmTitle') : t('staffAppointments.modal.prepareTitle')}</h2>
                            <p className="mt-1 max-w-md text-sm text-white/75">
                                {t('staffAppointments.modal.subtitle')}
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-700">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-bold text-slate-950 dark:text-white">{appointment.patient?.fullName}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-800 dark:text-slate-200">
                                {appointment.consultationMode === 'online' ? t('staffAppointments.modal.online') : t('staffAppointments.modal.inPerson')}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            {new Date(appointment.start).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <div className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-200">
                            <span className="font-semibold">{t('staffAppointments.reason')}:</span> {reason}
                        </div>
                        {appointment.notes && (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t('staffAppointments.patientNote')}: {appointment.notes}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t('staffAppointments.modal.preparationNote')}
                        </label>
                        <textarea
                            value={preparationNotes}
                            onChange={(event) => setPreparationNotes(event.target.value)}
                            className="input-field"
                            rows={3}
                            placeholder={t('staffAppointments.modal.preparationPlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t('staffAppointments.modal.requestedDocuments')}
                        </label>
                        <input
                            value={requestedDocInput}
                            onChange={(event) => setRequestedDocInput(event.target.value)}
                            className="input-field"
                            placeholder={t('staffAppointments.modal.requestedPlaceholder')}
                        />
                        <p className="mt-1 text-xs text-slate-500">{t('staffAppointments.modal.commaHelp')}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-dark-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 dark:text-white">{t('staffAppointments.modal.sharedDocuments')}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                sharedDocuments.length > 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
                            }`}>
                                {requestedDocInput.split(',').map((item) => item.trim()).filter(Boolean).length > 0
                                    ? t('staffAppointments.documentsReceived', {
                                        received: sharedDocuments.length,
                                        requested: requestedDocInput.split(',').map((item) => item.trim()).filter(Boolean).length
                                    })
                                    : sharedDocuments.length > 0
                                        ? t('staffAppointments.documentsReceivedNoRequest', { received: sharedDocuments.length })
                                        : t('staffAppointments.noDocumentsReceived')}
                            </span>
                        </div>
                        {sharedDocuments.length > 0 ? (
                            <div className="mt-3 space-y-2">
                                {sharedDocuments.map((doc) => (
                                    <a
                                        key={doc.id}
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-700 dark:text-slate-200"
                                    >
                                        <span>{doc.document_code || doc.name}</span>
                                        <span className="text-xs">{doc.file_type}</span>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t('staffAppointments.modal.noSharedDocuments')}
                            </p>
                        )}
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800">
                        <input
                            type="checkbox"
                            checked={createMedicalRecord}
                            onChange={(event) => setCreateMedicalRecord(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>
                            <span className="block font-bold text-slate-900 dark:text-white">{t('staffAppointments.modal.createRecord')}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {t('staffAppointments.modal.createRecordHelp')}
                            </span>
                        </span>
                    </label>

                    {createMedicalRecord && (
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                {t('staffAppointments.modal.recordPlan')}
                            </label>
                            <textarea
                                value={medicalRecordPlan}
                                onChange={(event) => setMedicalRecordPlan(event.target.value)}
                                className="input-field"
                                rows={3}
                                placeholder={t('staffAppointments.modal.recordPlanPlaceholder')}
                            />
                        </div>
                    )}

                    </div>

                    <div className="shrink-0 border-t border-slate-100 bg-white p-4 dark:border-dark-700 dark:bg-dark-800">
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 btn-secondary">{t('common.cancel')}</button>
                            <button type="submit" disabled={loading} className="flex-1 btn-primary">
                                {loading ? t('staffAppointments.modal.saving') : isConfirmMode ? t('staffAppointments.modal.confirm') : t('staffAppointments.modal.save')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddAppointmentModal = ({ onClose, onSuccess, preselectedPatientId = '', preselectedDate = '', preselectedStart = '' }) => {
    const [formData, setFormData] = useState({
        patientId: preselectedPatientId,
        appointmentType: '',
        startTime: preselectedDate && preselectedStart ? buildDateTimeFromDateAndTime(preselectedDate, preselectedStart) : '',
        endTime: '',
        notes: '',
        consultationMode: 'in-person'
    });
    const [patients, setPatients] = useState([]);
    const [calendarSettings, setCalendarSettings] = useState({ defaultDurationMinutes: 30 });
    const [customAppointmentType, setCustomAppointmentType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/patients?limit=100').then(res => setPatients(res.data.data.patients));
        api.get('/users/me/consultation-settings')
            .then(res => setCalendarSettings(res.data.data.calendar || { defaultDurationMinutes: 30, sessions: [] }))
            .catch(() => setCalendarSettings({ defaultDurationMinutes: 30, sessions: [] }));
    }, []);

    useEffect(() => {
        if (preselectedPatientId) {
            setFormData((prev) => ({ ...prev, patientId: preselectedPatientId }));
        }
    }, [preselectedPatientId]);

    useEffect(() => {
        if (!preselectedDate) return;
        const session = getSessionForDate(preselectedDate, calendarSettings.sessions || []);
        const nextStart = buildDateTimeFromDateAndTime(preselectedDate, preselectedStart || session?.start || '09:00');
        const nextEnd = addMinutesToInputValue(nextStart, calendarSettings.defaultDurationMinutes || 30);
        setFormData((prev) => ({
            ...prev,
            startTime: prev.startTime || nextStart,
            endTime: prev.endTime || nextEnd,
            consultationMode: session?.mode === 'online' ? 'online' : 'in-person'
        }));
    }, [preselectedDate, preselectedStart, calendarSettings]);

    const availableModes = useMemo(() => {
        const dateKey = formData.startTime?.slice(0, 10);
        const session = getSessionForDate(dateKey, calendarSettings.sessions || []);
        if (session?.mode === 'online') return ['online'];
        if (session?.mode === 'in-person') return ['in-person'];
        return ['in-person', 'online'];
    }, [formData.startTime, calendarSettings]);

    useEffect(() => {
        if (!availableModes.includes(formData.consultationMode)) {
            setFormData((prev) => ({ ...prev, consultationMode: availableModes[0] || 'in-person' }));
        }
    }, [availableModes, formData.consultationMode]);

    const updateStartTime = (value) => {
        setFormData((prev) => ({
            ...prev,
            startTime: value,
            endTime: addMinutesToInputValue(value, calendarSettings.defaultDurationMinutes || 30)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const computedEndTime = addMinutesToInputValue(formData.startTime, calendarSettings.defaultDurationMinutes || 30);

        if (!formData.startTime || !computedEndTime) {
            setError('La date de début est obligatoire');
            return;
        }

        if (!availableModes.includes(formData.consultationMode)) {
            setError('Ce mode de consultation n’est pas disponible dans cette séance');
            return;
        }

        setLoading(true);
        try {
            const resolvedAppointmentType = formData.appointmentType === 'Autre'
                ? customAppointmentType.trim()
                : formData.appointmentType;

            if (!resolvedAppointmentType) {
                setError('Le type de rendez-vous est obligatoire');
                setLoading(false);
                return;
            }

            await api.post('/appointments', {
                ...formData,
                appointmentType: resolvedAppointmentType,
                endTime: computedEndTime
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating appointment:', error);
            setError(error.response?.data?.message || 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-2xl overflow-hidden p-0" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-primary-600 to-violet-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Nouveau rendez-vous</h2>
                            <p className="mt-1 text-sm text-white/80">
                                La fin est calculée automatiquement selon la durée configurée.
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="grid flex-1 grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-dark-700">
                            <p className="text-xs text-slate-500">Durée</p>
                            <p className="font-bold text-slate-900 dark:text-white">{calendarSettings.defaultDurationMinutes || 30} min</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-dark-700">
                            <p className="text-xs text-slate-500">Début</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {formData.startTime ? new Date(formData.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-primary-50 p-3 dark:bg-primary-900/20">
                            <p className="text-xs text-primary-600 dark:text-primary-300">Fin calculée</p>
                            <p className="font-bold text-primary-700 dark:text-primary-200">
                                {formData.endTime ? new Date(formData.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient</label>
                        <select value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                            className="input-field" required>
                            <option value="">Sélectionner un patient</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de rendez-vous</label>
                        <select value={formData.appointmentType} onChange={e => setFormData({ ...formData, appointmentType: e.target.value })}
                            className="input-field" required>
                            <option value="">Sélectionner</option>
                            {doctorAppointmentTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    {formData.appointmentType === 'Autre' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type personnalisé</label>
                            <input
                                type="text"
                                value={customAppointmentType}
                                onChange={(e) => setCustomAppointmentType(e.target.value)}
                                className="input-field"
                                placeholder="Ex: certificat, contrôle pré-opératoire..."
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode de consultation</label>
                        <select
                            value={formData.consultationMode}
                            onChange={e => setFormData({ ...formData, consultationMode: e.target.value })}
                            className="input-field"
                        >
                            {availableModes.includes('in-person') && <option value="in-person">Présentiel</option>}
                            {availableModes.includes('online') && <option value="online">En ligne (Jitsi Meet)</option>}
                        </select>
                    </div>
                    <div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date et heure de début</label>
                            <input type="datetime-local" value={formData.startTime}
                                onChange={e => updateStartTime(e.target.value)}
                                className="input-field" required />
                        </div>
                    </div>
                    <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300">
                        Début: {formData.startTime ? new Date(formData.startTime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                        {' '}→ fin automatique: {formData.endTime ? new Date(formData.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}.
                    </div>
                    {formData.consultationMode === 'online' && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                            Le médecin valide le rendez-vous, puis le lien Jitsi Meet est généré automatiquement.
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="input-field" rows={3} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? 'Création...' : 'Créer le rendez-vous'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

const EditAppointmentModal = ({ appointment, onClose, onSuccess }) => {
    const { t } = useI18n();
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return formatDateTimeInput(d);
    };

    const initialType = doctorAppointmentTypes.includes(appointment.type) ? appointment.type : 'Autre';
    const [formData, setFormData] = useState({
        status: appointment.status || 'scheduled',
        appointmentType: initialType,
        startTime: formatDateForInput(appointment.start),
        endTime: formatDateForInput(appointment.end),
        notes: appointment.notes || '',
        consultationMode: appointment.consultationMode || 'in-person'
    });
    const [customAppointmentType, setCustomAppointmentType] = useState(initialType === 'Autre' ? appointment.type || '' : '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.startTime || !formData.endTime) {
            setError(t('staffAppointments.editModal.startEndRequired'));
            return;
        }

        if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            setError(t('staffAppointments.editModal.endAfterStart'));
            return;
        }

        setLoading(true);
        try {
            const resolvedAppointmentType = formData.appointmentType === 'Autre'
                ? customAppointmentType.trim()
                : formData.appointmentType;

            if (!resolvedAppointmentType) {
                setError(t('staffAppointments.editModal.typeRequired'));
                setLoading(false);
                return;
            }

            await api.put(`/appointments/${appointment.id}`, {
                ...formData,
                appointmentType: resolvedAppointmentType
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating appointment:', error);
            setError(error.response?.data?.message || t('staffAppointments.editModal.updateError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t('staffAppointments.editModal.title', { name: appointment.patient?.fullName })}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.status')}</label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="input-field">
                            <option value="scheduled">{t('staffAppointments.statuses.scheduled')}</option>
                            <option value="confirmed">{t('staffAppointments.statuses.confirmed')}</option>
                            <option value="in_progress">{t('staffAppointments.statuses.in_progress')}</option>
                            <option value="completed">{t('staffAppointments.statuses.completed')}</option>
                            <option value="cancelled">{t('staffAppointments.statuses.cancelled')}</option>
                            <option value="no_show">{t('staffAppointments.statuses.no_show')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.type')}</label>
                        <select value={formData.appointmentType} onChange={e => setFormData({ ...formData, appointmentType: e.target.value })}
                            className="input-field">
                            {doctorAppointmentTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    {formData.appointmentType === 'Autre' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.customType')}</label>
                            <input
                                type="text"
                                value={customAppointmentType}
                                onChange={(e) => setCustomAppointmentType(e.target.value)}
                                className="input-field"
                                placeholder={t('staffAppointments.editModal.customTypePlaceholder')}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.consultationMode')}</label>
                        <select
                            value={formData.consultationMode}
                            onChange={e => setFormData({ ...formData, consultationMode: e.target.value })}
                            className="input-field"
                        >
                            <option value="in-person">{t('staffAppointments.editModal.inPerson')}</option>
                            <option value="online">{t('staffAppointments.editModal.online')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.start')}</label>
                            <input type="datetime-local" value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.end')}</label>
                            <input type="datetime-local" value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="input-field" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staffAppointments.editModal.notes')}</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="input-field" rows={3} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? t('staffAppointments.editModal.saving') : t('staffAppointments.editModal.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Appointments;
