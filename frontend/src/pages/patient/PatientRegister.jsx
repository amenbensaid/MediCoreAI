import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import { useI18n } from '../../stores/languageStore';
import { useThemeStore } from '../../stores/themeStore';

const PatientRegister = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t, setLanguageScope } = useI18n();
    const { setThemeScope } = useThemeStore();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        password: '', confirmPassword: '', dateOfBirth: '', gender: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const redirectTo = searchParams.get('redirect') || '/patient/portal';

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.passwordsMismatch'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/public/patient/register', formData);
            const { token, user } = res.data.data;
            localStorage.setItem('patient-token', token);
            localStorage.setItem('patient-user', JSON.stringify(user));
            setLanguageScope(user);
            setThemeScope(user);
            navigate(redirectTo);
        } catch (err) {
            setError(err.response?.data?.message || t('auth.registrationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center shadow-glow">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">MediCore AI</p>
                        <p className="text-xs text-primary-300">{t('common.patientPortal')}</p>
                    </div>
                    <LanguageSwitch compact />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.createPatientAccount')}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('auth.patientRegisterSubtitle')}</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.firstName')}</label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                    className="input-field" placeholder={t('auth.placeholders.firstName')} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.lastName')}</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                    className="input-field" placeholder={t('auth.placeholders.lastName')} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email')}</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange}
                                className="input-field" placeholder="john@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.phone')}</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                className="input-field" placeholder="+1 234 567 890" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.dateOfBirth')}</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                                    className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.gender')}</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="input-field">
                                    <option value="">{t('auth.select')}</option>
                                    <option value="male">{t('auth.male')}</option>
                                    <option value="female">{t('auth.female')}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.password')}</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                                    onChange={handleChange} className="input-field pr-12" placeholder={t('auth.minPassword')} required minLength={8} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                                    {showPassword ? t('common.hide') : t('common.show')}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.confirmPassword')}</label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword}
                                onChange={handleChange} className="input-field" placeholder="••••••••" required />
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
                            {loading ? (<><div className="spinner" />{t('auth.creating')}</>) : t('auth.createAccount')}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {t('auth.alreadyAccount')}{' '}
                            <Link to={`/patient/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-primary-500 hover:text-primary-600 font-medium">{t('common.signIn')}</Link>
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {t('auth.areYouPractitioner')} <Link to="/login" className="text-primary-500 hover:text-primary-600">{t('common.staffLogin')}</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientRegister;
