import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import {
    PATIENT_LOGIN_PATH,
    clearPatientSession,
    isPatientSessionActive
} from '../../utils/authRouting';
import { useI18n } from '../../stores/languageStore';

const copy = {
    fr: {
        back: 'Retour au tableau de bord',
        loading: 'Chargement du rendez-vous...',
        notFound: 'Rendez-vous introuvable',
        notFoundText: 'Ce rendez-vous n\'existe plus ou ne vous appartient pas.',
        title: 'Détail du rendez-vous',
        subtitle: 'Consultez les informations, ajoutez un document, annulez ou reportez votre rendez-vous.',
        appointment: 'Rendez-vous',
        doctor: 'Praticien',
        date: 'Date',
        hour: 'Heure',
        status: 'Statut',
        mode: 'Mode',
        online: 'En ligne',
        inPerson: 'Présentiel',
        payment: 'Paiement',
        reason: 'Motif',
        preparation: 'Préparation',
        requestedDocuments: 'Documents demandés',
        noRequestedDocuments: 'Aucun document demandé pour ce rendez-vous.',
        notes: 'Notes',
        noNotes: 'Aucune note ajoutée.',
        linkedDocuments: 'Documents lies',
        noLinkedDocuments: 'Aucun document lié pour le moment.',
        uploadTitle: 'Ajouter un document',
        documentName: 'Nom du document',
        category: 'Categorie',
        categoryGeneral: 'General',
        categoryLab: 'Analyse',
        categoryImaging: 'Imagerie',
        categoryPrescription: 'Ordonnance',
        categoryInsurance: 'Assurance',
        documentNotes: 'Note optionnelle',
        file: 'Fichier',
        chooseFile: 'Choisir un fichier',
        selectedFile: 'Fichier sélectionné',
        upload: 'Ajouter au rendez-vous',
        uploading: 'Envoi...',
        uploadSuccess: 'Document ajoute au rendez-vous.',
        uploadError: 'Impossible d\'ajouter le document.',
        cancel: 'Annuler le rendez-vous',
        cancelConfirm: 'Voulez-vous vraiment annuler ce rendez-vous ?',
        cancelSuccess: 'Rendez-vous annule.',
        cancelError: 'Annulation impossible.',
        reschedule: 'Reporter',
        rescheduleConfirm: 'Vous allez choisir un nouveau créneau avec ce praticien.',
        viewDoctor: 'Voir le praticien',
        join: 'Rejoindre la consultation',
        actions: 'Actions rapides',
        privateAccess: 'Document visible uniquement pour ce rendez-vous.',
        statusLabel: {
            scheduled: 'Programmé',
            awaiting_approval: 'A valider',
            confirmed: 'Confirmé',
            completed: 'Terminé',
            cancelled: 'Annulé'
        }
    },
    en: {
        back: 'Back to dashboard',
        loading: 'Loading appointment...',
        notFound: 'Appointment not found',
        notFoundText: 'This appointment no longer exists or does not belong to you.',
        title: 'Appointment details',
        subtitle: 'Review details, add a document, cancel, or reschedule your appointment.',
        appointment: 'Appointment',
        doctor: 'Practitioner',
        date: 'Date',
        hour: 'Time',
        status: 'Status',
        mode: 'Mode',
        online: 'Online',
        inPerson: 'In person',
        payment: 'Payment',
        reason: 'Reason',
        preparation: 'Preparation',
        requestedDocuments: 'Requested documents',
        noRequestedDocuments: 'No document requested for this appointment.',
        notes: 'Notes',
        noNotes: 'No note added.',
        linkedDocuments: 'Linked documents',
        noLinkedDocuments: 'No linked document yet.',
        uploadTitle: 'Add a document',
        documentName: 'Document name',
        category: 'Category',
        categoryGeneral: 'General',
        categoryLab: 'Lab test',
        categoryImaging: 'Imaging',
        categoryPrescription: 'Prescription',
        categoryInsurance: 'Insurance',
        documentNotes: 'Optional note',
        file: 'File',
        chooseFile: 'Choose a file',
        selectedFile: 'Selected file',
        upload: 'Attach to appointment',
        uploading: 'Uploading...',
        uploadSuccess: 'Document attached to the appointment.',
        uploadError: 'Unable to attach the document.',
        cancel: 'Cancel appointment',
        cancelConfirm: 'Do you really want to cancel this appointment?',
        cancelSuccess: 'Appointment cancelled.',
        cancelError: 'Unable to cancel appointment.',
        reschedule: 'Reschedule',
        rescheduleConfirm: 'You will choose a new slot with this practitioner.',
        viewDoctor: 'View practitioner',
        join: 'Join consultation',
        actions: 'Quick actions',
        privateAccess: 'Document visible only for this appointment.',
        statusLabel: {
            scheduled: 'Scheduled',
            awaiting_approval: 'Awaiting approval',
            confirmed: 'Confirmed',
            completed: 'Completed',
            cancelled: 'Cancelled'
        }
    }
};

const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('patient-token')}`
});

const formatDate = (value, language) => new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
});

const formatTime = (value, language) => new Date(value).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
});

const PatientAppointmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language } = useI18n();
    const t = copy[language === 'en' ? 'en' : 'fr'];
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [docForm, setDocForm] = useState({
        name: '',
        category: 'general',
        notes: ''
    });

    const appointment = useMemo(
        () => appointments.find((item) => String(item.id) === String(id)),
        [appointments, id]
    );

    const linkedDocuments = useMemo(() => {
        const docs = profile?.documents || [];
        return docs.filter((doc) => String(doc.appointment_id || doc.appointmentId || '') === String(id));
    }, [profile, id]);

    const isPast = appointment ? new Date(appointment.startTime).getTime() < Date.now() : false;
    const canCancel = appointment && !isPast && appointment.status !== 'cancelled' && appointment.status !== 'completed';

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData || !isPatientSessionActive()) {
            navigate(PATIENT_LOGIN_PATH);
            return;
        }

        setUser(JSON.parse(userData));
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = getAuthHeaders();
            const params = { _ts: Date.now() };
            const [appointmentsRes, profileRes] = await Promise.all([
                api.get('/public/my-appointments', { headers, params }),
                api.get('/public/my-profile', { headers, params }).catch(() => null)
            ]);
            setAppointments(appointmentsRes.data.data || []);
            if (profileRes) setProfile(profileRes.data.data);
        } catch (error) {
            setFeedback({ type: 'error', message: t.notFoundText });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearPatientSession();
        navigate(PATIENT_LOGIN_PATH, { replace: true });
    };

    const handleCancel = async () => {
        if (!appointment || !window.confirm(t.cancelConfirm)) return;
        try {
            const response = await api.post(`/public/cancel-appointment/${appointment.id}`, {}, {
                headers: getAuthHeaders()
            });
            setFeedback({ type: 'success', message: response.data.message || t.cancelSuccess });
            fetchData();
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || t.cancelError });
        }
    };

    const handleReschedule = () => {
        if (!appointment) return;
        if (!window.confirm(t.rescheduleConfirm)) return;
        if (appointment.practitionerId) {
            navigate(`/doctors/${appointment.practitionerId}`);
            return;
        }
        navigate('/doctors');
    };

    const handleFileChange = (file) => {
        setSelectedFile(file || null);
        if (file && !docForm.name.trim()) {
            setDocForm((prev) => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
        }
    };

    const handleUploadDocument = async (event) => {
        event.preventDefault();
        if (!appointment || !docForm.name.trim()) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', docForm.name.trim());
            formData.append('category', docForm.category);
            formData.append('notes', docForm.notes || '');
            formData.append('appointmentId', appointment.id);
            formData.append('documentCode', docForm.name.trim());
            formData.append('accessScope', 'appointment');
            formData.append('fileType', selectedFile?.type?.startsWith('image/') ? 'image' : 'document');
            if (selectedFile) formData.append('file', selectedFile);

            await api.post('/public/documents', formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            setFeedback({ type: 'success', message: t.uploadSuccess });
            setSelectedFile(null);
            setDocForm({ name: '', category: 'general', notes: '' });
            fetchData();
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || t.uploadError });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />
                <main className="flex min-h-[70vh] items-center justify-center">
                    <div className="text-center">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.loading}</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />
                <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                    <Link to="/patient/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300">
                        <span aria-hidden="true">←</span>
                        {t.back}
                    </Link>
                    <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.notFound}</h1>
                        <p className="mt-3 text-gray-500 dark:text-gray-400">{t.notFoundText}</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <Link to="/patient/portal" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300">
                    <span aria-hidden="true">←</span>
                    {t.back}
                </Link>

                {feedback.message && (
                    <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                        feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-600 to-medical-500 p-8 text-white shadow-2xl">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-white/70">{t.appointment}</p>
                            <h1 className="text-3xl font-black sm:text-5xl">{t.title}</h1>
                            <p className="mt-4 max-w-2xl text-base font-medium text-white/80">{t.subtitle}</p>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-sm">
                            <p className="text-sm font-semibold text-white/70">{t.doctor}</p>
                            <p className="mt-1 text-2xl font-black">{appointment.practitioner}</p>
                            <p className="mt-1 text-sm text-white/75">{appointment.specialty || appointment.type}</p>
                        </div>
                    </div>
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                    <section className="space-y-6">
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoTile label={t.date} value={formatDate(appointment.startTime, language)} />
                                <InfoTile label={t.hour} value={`${formatTime(appointment.startTime, language)} - ${formatTime(appointment.endTime, language)}`} />
                                <InfoTile label={t.status} value={t.statusLabel[appointment.status] || appointment.status} />
                                <InfoTile label={t.mode} value={appointment.consultationMode === 'online' ? t.online : t.inPerson} />
                                <InfoTile label={t.payment} value={formatPayment(appointment, language)} />
                                <InfoTile label={t.reason} value={appointment.reasonDetail || appointment.reasonCategory || appointment.type} />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <DetailPanel title={t.preparation}>
                                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {appointment.preparationNotes || t.noNotes}
                                </p>
                            </DetailPanel>

                            <DetailPanel title={t.requestedDocuments}>
                                {Array.isArray(appointment.requestedDocuments) && appointment.requestedDocuments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {appointment.requestedDocuments.map((docName) => (
                                            <button
                                                key={docName}
                                                type="button"
                                                onClick={() => setDocForm((prev) => ({ ...prev, name: docName }))}
                                                className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-200"
                                            >
                                                + {docName}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.noRequestedDocuments}</p>
                                )}
                            </DetailPanel>
                        </div>

                        <DetailPanel title={t.linkedDocuments}>
                            {linkedDocuments.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {linkedDocuments.map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={doc.file_url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-primary-200 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-primary-800 dark:hover:bg-primary-900/20"
                                        >
                                            <p className="font-bold text-gray-900 dark:text-white">{doc.name}</p>
                                            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{doc.category || 'document'}</p>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t.noLinkedDocuments}</p>
                            )}
                        </DetailPanel>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.actions}</h2>
                            <div className="mt-5 grid gap-3">
                                {appointment.meeting?.joinUrl && appointment.status !== 'cancelled' && (
                                    <a href={appointment.meeting.joinUrl} target="_blank" rel="noopener noreferrer" className="btn-primary justify-center">
                                        {t.join}
                                    </a>
                                )}
                                <button type="button" onClick={handleReschedule} className="btn-secondary justify-center">
                                    {t.reschedule}
                                </button>
                                {appointment.practitionerId && (
                                    <Link to={`/doctors/${appointment.practitionerId}`} className="btn-secondary justify-center">
                                        {t.viewDoctor}
                                    </Link>
                                )}
                                {canCancel && (
                                    <button type="button" onClick={handleCancel} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                        {t.cancel}
                                    </button>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleUploadDocument} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.uploadTitle}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.privateAccess}</p>
                            <div className="mt-5 space-y-4">
                                <label className="block">
                                    <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t.documentName}</span>
                                    <input
                                        className="input-field"
                                        value={docForm.name}
                                        onChange={(event) => setDocForm((prev) => ({ ...prev, name: event.target.value }))}
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t.category}</span>
                                    <select
                                        className="input-field"
                                        value={docForm.category}
                                        onChange={(event) => setDocForm((prev) => ({ ...prev, category: event.target.value }))}
                                    >
                                        <option value="general">{t.categoryGeneral}</option>
                                        <option value="lab-test">{t.categoryLab}</option>
                                        <option value="imaging">{t.categoryImaging}</option>
                                        <option value="prescription">{t.categoryPrescription}</option>
                                        <option value="insurance">{t.categoryInsurance}</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t.documentNotes}</span>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        value={docForm.notes}
                                        onChange={(event) => setDocForm((prev) => ({ ...prev, notes: event.target.value }))}
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t.file}</span>
                                    <input
                                        type="file"
                                        accept="application/pdf,image/*,.doc,.docx"
                                        className="hidden"
                                        onChange={(event) => handleFileChange(event.target.files?.[0])}
                                        id="appointment-document-file"
                                    />
                                    <label htmlFor="appointment-document-file" className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm font-bold text-gray-600 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-300">
                                        {selectedFile ? `${t.selectedFile}: ${selectedFile.name}` : t.chooseFile}
                                    </label>
                                </label>
                                <button type="submit" disabled={saving || !docForm.name.trim()} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
                                    {saving ? t.uploading : t.upload}
                                </button>
                            </div>
                        </form>
                    </aside>
                </div>
            </main>
        </div>
    );
};

const InfoTile = ({ label, value }) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-2 text-base font-black text-gray-900 dark:text-white">{value || '-'}</p>
    </div>
);

const DetailPanel = ({ title, children }) => (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">{title}</h2>
        {children}
    </div>
);

const formatPayment = (appointment, language) => {
    const amount = Number(appointment.totalAmount || 0);
    const currency = amount > 0
        ? new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
        : '';

    const labels = language === 'en'
        ? {
            paid: 'Paid',
            'deposit-paid': 'Deposit paid',
            refunded: 'Refunded',
            pending: 'To pay on site'
        }
        : {
            paid: 'Payé',
            'deposit-paid': 'Acompte payé',
            refunded: 'Remboursé',
            pending: 'A régler sur place'
        };

    return `${labels[appointment.paymentStatus] || labels.pending}${currency ? ` - ${currency}` : ''}`;
};

export default PatientAppointmentDetail;
