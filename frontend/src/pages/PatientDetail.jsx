import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language, t } = useI18n();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const fetchPatient = async () => {
        try {
            const response = await api.get(`/patients/${id}`);
            setPatient(response.data.data);
        } catch (error) {
            console.error('Error fetching patient:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('staffPatients.detail.deleteConfirm'))) return;
        try {
            await api.delete(`/patients/${id}`);
            navigate('/patients');
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert(t('staffPatients.detail.deleteError'));
        }
    };

    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const translateStatus = (status) => t(`staffPatients.detail.statuses.${status}`) || status;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
    }

    if (!patient) {
        return <div className="text-center py-16 text-gray-500">{t('staffPatients.detail.notFound')}</div>;
    }

    const tabs = [
        { id: 'overview', name: t('staffPatients.detail.tabs.overview'), icon: '📋' },
        { id: 'appointments', name: t('staffPatients.detail.tabs.appointments'), icon: '📅' },
        { id: 'records', name: t('staffPatients.detail.tabs.records'), icon: '🏥' },
        { id: 'invoices', name: t('staffPatients.detail.tabs.invoices'), icon: '💳' },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                <Link to="/patients" className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{patient.fullName}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{patient.patientNumber}</p>
                </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEditModal(true)} className="btn-secondary">{t('staffPatients.detail.edit')}</button>
                    <Link to={`/appointments?patientId=${patient.id}`} className="btn-primary">{t('staffPatients.detail.newAppointment')}</Link>
                    <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('staffPatients.detail.deleteTitle')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Patient Card */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="h-2 bg-gradient-to-r from-primary-500 via-violet-500 to-medical-500" />
                <div className="grid gap-6 p-6 lg:grid-cols-[180px_1fr]">
                    <div className="flex flex-col items-center rounded-3xl bg-slate-50 p-4 dark:bg-dark-900/40">
                        <Avatar
                            src={patient.avatarUrl}
                            firstName={patient.firstName}
                            lastName={patient.lastName}
                            name={patient.fullName}
                            size="2xl"
                            radius="2xl"
                            alt={t('staffPatients.photoAlt', { name: patient.fullName })}
                            className="shadow-xl shadow-primary-500/20"
                        />
                        <p className="mt-3 text-center text-sm font-bold text-slate-900 dark:text-white">{patient.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{patient.patientNumber}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <InfoItem label={t('staffPatients.detail.info.email')} value={patient.email || '-'} />
                        <InfoItem label={t('staffPatients.detail.info.phone')} value={patient.phone || '-'} />
                        <InfoItem label={t('staffPatients.detail.info.birthDate')} value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString(locale) : '-'} />
                        <InfoItem label={t('staffPatients.detail.info.address')} value={patient.address || '-'} />
                        <InfoItem label={t('staffPatients.detail.info.city')} value={patient.city || '-'} />
                        <InfoItem label={t('staffPatients.detail.info.bloodType')} value={patient.bloodType || '-'} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}
                    >
                        {tab.icon} {tab.name}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('staffPatients.detail.allergies')}</h3>
                            {patient.allergies?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {patient.allergies.map((allergy, i) => (
                                        <span key={i} className="badge badge-danger">{allergy}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">{t('staffPatients.detail.noAllergies')}</p>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('staffPatients.detail.chronicConditions')}</h3>
                            {patient.chronicConditions?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {patient.chronicConditions.map((condition, i) => (
                                        <span key={i} className="badge badge-warning">{condition}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">{t('staffPatients.detail.noChronicConditions')}</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('staffPatients.detail.notes')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{patient.notes || t('staffPatients.detail.noNotes')}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('staffPatients.detail.appointmentHistory')}</h3>
                        {patient.recentAppointments?.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                {patient.recentAppointments.map(apt => (
                                    <div key={apt.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{apt.type}</p>
                                            <p className="text-sm text-gray-500">{apt.practitioner}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-900 dark:text-white">{new Date(apt.startTime).toLocaleDateString(locale)}</p>
                                            <span className={`badge ${apt.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{translateStatus(apt.status)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('staffPatients.detail.noAppointments')}</p>
                        )}
                    </div>
                )}

                {activeTab === 'records' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('staffPatients.detail.medicalRecords')}</h3>
                        {patient.recentRecords?.length > 0 ? (
                            <div className="space-y-4">
                                {patient.recentRecords.map(record => (
                                    <div key={record.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                        <div className="flex justify-between mb-2">
                                            <span className="badge badge-info">{record.type}</span>
                                            <span className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString(locale)}</span>
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-white">{record.complaint}</p>
                                        {record.diagnosis && <p className="text-gray-600 dark:text-gray-400 mt-1">{t('staffPatients.detail.diagnosis')}: {record.diagnosis}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('staffPatients.detail.noMedicalRecords')}</p>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{t('staffPatients.detail.pendingInvoices')}</h3>
                        {patient.pendingInvoices?.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                {patient.pendingInvoices.map(inv => (
                                    <div key={inv.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{inv.number}</p>
                                            <p className="text-sm text-gray-500">{new Date(inv.date).toLocaleDateString(locale)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900 dark:text-white">{inv.balance.toFixed(2)} €</p>
                                            <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{translateStatus(inv.status)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('staffPatients.detail.noPendingInvoices')}</p>
                        )}
                    </div>
                )}
            </div>

            {showEditModal && (
                <EditPatientModal
                    patient={patient}
                    t={t}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        setShowEditModal(false);
                        fetchPatient();
                    }}
                />
            )}
        </div>
    );
};

const InfoItem = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-dark-900/40">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 break-words font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
);

const EditPatientModal = ({ patient, t, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        phone: patient.phone || '',
        dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '',
        gender: patient.gender || '',
        avatarUrl: patient.avatarUrl || '',
        address: patient.address || '',
        city: patient.city || '',
        bloodType: patient.bloodType || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.put(`/patients/${patient.id}`, formData);
            onSuccess();
        } catch (err) {
            console.error('Error updating patient:', err);
            setError(err.response?.data?.message || t('staffPatients.detail.updateError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay items-start overflow-y-auto py-6" onClick={onClose}>
            <div className="modal-content max-w-3xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-primary-700 to-medical-600 px-6 py-5 text-white">
                    <div>
                        <h2 className="text-xl font-extrabold">{t('staffPatients.detail.editTitle')}</h2>
                        <p className="mt-1 text-sm text-white/75">{t('staffPatients.detail.editSubtitle')}</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-dark-900/40 sm:flex-row sm:items-center">
                        <Avatar
                            src={formData.avatarUrl}
                            firstName={formData.firstName}
                            lastName={formData.lastName}
                            name={`${formData.firstName} ${formData.lastName}`}
                            size="xl"
                            radius="2xl"
                            alt={t('staffPatients.photoAlt', { name: `${formData.firstName} ${formData.lastName}`.trim() })}
                        />
                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('staffPatients.avatarUrl')}</label>
                            <input
                                value={formData.avatarUrl}
                                onChange={(event) => setFormData({ ...formData, avatarUrl: event.target.value })}
                                className="input-field"
                                placeholder={t('staffPatients.avatarUrlPlaceholder')}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('staffPatients.avatarHelp')}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <EditField label={t('staffPatients.modal.firstName')}>
                            <input value={formData.firstName} onChange={(event) => setFormData({ ...formData, firstName: event.target.value })} className="input-field" required />
                        </EditField>
                        <EditField label={t('staffPatients.modal.lastName')}>
                            <input value={formData.lastName} onChange={(event) => setFormData({ ...formData, lastName: event.target.value })} className="input-field" required />
                        </EditField>
                        <EditField label={t('staffPatients.modal.email')}>
                            <input type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="input-field" />
                        </EditField>
                        <EditField label={t('staffPatients.modal.phone')}>
                            <input value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="input-field" />
                        </EditField>
                        <EditField label={t('staffPatients.modal.birthDate')}>
                            <input type="date" value={formData.dateOfBirth} onChange={(event) => setFormData({ ...formData, dateOfBirth: event.target.value })} className="input-field" />
                        </EditField>
                        <EditField label={t('staffPatients.modal.gender')}>
                            <select value={formData.gender} onChange={(event) => setFormData({ ...formData, gender: event.target.value })} className="input-field">
                                <option value="">{t('staffPatients.modal.select')}</option>
                                <option value="male">{t('staffPatients.modal.male')}</option>
                                <option value="female">{t('staffPatients.modal.female')}</option>
                                <option value="other">{t('staffPatients.modal.other')}</option>
                            </select>
                        </EditField>
                        <EditField label={t('staffPatients.detail.info.address')}>
                            <input value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} className="input-field" />
                        </EditField>
                        <EditField label={t('staffPatients.detail.info.city')}>
                            <input value={formData.city} onChange={(event) => setFormData({ ...formData, city: event.target.value })} className="input-field" />
                        </EditField>
                        <EditField label={t('staffPatients.detail.info.bloodType')}>
                            <input value={formData.bloodType} onChange={(event) => setFormData({ ...formData, bloodType: event.target.value })} className="input-field" />
                        </EditField>
                    </div>

                    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-60">
                            {loading ? t('staffPatients.detail.saving') : t('staffPatients.detail.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditField = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {children}
    </label>
);

export default PatientDetail;
