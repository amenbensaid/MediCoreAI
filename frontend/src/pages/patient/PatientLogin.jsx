import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import { useI18n } from '../../stores/languageStore';
import { useThemeStore } from '../../stores/themeStore';
import { getLocalizedAuthError } from '../../utils/authErrors';

const PatientLogin = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t, setLanguageScope } = useI18n();
    const { setThemeScope } = useThemeStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const redirectTo = searchParams.get('redirect') || '/patient/portal';
    const passwordVisibilityLabel = showPassword ? t('common.hide') : t('common.show');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/public/patient/login', { email, password });
            const { token, user } = res.data.data;
            localStorage.setItem('patient-token', token);
            localStorage.setItem('patient-user', JSON.stringify(user));
            setLanguageScope(user);
            setThemeScope(user);
            navigate(redirectTo);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-4 flex justify-center gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('common.backHome')}
                    </Link>
                    <LanguageSwitch compact />
                </div>

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
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.patientSignIn')}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('auth.patientSignInSubtitle')}</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            {getLocalizedAuthError(error, t)}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email')}</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="input-field" placeholder={t('auth.patientEmailPlaceholder')} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.password')}</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-12" placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    aria-label={passwordVisibilityLabel}
                                    title={passwordVisibilityLabel}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                                    {passwordVisibilityLabel}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2">
                            {loading ? (<><div className="spinner" />{t('auth.signingIn')}</>) : t('common.signIn')}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {t('auth.noAccount')}{' '}
                            <Link to={`/patient/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-primary-500 hover:text-primary-600 font-medium">{t('auth.signUp')}</Link>
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {t('auth.areYouPractitioner')} <Link to="/login" className="text-primary-500 hover:text-primary-600">{t('common.staffLogin')}</Link>
                        </p>
                        <p>
                            <Link to="/" className="text-xs font-medium text-slate-500 transition hover:text-primary-600">
                                {t('auth.homeLink')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientLogin;
