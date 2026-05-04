import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import { useI18n } from '../../stores/languageStore';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        specialty: '',
        clinicName: '',
        clinicType: 'general',
        clinicOtherType: '',
        clinicPhone: '',
        clinicAddress: '',
        clinicCity: '',
        clinicWebsite: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { register, isLoading, error } = useAuthStore();
    const { t } = useI18n();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert(t('auth.passwordsMismatch'));
            return;
        }
        const result = await register(formData);
        if (result.success) setSubmitted(true);
    };

    const clinicTypes = [
        { value: 'general', label: t('auth.clinicTypes.general') },
        { value: 'dental', label: t('auth.clinicTypes.dental') },
        { value: 'aesthetic', label: t('auth.clinicTypes.aesthetic') },
        { value: 'veterinary', label: t('auth.clinicTypes.veterinary') },
        { value: 'other', label: t('auth.clinicTypes.other') }
    ];

    if (submitted) {
        return (
            <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-dark-800">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('auth.pendingApprovalTitle')}</h2>
                <p className="mt-3 text-gray-500 dark:text-gray-400">{t('auth.pendingApprovalMessage')}</p>
                <Link to="/login" className="btn-primary mt-6 inline-flex">{t('common.signIn')}</Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <span className="text-2xl font-bold text-white">MediCore AI</span>
                <LanguageSwitch compact />
            </div>

            <div className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur dark:border-dark-700 dark:bg-dark-800/95">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{t('auth.createAccount')}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('auth.trialSubtitle')}</p>
                </div>

                {error && (
                    <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <Section title={t('auth.sections.owner')} subtitle={t('auth.sections.ownerHint')}>
                        <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <FieldLabel label={t('auth.firstName')} required t={t} />
                            <input
                                type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                className="input-field" placeholder={t('auth.placeholders.firstName')} required
                            />
                        </div>
                        <div>
                            <FieldLabel label={t('auth.lastName')} required t={t} />
                            <input
                                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                className="input-field" placeholder={t('auth.placeholders.lastName')} required
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel label={t('auth.email')} required t={t} />
                        <input
                            type="email" name="email" value={formData.email} onChange={handleChange}
                            className="input-field" placeholder="you@example.com" required
                        />
                    </div>

                    <div>
                        <FieldLabel label={t('auth.specialty')} optional t={t} />
                        <input
                            type="text" name="specialty" value={formData.specialty} onChange={handleChange}
                            className="input-field" placeholder={t('auth.placeholders.specialty')}
                        />
                    </div>
                    </Section>

                    <Section title={t('auth.sections.clinic')} subtitle={t('auth.sections.clinicHint')}>
                    <div>
                        <FieldLabel label={t('auth.clinicName')} required t={t} />
                        <input
                            type="text" name="clinicName" value={formData.clinicName} onChange={handleChange}
                            className="input-field" placeholder={t('auth.placeholders.clinicName')} required
                        />
                    </div>

                    <div>
                        <FieldLabel label={t('auth.clinicType')} required t={t} />
                        <select name="clinicType" value={formData.clinicType} onChange={handleChange} className="input-field">
                            {clinicTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {formData.clinicType === 'other' && (
                        <div>
                            <FieldLabel label={t('auth.clinicOtherType')} required t={t} />
                            <input type="text" name="clinicOtherType" value={formData.clinicOtherType} onChange={handleChange} className="input-field" placeholder={t('auth.placeholders.clinicOtherType')} required={formData.clinicType === 'other'} />
                        </div>
                    )}

                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{t('auth.optionalClinicInfo')}</p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-dark-700">{t('auth.optional')}</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <FieldLabel label={t('auth.clinicPhone')} optional t={t} />
                            <input type="text" name="clinicPhone" value={formData.clinicPhone} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <FieldLabel label={t('auth.clinicCity')} optional t={t} />
                            <input type="text" name="clinicCity" value={formData.clinicCity} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="sm:col-span-2">
                            <FieldLabel label={t('auth.clinicAddress')} optional t={t} />
                            <input type="text" name="clinicAddress" value={formData.clinicAddress} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="sm:col-span-2">
                            <FieldLabel label={t('auth.clinicWebsite')} optional t={t} />
                            <input type="text" name="clinicWebsite" value={formData.clinicWebsite} onChange={handleChange} className="input-field" placeholder="https://..." />
                        </div>
                        </div>
                    </div>
                    </Section>

                    <Section title={t('auth.sections.security')} subtitle={t('auth.sections.securityHint')}>
                    <div>
                        <FieldLabel label={t('auth.password')} required t={t} />
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'} name="password"
                                value={formData.password} onChange={handleChange}
                                className="input-field pr-12" placeholder="••••••••" required minLength={8}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div>
                        <FieldLabel label={t('auth.confirmPassword')} required t={t} />
                        <input
                            type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                            className="input-field" placeholder="••••••••" required
                        />
                    </div>
                    </Section>

                    <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-slate-100 bg-white/95 p-6 backdrop-blur dark:border-dark-700 dark:bg-dark-800/95">
                    <button type="submit" disabled={isLoading} className="w-full btn-primary flex items-center justify-center gap-2">
                        {isLoading ? (<><div className="spinner" />{t('auth.creating')}</>) : t('auth.createAccount')}
                    </button>
                    </div>
                </form>

                <div className="px-6 pb-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('auth.alreadyAccount')}{' '}
                        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">{t('common.signIn')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

const Section = ({ title, subtitle, children }) => (
    <section className="rounded-3xl border border-slate-100 p-4 dark:border-dark-700">
        <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

const FieldLabel = ({ label, required, optional, t }) => (
    <label className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <span>{label}</span>
        {(required || optional) && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${required ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300'}`}>
                {required ? t('auth.required') : t('auth.optional')}
            </span>
        )}
    </label>
);

export default Register;
