import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PatientNavbar from '../../components/patient/PatientNavbar';
import {
    PATIENT_LOGIN_PATH,
    clearPatientSession,
    getDisplayName,
    isPatientSessionActive
} from '../../utils/authRouting';
import { getAssetUrl } from '../../utils/assets';
import { useI18n } from '../../stores/languageStore';

const EditProfile = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileForm, setProfileForm] = useState({});
    const [profileAvatarFile, setProfileAvatarFile] = useState(null);
    const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData || !isPatientSessionActive()) { 
            navigate(PATIENT_LOGIN_PATH); 
            return; 
        }
        setUser(JSON.parse(userData));
        fetchProfile(token);
    }, []);

    const fetchProfile = async (token) => {
        try {
            const profileRes = await api.get('/public/my-profile', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(profileRes.data.data);
            setProfileForm({
                ...profileRes.data.data,
                allergies: (profileRes.data.data.allergies || []).join(', '),
                chronicConditions: (profileRes.data.data.chronicConditions || []).join(', '),
                currentMedications: (profileRes.data.data.currentMedications || []).join(', ')
            });
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            setFeedback({ type: 'error', message: t('patientProfile.loadError') });
        } finally {
            setLoading(false);
        }
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

    const handleUpdateProfile = async () => {
        setSaving(true);
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
                const storedUser = JSON.parse(localStorage.getItem('patient-user') || '{}');
                localStorage.setItem('patient-user', JSON.stringify({ ...storedUser, avatarUrl: nextAvatarUrl }));
            }
            setProfileAvatarFile(null);
            setProfileAvatarPreview('');
            setFeedback({ type: 'success', message: t('patientProfile.updated') });
            
            // Refresh profile data
            fetchProfile(token);
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || t('patientProfile.updateError') });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarFileChange = (file) => {
        setProfileAvatarFile(file);
        setProfileAvatarPreview(file ? URL.createObjectURL(file) : '');
    };

    const handleLogout = () => {
        clearPatientSession();
        navigate(PATIENT_LOGIN_PATH, { replace: true });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <PatientNavbar user={user} profile={profile} onLogout={handleLogout} />
            
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <Link 
                            to="/patient/portal" 
                            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('patientProfile.backToDashboard')}
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-medical-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            👤
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('patientProfile.title')}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {t('patientProfile.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                {feedback.message && (
                    <div className={`rounded-xl border px-4 py-3 text-sm mb-6 ${
                        feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                {/* Profile Form */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {/* Avatar Section */}
                    <div className="bg-gradient-to-r from-primary-500 to-medical-500 p-8 text-white">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
                                    {(profileAvatarPreview || profileForm.avatarUrl) ? (
                                        <img
                                            src={getAssetUrl(profileAvatarPreview || profileForm.avatarUrl)}
                                            alt={t('patientProfile.avatarAlt')}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                                            {profileForm.firstName?.[0]}{profileForm.lastName?.[0]}
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-2 right-2 w-10 h-10 bg-white text-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/90 transition-colors shadow-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => handleAvatarFileChange(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {getDisplayName(user)}
                                </h2>
                                <p className="text-white/80">{t('patient.badge')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 space-y-8">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t('patientProfile.personalInfo')}
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.firstName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.firstName || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder={t('patientProfile.firstNamePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.lastName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.lastName || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder={t('patientProfile.lastNamePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={profileForm.email || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="votre@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.phone')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="+33 6 12 34 56 78"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.birthDate')}
                                    </label>
                                    <input
                                        type="date"
                                        value={profileForm.dateOfBirth || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.gender')}
                                    </label>
                                    <select
                                        value={profileForm.gender || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    >
                                        <option value="">{t('patientProfile.select')}</option>
                                        <option value="male">{t('patientProfile.male')}</option>
                                        <option value="female">{t('patientProfile.female')}</option>
                                        <option value="other">{t('patientProfile.other')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.bloodType')}
                                    </label>
                                    <select
                                        value={profileForm.bloodType || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    >
                                        <option value="">{t('patientProfile.select')}</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('patientProfile.addressSection')}
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.address')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.address || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder={t('patientProfile.addressPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.city')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.city || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder={t('patientProfile.cityPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.postalCode')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.postalCode || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="75001"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Medical Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {t('patientProfile.medicalInfo')}
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.allergies')}
                                    </label>
                                    <textarea
                                        value={profileForm.allergies || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        rows={3}
                                        placeholder={t('patientProfile.allergiesPlaceholder')}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('patientProfile.allergiesHelp')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.chronicConditions')}
                                    </label>
                                    <textarea
                                        value={profileForm.chronicConditions || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        rows={3}
                                        placeholder={t('patientProfile.chronicPlaceholder')}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('patientProfile.chronicHelp')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('patientProfile.currentMedications')}
                                    </label>
                                    <textarea
                                        value={profileForm.currentMedications || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, currentMedications: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        rows={3}
                                        placeholder={t('patientProfile.medicationsPlaceholder')}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('patientProfile.medicationsHelp')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Avatar URL */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('patientProfile.profilePhoto')}
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('patientProfile.imageUrl')}
                                </label>
                                <input
                                    type="url"
                                    value={profileForm.avatarUrl || ''}
                                    onChange={(e) => {
                                        setProfileAvatarFile(null);
                                        setProfileAvatarPreview('');
                                        setProfileForm({ ...profileForm, avatarUrl: e.target.value });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    placeholder="https://example.com/profile.jpg"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('patientProfile.imageHelp')}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
                            <Link
                                to="/patient/portal"
                                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all"
                            >
                                {t('common.cancel')}
                            </Link>
                            <button
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {t('patientProfile.saveChanges')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditProfile;
