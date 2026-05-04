import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import {
    PATIENT_LOGIN_PATH,
    clearPatientSession,
    getDisplayName
} from '../../utils/authRouting';
import { getAssetUrl } from '../../utils/assets';
import { useI18n } from '../../stores/languageStore';

const medicalDocumentTypeKeys = [
    'bloodTest',
    'imaging',
    'prescription',
    'report',
    'certificate',
    'insuranceCard',
    'identity',
    'other'
];

const PatientPortal = () => {
    const navigate = useNavigate();
    const { language, t } = useI18n();
    const [user, setUser] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('appointments');
    const [showNoteModal, setShowNoteModal] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [showDocModal, setShowDocModal] = useState(false);
    const [editingDocument, setEditingDocument] = useState(null);
    const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);
    const [docForm, setDocForm] = useState({ name: '', fileType: 'document', category: 'general', notes: '', appointmentId: '', documentCode: '', accessScope: 'private' });
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profileForm, setProfileForm] = useState({});
    const [profileAvatarFile, setProfileAvatarFile] = useState(null);
    const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const resetDocumentModal = () => {
        setShowDocModal(false);
        setEditingDocument(null);
        setSelectedDocumentFile(null);
        setDocForm({ name: '', fileType: 'document', category: 'general', notes: '', appointmentId: '', documentCode: '', accessScope: 'private' });
    };

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) { navigate(PATIENT_LOGIN_PATH); return; }
        setUser(JSON.parse(userData));
        fetchAll(token);

        // Écouteur pour ouvrir la modal de profil depuis la navbar
        const handleOpenProfileModal = () => {
            if (profile) {
                setProfileForm({
                    ...profile,
                    allergies: (profile.allergies || []).join(', '),
                    chronicConditions: (profile.chronicConditions || []).join(', '),
                    currentMedications: (profile.currentMedications || []).join(', ')
                });
                setProfileAvatarFile(null);
                setProfileAvatarPreview('');
                setShowProfileEdit(true);
            }
        };

        window.addEventListener('openProfileModal', handleOpenProfileModal);
        return () => window.removeEventListener('openProfileModal', handleOpenProfileModal);
    }, [profile]);

    const fetchAll = async (token) => {
        const headers = {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
        };
        const params = { _ts: Date.now() };
        try {
            const [aptsRes, profileRes] = await Promise.all([
                api.get('/public/my-appointments', { headers, params }),
                api.get('/public/my-profile', { headers, params }).catch(() => null)
            ]);
            setAppointments(aptsRes.data.data);
            if (profileRes) {
                const nextProfile = profileRes.data.data;
                setProfile(nextProfile);
                setUser((prev) => {
                    if (!prev) return prev;
                    const nextUser = { ...prev, avatarUrl: nextProfile.avatarUrl };
                    localStorage.setItem('patient-user', JSON.stringify(nextUser));
                    return nextUser;
                });
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const normalizeList = (value) => {
        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    };

    const handleLogout = () => {
        clearPatientSession();
        navigate(PATIENT_LOGIN_PATH, { replace: true });
    };

    const handleCancel = async (id) => {
        if (!window.confirm(t('patientPortal.feedback.cancelConfirm'))) return;
        try {
            const token = localStorage.getItem('patient-token');
            const res = await api.post(`/public/cancel-appointment/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedback({ type: 'success', message: res.data.message });
            fetchAll(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientPortal.feedback.cancelError') });
        }
    };

    const handleAddNote = async () => {
        if (!noteContent.trim()) return;
        try {
            const token = localStorage.getItem('patient-token');
            await api.post('/public/appointment-notes', {
                appointmentId: showNoteModal, content: noteContent
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowNoteModal(null);
            setNoteContent('');
            setFeedback({ type: 'success', message: t('patientPortal.feedback.noteAdded') });
            fetchAll(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientPortal.feedback.noteError') });
        }
    };

    const handleOpenCreateDocument = (preset = {}) => {
        setEditingDocument(null);
        setSelectedDocumentFile(null);
        setDocForm({
            name: preset.name || '',
            fileType: 'document',
            category: preset.category || 'general',
            notes: preset.notes || '',
            appointmentId: preset.appointmentId || '',
            documentCode: preset.documentCode || '',
            accessScope: preset.appointmentId ? 'appointment' : 'private'
        });
        setShowDocModal(true);
    };

    const handleOpenEditDocument = (doc) => {
        setEditingDocument(doc);
        setSelectedDocumentFile(null);
        setDocForm({
            name: doc.name || '',
            fileType: doc.file_type || 'document',
            category: doc.category || 'general',
            notes: doc.notes || '',
            appointmentId: doc.appointment_id || doc.appointment_access_id || '',
            documentCode: doc.document_code || '',
            accessScope: doc.access_scope || 'private'
        });
        setShowDocModal(true);
    };

    const handleDocumentFileChange = (file) => {
        setSelectedDocumentFile(file);
        const detectedType = detectDocumentKind({ file, currentType: docForm.fileType });
        const nextName = !editingDocument && file && !docForm.name.trim()
            ? file.name.replace(/\.[^.]+$/, '')
            : docForm.name;

        setDocForm((prev) => ({
            ...prev,
            name: nextName,
            fileType: detectedType
        }));
    };

    const handleSaveDoc = async () => {
        if (!docForm.name.trim()) return;
        try {
            const token = localStorage.getItem('patient-token');
            const formData = new FormData();
            formData.append('name', docForm.name);
            formData.append('category', docForm.category);
            formData.append('notes', docForm.notes);
            formData.append('appointmentId', docForm.appointmentId);
            formData.append('documentCode', docForm.documentCode);
            formData.append('accessScope', docForm.accessScope);
            if (selectedDocumentFile) {
                formData.append('file', selectedDocumentFile);
            }

            const request = editingDocument
                ? api.put(`/public/documents/${editingDocument.id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                })
                : api.post('/public/documents', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

            await request;
            resetDocumentModal();
            setFeedback({
                type: 'success',
                message: editingDocument ? t('patientPortal.documents.updated') : t('patientPortal.documents.uploaded')
            });
            fetchAll(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientPortal.documents.saveError') });
        }
    };

    const handleDeleteDoc = async (doc) => {
        if (!window.confirm(t('patientPortal.documents.deleteConfirm', { name: doc.name }))) return;

        try {
            const token = localStorage.getItem('patient-token');
            await api.delete(`/public/documents/${doc.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setFeedback({ type: 'success', message: t('patientPortal.documents.deleted') });
            fetchAll(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientPortal.documents.deleteError') });
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const token = localStorage.getItem('patient-token');
            const normalizedProfile = {
                ...profileForm,
                allergies: normalizeList(profileForm.allergies),
                chronicConditions: normalizeList(profileForm.chronicConditions),
                currentMedications: normalizeList(profileForm.currentMedications)
            };
            let payload = normalizedProfile;
            const headers = { Authorization: `Bearer ${token}` };

            if (profileAvatarFile) {
                payload = new FormData();
                Object.entries(normalizedProfile).forEach(([key, value]) => {
                    payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value ?? '');
                });
                payload.append('avatar', profileAvatarFile);
                headers['Content-Type'] = 'multipart/form-data';
            }

            const response = await api.put('/public/my-profile', payload, { headers });
            const nextAvatarUrl = response.data.data?.avatarUrl;
            if (nextAvatarUrl) {
                setUser((prev) => {
                    if (!prev) return prev;
                    const nextUser = { ...prev, avatarUrl: nextAvatarUrl };
                    localStorage.setItem('patient-user', JSON.stringify(nextUser));
                    return nextUser;
                });
            }
            setShowProfileEdit(false);
            setProfileAvatarFile(null);
            setProfileAvatarPreview('');
            setFeedback({ type: 'success', message: t('patientPortal.profileModal.updated') });
            fetchAll(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientPortal.profileModal.updateError') });
        }
    };

    const getStatusBadge = (status) => {
        const s = { awaiting_approval: 'bg-amber-100 text-amber-700', scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };
        return `px-3 py-1 rounded-full text-xs font-medium ${s[status] || s.scheduled}`;
    };

    const upcoming = appointments.filter((a) => !['completed', 'cancelled'].includes(a.status) && new Date(a.endTime || a.startTime) >= new Date());
    const past = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status) || new Date(a.endTime || a.startTime) < new Date());
    const medicalDocumentTypes = medicalDocumentTypeKeys.map((key) => t(`patientPortal.documents.types.${key}`));

    const tabs = [
        { id: 'appointments', label: t('patientPortal.tabs.appointments'), icon: '📅' },
        { id: 'documents', label: t('patientPortal.tabs.documents'), icon: '📄' },
        { id: 'history', label: t('patientPortal.tabs.history'), icon: '🕐' }
    ];

    if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><div className="spinner" /></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Professional Navbar */}
            <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {feedback.message && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${
                        feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-medical-500 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">{t('patientPortal.welcome')}</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                            {new Date().getHours() >= 18 || new Date().getHours() < 5 ? t('patient.goodEvening') : t('patient.goodMorning')}, {getDisplayName(user)}
                        </h1>
                        <p className="text-white/80 text-lg mb-6">{t('patientPortal.upcomingCount', { count: upcoming.length })}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/patient/book" className="inline-flex items-center gap-3 bg-white text-primary-600 px-8 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all transform hover:scale-105 shadow-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('patientPortal.bookAppointment')}
                            </Link>
                            <button 
                                onClick={() => setActiveTab('appointments')}
                                className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/30 transition-all border border-white/30"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('patientPortal.viewAppointments')}
                            </button>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                {/* Enhanced Tabs */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-lg border border-gray-100 dark:border-slate-700">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                data-tab={tab.id}
                                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center min-w-[120px] ${
                                    activeTab === tab.id 
                                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Appointments Tab ── */}
                {activeTab === 'appointments' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">📅</span>
                                </div>
                                {t('patientPortal.appointments.title')}
                            </h2>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('patientPortal.appointments.upcomingShort', { count: upcoming.length })}
                                </span>
                                <Link to="/patient/book" className="btn-primary">
                                    {t('patientPortal.appointments.new')}
                                </Link>
                            </div>
                        </div>
                        {upcoming.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 p-12 text-center shadow-lg">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">📅</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('patientPortal.appointments.emptyTitle')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                    {t('patientPortal.appointments.emptyDescription')}
                                </p>
                                <Link to="/patient/book" className="btn-primary inline-flex items-center gap-3 px-8 py-4">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    {t('patientPortal.appointments.first')}
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcoming.map(apt => (
                                    <AppointmentCard key={apt.id} apt={apt} onCancel={handleCancel}
                                        onAddNote={(id) => setShowNoteModal(id)}
                                        onUploadRequestedDoc={(appointment, docName) => handleOpenCreateDocument({
                                            appointmentId: appointment.id,
                                            name: docName,
                                            documentCode: docName,
                                            category: 'medical'
                                        })}
                                        getStatusBadge={getStatusBadge}
                                        language={language}
                                        t={t} />
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {/* ── Documents Tab ── */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('patientPortal.documents.title')}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('patientPortal.documents.subtitle')}</p>
                            </div>
                            <button onClick={() => handleOpenCreateDocument()} className="btn-primary text-sm">{t('patientPortal.documents.add')}</button>
                        </div>
                        {profile?.documents?.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-3">
                                {profile.documents.map(doc => (
                                    <DocumentCard
                                        key={doc.id}
                                        doc={doc}
                                        onEdit={handleOpenEditDocument}
                                        onDelete={handleDeleteDoc}
                                        language={language}
                                        t={t}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border p-8 text-center">
                                <span className="text-5xl mb-3 block">📂</span>
                                <p className="text-gray-500 mb-4">{t('patientPortal.documents.empty')}</p>
                                <button onClick={() => handleOpenCreateDocument()} className="btn-primary">{t('patientPortal.documents.addFirst')}</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── History Tab ── */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('patientPortal.history.title')}</h2>
                        {past.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border p-8 text-center">
                                <span className="text-5xl mb-3 block">🕐</span>
                                <p className="text-gray-500">{t('patientPortal.history.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {past.map(apt => (
                                    <AppointmentCard key={apt.id} apt={apt} isPast onAddNote={(id) => setShowNoteModal(id)} getStatusBadge={getStatusBadge} language={language} t={t} />
                                ))}
                            </div>
                        )}

                        {/* Appointment Notes */}
                        {profile?.appointmentNotes?.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('patientPortal.history.myNotes')}</h3>
                                <div className="space-y-3">
                                    {profile.appointmentNotes.map(n => (
                                        <div key={n.id} className="bg-white dark:bg-slate-800 rounded-xl border p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {n.appointment_type && t('patientPortal.history.appointmentWithDoctor', {
                                                        type: n.appointment_type,
                                                        firstName: n.dr_first,
                                                        lastName: n.dr_last
                                                    })}
                                                </p>
                                                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">{n.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Note Modal ── */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNoteModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('patientPortal.notes.addTitle')}</h3>
                        <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                            className="input-field" rows={4} placeholder={t('patientPortal.notes.placeholder')} />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowNoteModal(null)} className="flex-1 btn-secondary">{t('patientPortal.notes.cancel')}</button>
                            <button onClick={handleAddNote} className="flex-1 btn-primary">{t('patientPortal.notes.save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Document Modal ── */}
            {showDocModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetDocumentModal}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {editingDocument ? t('patientPortal.documents.editDocument') : t('patientPortal.documents.addDocument')}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.documentType')}</label>
                                <select
                                    value={medicalDocumentTypes.includes(docForm.name) ? docForm.name : 'Autre'}
                                    onChange={e => setDocForm({
                                        ...docForm,
                                        name: e.target.value === t('patientPortal.documents.types.other') ? '' : e.target.value,
                                        documentCode: e.target.value === t('patientPortal.documents.types.other') ? docForm.documentCode : e.target.value
                                    })}
                                    className="input-field"
                                >
                                    {medicalDocumentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                {!medicalDocumentTypes.includes(docForm.name) && (
                                    <input
                                        type="text"
                                        value={docForm.name}
                                        onChange={e => setDocForm({...docForm, name: e.target.value})}
                                        className="input-field mt-2"
                                    placeholder={t('patientPortal.documents.documentName')}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.requestedType')}</label>
                                <input
                                    type="text"
                                    value={docForm.documentCode}
                                    onChange={e => setDocForm({...docForm, documentCode: e.target.value})}
                                    className="input-field"
                                    placeholder={t('patientPortal.documents.requestedPlaceholder')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.detectedType')}</label>
                                    <div className="input-field flex items-center justify-between bg-gray-50 dark:bg-slate-900/40">
                                        <span>{getDocumentTypeLabel(docForm.fileType, t)}</span>
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${documentToneClasses[docForm.fileType] || documentToneClasses.document}`}>
                                            {docForm.fileType}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.category')}</label>
                                    <select value={docForm.category} onChange={e => setDocForm({...docForm, category: e.target.value})} className="input-field">
                                        <option value="general">{t('patientPortal.documents.categories.general')}</option>
                                        <option value="lab-test">{t('patientPortal.documents.categories.labTest')}</option>
                                        <option value="imaging">{t('patientPortal.documents.categories.imaging')}</option>
                                        <option value="prescription">{t('patientPortal.documents.categories.prescription')}</option>
                                        <option value="insurance">{t('patientPortal.documents.categories.insurance')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.linkedAppointment')}</label>
                                    <select value={docForm.appointmentId} onChange={e => setDocForm({...docForm, appointmentId: e.target.value, accessScope: e.target.value ? 'appointment' : docForm.accessScope})} className="input-field">
                                        <option value="">{t('patientPortal.documents.noAppointment')}</option>
                                        {appointments.filter((apt) => !['completed', 'cancelled'].includes(apt.status)).map((apt) => (
                                            <option key={apt.id} value={apt.id}>
                                                {apt.type} - {new Date(apt.startTime).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.confidentiality')}</label>
                                    <select value={docForm.accessScope} onChange={e => setDocForm({...docForm, accessScope: e.target.value})} className="input-field">
                                        <option value="private">{t('patientPortal.documents.access.private')}</option>
                                        <option value="appointment">{t('patientPortal.documents.access.appointment')}</option>
                                        <option value="shared">{t('patientPortal.documents.access.shared')}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.documents.notes')}</label>
                                <textarea value={docForm.notes} onChange={e => setDocForm({...docForm, notes: e.target.value})}
                                    className="input-field" rows={2} placeholder={t('patientPortal.documents.notesPlaceholder')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {editingDocument ? t('patientPortal.documents.replaceFile') : t('patientPortal.documents.file')}
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => handleDocumentFileChange(e.target.files?.[0] || null)}
                                    className="input-field"
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('patientPortal.documents.fileHelp')}</p>
                                {(selectedDocumentFile || editingDocument?.file_url) && (
                                    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {selectedDocumentFile ? t('patientPortal.documents.selectedFile', { name: selectedDocumentFile.name }) : t('patientPortal.documents.currentFile')}
                                        </p>
                                        {editingDocument?.file_url && !selectedDocumentFile && (
                                            <a
                                                href={editingDocument.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 inline-flex text-xs font-medium text-primary-500 hover:underline"
                                            >
                                                {t('patientPortal.documents.openCurrentFile')}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={resetDocumentModal} className="flex-1 btn-secondary">{t('patientPortal.documents.cancel')}</button>
                            <button onClick={handleSaveDoc} className="flex-1 btn-primary">
                                {editingDocument ? t('patientPortal.documents.save') : t('patientPortal.documents.submitAdd')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Profile Edit Modal ── */}
            {showProfileEdit && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProfileEdit(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('patientPortal.profileModal.title')}</h3>
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-medical-500 text-xl font-bold text-white">
                                        {(profileAvatarPreview || profileForm.avatarUrl) ? (
                                            <img
                                                src={getAssetUrl(profileAvatarPreview || profileForm.avatarUrl)}
                                                alt={t('patientPortal.profileModal.imageAlt')}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                {profileForm.firstName?.[0]}{profileForm.lastName?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.profileImage')}</label>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setProfileAvatarFile(file);
                                                setProfileAvatarPreview(file ? URL.createObjectURL(file) : '');
                                            }}
                                            className="input-field"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">{t('patientPortal.profileModal.imageHelp')}</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.imageUrl')}</label>
                                    <input
                                        type="url"
                                        value={profileForm.avatarUrl || ''}
                                        onChange={e => {
                                            setProfileAvatarFile(null);
                                            setProfileAvatarPreview('');
                                            setProfileForm({...profileForm, avatarUrl: e.target.value});
                                        }}
                                        className="input-field"
                                        placeholder={t('patientPortal.profileModal.imageUrlPlaceholder')}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.phone')}</label>
                                <input type="tel" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.address')}</label>
                                <input type="text" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.city')}</label>
                                <input type="text" value={profileForm.city || ''} onChange={e => setProfileForm({...profileForm, city: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.bloodType')}</label>
                                <select value={profileForm.bloodType || ''} onChange={e => setProfileForm({...profileForm, bloodType: e.target.value})} className="input-field">
                                    <option value="">{t('patientPortal.profileModal.select')}</option>
                                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.allergies')}</label>
                                <input type="text" value={profileForm.allergies || ''} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} className="input-field" placeholder={t('patientPortal.profileModal.allergiesPlaceholder')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.chronicConditions')}</label>
                                <input type="text" value={profileForm.chronicConditions || ''} onChange={e => setProfileForm({...profileForm, chronicConditions: e.target.value})} className="input-field" placeholder={t('patientPortal.profileModal.chronicPlaceholder')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientPortal.profileModal.currentMedications')}</label>
                                <input type="text" value={profileForm.currentMedications || ''} onChange={e => setProfileForm({...profileForm, currentMedications: e.target.value})} className="input-field" placeholder={t('patientPortal.profileModal.medicationsPlaceholder')} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowProfileEdit(false)} className="flex-1 btn-secondary">{t('patientPortal.profileModal.cancel')}</button>
                            <button onClick={handleUpdateProfile} className="flex-1 btn-primary">{t('patientPortal.profileModal.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Enhanced Sub-components ──
const AppointmentCard = ({ apt, onCancel, onAddNote, onUploadRequestedDoc, getStatusBadge, isPast, language = 'fr', t = (key) => key }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${isPast ? 'opacity-70' : ''} group`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md ${isPast ? 'bg-gray-50 dark:bg-slate-700' : 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/30'}`}>
                    <span className={`text-sm font-bold ${isPast ? 'text-gray-400' : 'text-primary-600 dark:text-primary-400'}`}>
                        {new Date(apt.startTime).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className={`text-2xl font-bold ${isPast ? 'text-gray-500' : 'text-primary-700 dark:text-primary-300'}`}>
                        {new Date(apt.startTime).getDate()}
                    </span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{apt.practitioner}</h3>
                        <span className={getStatusBadge(apt.status)}>{t(`patientPortal.status.${apt.status}`) || apt.status}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">{apt.type}</span> • {new Date(apt.startTime).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                            apt.consultationMode === 'online'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}>
                            {apt.consultationMode === 'online' ? (
                                <>
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    {t('patientPortal.appointmentCard.online')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {t('patientPortal.appointmentCard.inPerson')}
                                </>
                            )}
                        </span>
                        {apt.meeting?.status && apt.consultationMode === 'online' && (
                            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                                apt.meeting.status === 'ready'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
                                    : apt.meeting.status === 'cancelled'
                                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
                                        : apt.meeting.status === 'completed'
                                            ? 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}>
                                {apt.meeting.status === 'ready'
                                    ? t('patientPortal.appointmentCard.meetingReady')
                                    : apt.meeting.status === 'cancelled'
                                        ? t('patientPortal.appointmentCard.meetingCancelled')
                                        : apt.meeting.status === 'completed'
                                            ? t('patientPortal.appointmentCard.meetingCompleted')
                                            : apt.meeting.status === 'awaiting_approval'
                                                ? t('patientPortal.appointmentCard.meetingAwaitingApproval')
                                                : t('patientPortal.appointmentCard.meetingPreparing')}
                            </span>
                        )}
                    </div>
                    {apt.meeting?.joinUrl && apt.status !== 'cancelled' && (
                        <a
                            href={apt.meeting.joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-all transform hover:scale-105 shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {t('patientPortal.appointmentCard.joinConsultation')}
                        </a>
                    )}
                    {apt.consultationMode === 'online' && !apt.meeting?.joinUrl && apt.status !== 'cancelled' && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                {['scheduled', 'awaiting_approval'].includes(apt.status)
                                    ? t('patientPortal.appointmentCard.waitingDoctor')
                                    : apt.status === 'completed'
                                        ? t('patientPortal.appointmentCard.teleconsultationEnded')
                                        : t('patientPortal.appointmentCard.linkWillAppear')}
                            </p>
                        </div>
                    )}
                    {(apt.reasonDetail || apt.reasonCategory) && (
                        <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200">
                            <span className="font-semibold">{t('patientPortal.appointmentCard.reason')}:</span> {apt.reasonDetail || apt.reasonCategory}
                        </div>
                    )}
                    {apt.preparationNotes && (
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                            <span className="font-semibold">{t('patientPortal.appointmentCard.preparation')}:</span> {apt.preparationNotes}
                        </div>
                    )}
                    {apt.paymentStatus && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {apt.paymentStatus === 'paid'
                                ? t('patientPortal.appointmentCard.paid')
                                : apt.paymentStatus === 'deposit-paid'
                                    ? t('patientPortal.appointmentCard.depositPaid', { amount: apt.depositAmount })
                                    : apt.paymentStatus === 'refunded'
                                        ? t('patientPortal.appointmentCard.refunded')
                                        : t('patientPortal.appointmentCard.payOnsite')}
                            {apt.totalAmount > 0 && ` • €${apt.totalAmount}`}
                        </p>
                    )}
                    {Array.isArray(apt.requestedDocuments) && apt.requestedDocuments.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 p-3 dark:border-purple-900/40 dark:bg-purple-900/20">
                            <p className="text-xs font-bold text-purple-700 dark:text-purple-200">{t('patientPortal.appointmentCard.requestedDocuments')}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {apt.requestedDocuments.map((docName) => (
                                    <button
                                        key={docName}
                                        onClick={() => onUploadRequestedDoc?.(apt, docName)}
                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100 dark:bg-slate-800 dark:text-purple-200"
                                    >
                                        + {docName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 lg:ml-4">
                <button 
                    onClick={() => onAddNote(apt.id)} 
                    className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all group-hover:opacity-100 opacity-0 lg:opacity-100" 
                    title={t('patientPortal.appointmentCard.addNote')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                {!isPast && apt.status !== 'cancelled' && onCancel && (
                    <button 
                        onClick={() => onCancel(apt.id)} 
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group-hover:opacity-100 opacity-0 lg:opacity-100" 
                        title={t('patientPortal.appointmentCard.cancel')}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    </div>
);

const ProfileCard = ({ label, value }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{value || '—'}</p>
    </div>
);

const TagCard = ({ title, items, color, t = (key) => key }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-300">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-lg">{title.split(' ')[0]}</span>
            <span>{title.split(' ').slice(1).join(' ')}</span>
        </p>
        <div className="flex flex-wrap gap-2">
            {(items || []).length > 0 ? (
                items.map((item, i) => (
                    <span key={i} className={`text-xs px-3 py-1.5 rounded-full font-medium ${tagColorClasses[color] || tagColorClasses.slate} border ${color === 'red' ? 'border-red-200 dark:border-red-800' : color === 'orange' ? 'border-orange-200 dark:border-orange-800' : color === 'blue' ? 'border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-800'}`}>
                        {item}
                    </span>
                ))
            ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t('patientPortal.documents.none')}</span>
            )}
        </div>
    </div>
);

const detectDocumentKind = ({ file, doc, currentType } = {}) => {
    const mimeType = String(file?.type || doc?.mime_type || '').toLowerCase();
    const filename = String(file?.name || doc?.file_path || doc?.file_url || '').toLowerCase();

    if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(filename)) {
        return 'image';
    }

    if (mimeType === 'application/pdf' || /\.pdf$/.test(filename)) {
        return 'pdf';
    }

    return currentType || doc?.file_type || 'document';
};

const getDocumentTypeLabel = (type, t = (key) => key) => {
    const labels = {
        image: t('patientPortal.documents.kind.image'),
        pdf: t('patientPortal.documents.kind.pdf'),
        document: t('patientPortal.documents.kind.document')
    };

    return labels[type] || t('patientPortal.documents.kind.document');
};

const formatFileSize = (size) => {
    const numericSize = Number(size || 0);
    if (!numericSize) return '';
    if (numericSize < 1024) return `${numericSize} B`;
    if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`;
    return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentCard = ({ doc, onEdit, onDelete, language = 'fr', t = (key) => key }) => {
    const kind = detectDocumentKind({ doc });
    const isImage = kind === 'image' && doc.file_url;

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 group">
            <div className="flex items-start gap-4 p-5">
                {isImage ? (
                    <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-700 group-hover:scale-105 transition-transform"
                    >
                        <img src={doc.file_url} alt={doc.name} className="h-full w-full object-cover" />
                    </a>
                ) : (
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-3xl dark:from-primary-900/20 dark:to-primary-800/30 group-hover:scale-105 transition-transform">
                        {kind === 'pdf' ? '📄' : '📎'}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h4 className="truncate font-semibold text-gray-900 dark:text-white text-lg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {doc.name}
                            </h4>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {doc.category}
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(doc.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                                </span>
                                {doc.file_size && (
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        {formatFileSize(doc.file_size)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold border ${documentToneClasses[kind] || documentToneClasses.document}`}>
                            {kind.toUpperCase()}
                        </span>
                    </div>

                    {doc.notes && (
                        <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400 italic">{doc.notes}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium">
                        {doc.file_url ? (
                            <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 hover:underline transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {kind === 'image'
                                    ? t('patientPortal.documents.openImage')
                                    : kind === 'pdf'
                                        ? t('patientPortal.documents.openPdf')
                                        : t('patientPortal.documents.openFile')}
                            </a>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">{t('patientPortal.documents.noFileAttached')}</span>
                        )}
                        <button 
                            onClick={() => onEdit(doc)} 
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-500 hover:underline transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {t('patientPortal.documents.edit')}
                        </button>
                        <button 
                            onClick={() => onDelete(doc)} 
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-red-500 hover:underline transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {t('patientPortal.documents.delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const tagColorClasses = {
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    slate: 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'
};

const documentToneClasses = {
    image: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pdf: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    document: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800'
};

export default PatientPortal;
