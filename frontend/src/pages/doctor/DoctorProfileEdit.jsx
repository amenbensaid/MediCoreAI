import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { getDisplayName } from '../../utils/authRouting';
import Avatar from '../../components/ui/Avatar';

const DoctorProfileEdit = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialty: '',
        bio: '',
        consultationFee: '',
        acceptsOnline: false,
        paymentPolicy: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            const data = response.data.data;
            setProfile(data);
            setProfileForm({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                specialty: data.specialty || '',
                bio: data.bio || '',
                consultationFee: data.consultationFee || '',
                acceptsOnline: data.acceptsOnline || false,
                paymentPolicy: data.paymentPolicy || ''
            });
            setAvatarPreview(data.avatarUrl || '');
        } catch (error) {
            console.error('Error fetching profile:', error);
            setFeedback({ type: 'error', message: 'Erreur lors du chargement du profil' });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (file) => {
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setAvatarFile(null);
            setAvatarPreview('');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('firstName', profileForm.firstName);
            formData.append('lastName', profileForm.lastName);
            formData.append('email', profileForm.email);
            formData.append('phone', profileForm.phone);
            formData.append('specialty', profileForm.specialty);
            formData.append('bio', profileForm.bio);
            formData.append('consultationFee', profileForm.consultationFee);
            formData.append('acceptsOnline', profileForm.acceptsOnline);
            formData.append('paymentPolicy', profileForm.paymentPolicy);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const response = await api.put('/auth/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setProfile(response.data.data);
            updateUser({
                firstName: response.data.data.firstName,
                lastName: response.data.data.lastName,
                specialty: response.data.data.specialty,
                avatarUrl: response.data.data.avatarUrl
            });
            setFeedback({ type: 'success', message: 'Profil mis à jour avec succès !' });
            setAvatarPreview(response.data.data.avatarUrl || '');
            setAvatarFile(null);
        } catch (error) {
            console.error('Error updating profile:', error);
            setFeedback({ type: 'error', message: error.response?.data?.message || 'Erreur lors de la mise à jour' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4">
                        <Avatar
                            src={avatarPreview || profile?.avatarUrl || user?.avatarUrl}
                            firstName={profileForm.firstName}
                            lastName={profileForm.lastName}
                            name={getDisplayName(user)}
                            size="lg"
                            radius="2xl"
                            alt="Photo du profil médecin"
                            className="shadow-lg shadow-primary-500/20"
                        />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mon Profil Médecin</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Gérez vos informations professionnelles et votre photo
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

                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {/* Avatar Section */}
                    <div className="bg-gradient-to-r from-primary-500 to-medical-500 p-8 text-white">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
                                    <Avatar
                                        src={avatarPreview || profile?.avatarUrl}
                                        firstName={profileForm.firstName}
                                        lastName={profileForm.lastName}
                                        size="2xl"
                                        radius="2xl"
                                        alt="Photo du profil médecin"
                                        className="h-full w-full rounded-none bg-white/20 shadow-none ring-0"
                                    />
                                </div>
                                <label className="absolute bottom-2 right-2 w-10 h-10 bg-white text-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/90 transition-colors shadow-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 002 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {getDisplayName(user)}
                                </h2>
                                <p className="text-white/80">Médecin</p>
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
                                Informations personnelles
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Prénom
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.firstName}
                                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="Votre prénom"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nom
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.lastName}
                                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="Votre nom"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="votre@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="+33 6 12 34 56 78"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-14m14 0h14" />
                                </svg>
                                Informations professionnelles
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Spécialité
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.specialty}
                                        onChange={(e) => setProfileForm({ ...profileForm, specialty: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="Cardiologie, Médecine générale..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Biographie
                                    </label>
                                    <textarea
                                        value={profileForm.bio}
                                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        rows={4}
                                        placeholder="Parlez de votre expérience, de votre approche..."
                                    />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Honoraires de consultation (€)
                                        </label>
                                        <input
                                            type="number"
                                            value={profileForm.consultationFee}
                                            onChange={(e) => setProfileForm({ ...profileForm, consultationFee: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                            placeholder="50"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.acceptsOnline}
                                                onChange={(e) => setProfileForm({ ...profileForm, acceptsOnline: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500 peer-checked:after:translate-x-full"></div>
                                        </label>
                                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Accepte les consultations en ligne
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Politique de paiement
                                    </label>
                                    <textarea
                                        value={profileForm.paymentPolicy}
                                        onChange={(e) => setProfileForm({ ...profileForm, paymentPolicy: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        rows={3}
                                        placeholder="Conditions de paiement acceptées..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Enregistrer les modifications
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default DoctorProfileEdit;
