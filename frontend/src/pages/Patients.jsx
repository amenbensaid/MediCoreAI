import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const Patients = () => {
    const { t } = useI18n();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });

    const fetchPatients = async (page = 1) => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/patients', {
                params: { search, page, limit: 12, isActive: statusFilter }
            });
            setPatients(response.data.data.patients);
            setPagination(response.data.data.pagination);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError(t('staffPatients.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPatients(1); }, [search, statusFilter]);

    const stats = useMemo(() => ({
        total: pagination.totalCount,
        active: patients.filter(p => p.isActive).length,
        inactive: patients.filter(p => !p.isActive).length
    }), [patients, pagination]);

    const filteredPatients = useMemo(() => {
        if (!search) return patients;
        const s = search.toLowerCase();
        return patients.filter(p => 
            p.fullName?.toLowerCase().includes(s) ||
            p.email?.toLowerCase().includes(s) ||
            p.phone?.includes(s)
        );
    }, [patients, search]);

    const getAge = (dob) => {
        if (!dob) return null;
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('staffPatients.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('staffPatients.subtitle')}</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('staffPatients.newPatient')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('staffPatients.totalPatients')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pagination.totalCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('staffPatients.activePatients')}</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('staffPatients.inactivePatients')}</p>
                            <p className="text-2xl font-bold text-gray-500 dark:text-gray-300 mt-1">{stats.inactive}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder={t('staffPatients.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-5 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
                    >
                        <option value="all">{t('staffPatients.allStatuses')}</option>
                        <option value="true">{t('staffPatients.activeStatus')}</option>
                        <option value="false">{t('staffPatients.inactiveStatus')}</option>
                    </select>
                </div>
            </div>

            {/* Patient Cards Grid */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                {error ? (
                    <div className="px-6 py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-red-500 dark:text-red-400">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="spinner" />
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('staffPatients.emptyTitle')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {search ? t('staffPatients.emptyWithSearch') : t('staffPatients.emptyWithoutSearch')}
                        </p>
                        {!search && (
                            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('staffPatients.addPatient')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredPatients.map((patient) => (
                            <div key={patient.id} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-500/40">
                                <div className="h-1 bg-gradient-to-r from-primary-500 via-violet-500 to-medical-500 opacity-0 transition-opacity group-hover:opacity-100" />
                                <div className="flex items-start gap-4 p-5">
                                    <Avatar
                                        src={patient.avatarUrl}
                                        firstName={patient.firstName}
                                        lastName={patient.lastName}
                                        name={patient.fullName}
                                        size="xl"
                                        radius="2xl"
                                        alt={t('staffPatients.photoAlt', { name: patient.fullName })}
                                        className="shadow-md shadow-primary-500/15"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/patients/${patient.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors block truncate">
                                            {patient.fullName}
                                        </Link>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{patient.patientNumber}</p>
                                        {patient.email && (
                                            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{patient.email}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-sm">
                                            {patient.phone && (
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    {patient.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-dark-700">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${patient.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400'}`}>
                                            {patient.isActive ? t('staffPatients.active') : t('staffPatients.inactive')}
                                        </span>
                                        {patient.dateOfBirth && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {t('staffPatients.age', { count: getAge(patient.dateOfBirth) })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link to={`/patients/${patient.id}`} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-dark-700 rounded-lg transition-all" title={t('staffPatients.view')}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </Link>
                                        <Link to={`/appointments?patientId=${patient.id}`} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-dark-700 rounded-lg transition-all" title={t('staffPatients.appointmentShort')}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('staffPatients.pagination', { current: pagination.currentPage, total: pagination.totalPages, count: pagination.totalCount })}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchPatients(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {t('staffPatients.previous')}
                        </button>
                        <button
                            onClick={() => fetchPatients(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {t('staffPatients.next')}
                        </button>
                    </div>
                </div>
            )}

            {/* Add Patient Modal */}
            {showModal && <AddPatientModal onClose={() => setShowModal(false)} onSuccess={() => fetchPatients(1)} t={t} />}
        </div>
    );
};

// Add Patient Modal
const AddPatientModal = ({ onClose, onSuccess, t }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', avatarUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!formData.firstName.trim()) errs.firstName = t('staffPatients.modal.firstNameRequired');
        if (!formData.lastName.trim()) errs.lastName = t('staffPatients.modal.lastNameRequired');
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errs.email = t('staffPatients.modal.invalidEmail');
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            await api.post('/patients', formData);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating patient:', err);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) => `w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border ${errors[field] ? 'border-red-500' : 'border-gray-200 dark:border-dark-600'} rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dark-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('staffPatients.modal.title')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('staffPatients.modal.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.firstName')}</label>
                            <input type="text" value={formData.firstName} onChange={e => { setFormData({ ...formData, firstName: e.target.value }); setErrors({...errors, firstName: ''}); }}
                                className={inputClass('firstName')} placeholder={t('staffPatients.modal.firstNamePlaceholder')} />
                            {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.lastName')}</label>
                            <input type="text" value={formData.lastName} onChange={e => { setFormData({ ...formData, lastName: e.target.value }); setErrors({...errors, lastName: ''}); }}
                                className={inputClass('lastName')} placeholder={t('staffPatients.modal.lastNamePlaceholder')} />
                            {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.email')}</label>
                        <div className="relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={`${inputClass('email')} pl-12`} placeholder={t('staffPatients.modal.emailPlaceholder')} />
                        </div>
                        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.phone')}</label>
                        <div className="relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className={`${inputClass('phone')} pl-12`} placeholder="+33 6 00 00 00 00" />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/40">
                        <div className="flex items-center gap-4">
                            <Avatar
                                src={formData.avatarUrl}
                                firstName={formData.firstName}
                                lastName={formData.lastName}
                                name={`${formData.firstName} ${formData.lastName}`}
                                size="lg"
                                radius="2xl"
                                alt={t('staffPatients.photoAlt', { name: `${formData.firstName} ${formData.lastName}`.trim() || t('staffPatients.modal.title') })}
                            />
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.avatarUrl')}</label>
                                <input
                                    type="text"
                                    value={formData.avatarUrl}
                                    onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                                    className={inputClass('avatarUrl')}
                                    placeholder={t('staffPatients.avatarUrlPlaceholder')}
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('staffPatients.avatarHelp')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.birthDate')}</label>
                            <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className={inputClass('dateOfBirth')} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('staffPatients.modal.gender')}</label>
                            <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inputClass('gender')}>
                                <option value="">{t('staffPatients.modal.select')}</option>
                                <option value="male">{t('staffPatients.modal.male')}</option>
                                <option value="female">{t('staffPatients.modal.female')}</option>
                                <option value="other">{t('staffPatients.modal.other')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-xl border border-gray-200 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all font-medium">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-all font-medium disabled:opacity-50">
                            {loading ? t('staffPatients.modal.creating') : t('staffPatients.modal.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Patients;
