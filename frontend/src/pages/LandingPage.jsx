import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import PublicNavbar from '../components/PublicNavbar';
import Container from '../components/ui/Container';
import SectionTitle from '../components/ui/SectionTitle';
import { useI18n } from '../stores/languageStore';
import { STAFF_LOGIN_PATH, getPublicDashboardTarget } from '../utils/authRouting';

const trustedBrands = ['Clinics Group', 'DentalPro', 'Vet Alliance', 'Aesthetic Care', 'MediHub', 'CareFlow'];

const LandingPage = () => {
    const { user, isAuthenticated, isAuthReady } = useAuthStore();
    const { t } = useI18n();
    const dashboardTarget = getPublicDashboardTarget({ user, isAuthenticated, isAuthReady });
    const plans = useMemo(() => [
        {
            id: 'starter',
            name: t('landing.offers.plans.starter.name'),
            price: '99€',
            period: t('landing.offers.plans.starter.period'),
            description: t('landing.offers.plans.starter.description'),
            features: t('landing.offers.plans.starter.features')
        },
        {
            id: 'professional',
            name: t('landing.offers.plans.professional.name'),
            price: '249€',
            period: t('landing.offers.plans.professional.period'),
            description: t('landing.offers.plans.professional.description'),
            features: t('landing.offers.plans.professional.features'),
            featured: true
        },
        {
            id: 'enterprise',
            name: t('landing.offers.plans.enterprise.name'),
            price: t('landing.offers.plans.enterprise.price'),
            period: t('landing.offers.plans.enterprise.period'),
            description: t('landing.offers.plans.enterprise.description'),
            features: t('landing.offers.plans.enterprise.features')
        }
    ], [t]);
    const capabilities = useMemo(() => [
        {
            title: t('landing.capabilities.schedule.title'),
            description: t('landing.capabilities.schedule.description')
        },
        {
            title: t('landing.capabilities.crm.title'),
            description: t('landing.capabilities.crm.description')
        },
        {
            title: t('landing.capabilities.billing.title'),
            description: t('landing.capabilities.billing.description')
        }
    ], [t]);
    const clinicTypeOptions = useMemo(() => [
        { value: '', label: t('landing.form.clinicTypes.select') },
        { value: 'general', label: t('landing.form.clinicTypes.general') },
        { value: 'dental', label: t('landing.form.clinicTypes.dental') },
        { value: 'aesthetic', label: t('landing.form.clinicTypes.aesthetic') },
        { value: 'veterinary', label: t('landing.form.clinicTypes.veterinary') }
    ], [t]);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        clinicType: '',
        desiredPlan: 'professional',
        teamSize: '',
        preferredDemoDate: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitState, setSubmitState] = useState({ type: '', message: '' });

    const activePlan = useMemo(
        () => plans.find((plan) => plan.id === formData.desiredPlan) || plans[1],
        [formData.desiredPlan, plans]
    );

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const choosePlan = (planId) => {
        setFormData((prev) => ({ ...prev, desiredPlan: planId }));
        document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitState({ type: '', message: '' });
        setIsSubmitting(true);

        try {
            await api.post('/demo-requests', formData);
            setSubmitState({
                type: 'success',
                message: t('landing.demo.success')
            });
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                companyName: '',
                clinicType: '',
                desiredPlan: activePlan.id,
                teamSize: '',
                preferredDemoDate: '',
                message: ''
            });
        } catch (error) {
            setSubmitState({
                type: 'error',
                message: error.response?.data?.message || t('landing.demo.error')
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <PublicNavbar />

            <main>
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.12),_transparent_32%)]" />
                    <Container className="relative grid gap-12 py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
                        <div className="flex flex-col justify-center">
                            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                                {t('landing.heroBadge')}
                            </div>

                            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.02] text-slate-950 md:text-6xl">
                                {t('landing.heroTitle')}
                                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                    {t('landing.heroHighlight')}
                                </span>
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                                {t('landing.heroDescription')}
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <a
                                    href="#demo"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-base font-bold text-white transition hover:bg-slate-800"
                                >
                                    {t('landing.reserveDemo')}
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                                <Link
                                    to="/doctors"
                                    className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                                >
                                    {t('landing.findPractitioner')}
                                </Link>
                                <Link
                                    to={dashboardTarget || STAFF_LOGIN_PATH}
                                    className="rounded-2xl border border-slate-200 px-7 py-4 text-base font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
                                >
                                    {dashboardTarget ? t('landing.accessDashboard') : t('common.staffLogin')}
                                </Link>
                            </div>

                            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                                <MetricCard value="99.9%" label={t('landing.metrics.uptime')} />
                                <MetricCard value="+2M" label={t('landing.metrics.patientsManaged')} />
                                <MetricCard value="24h" label={t('landing.metrics.launchTime')} />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
                                <img
                                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200"
                                    alt={t('landing.medicalTeamAlt')}
                                    className="h-72 w-full object-cover sm:h-80"
                                />
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y border-slate-200 bg-white">
                    <Container className="flex flex-wrap items-center justify-center gap-3 py-6">
                        {trustedBrands.map((brand) => (
                            <span
                                key={brand}
                                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500"
                            >
                                {brand}
                            </span>
                        ))}
                    </Container>
                </section>

                <section className="py-16">
                    <Container>
                    <div className="grid gap-6 md:grid-cols-3">
                        {capabilities.map((item) => (
                            <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="mt-5 text-2xl font-bold text-slate-900">{item.title}</h2>
                                <p className="mt-3 leading-7 text-slate-600">{item.description}</p>
                            </article>
                        ))}
                    </div>
                    </Container>
                </section>

                <section id="offres" className="bg-white">
                    <Container className="py-16">
                        <div className="max-w-2xl">
                            <SectionTitle
                                eyebrow={t('landing.offers.eyebrow')}
                                title={t('landing.offers.title')}
                                description={t('landing.offers.description')}
                            />
                        </div>

                        <div className="mt-10 grid gap-6 md:grid-cols-3">
                            {plans.map((plan) => {
                                const selected = formData.desiredPlan === plan.id;
                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => choosePlan(plan.id)}
                                        className={`rounded-[1.75rem] border p-7 text-left transition ${selected
                                            ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200'
                                            : plan.featured
                                                ? 'border-blue-200 bg-blue-50 text-slate-900 hover:border-blue-300'
                                                : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-lg'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                                            {plan.featured && !selected && (
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">{t('landing.offers.popular')}</span>
                                            )}
                                            {selected && (
                                                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">{t('landing.offers.selected')}</span>
                                            )}
                                        </div>
                                        <p className={`mt-3 text-sm ${selected ? 'text-blue-50' : 'text-slate-600'}`}>{plan.description}</p>
                                        <ul className={`mt-6 space-y-3 text-sm ${selected ? 'text-blue-50' : 'text-slate-600'}`}>
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2">
                                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${selected ? 'bg-white' : 'bg-blue-500'}`} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                );
                            })}
                        </div>
                    </Container>
                </section>

                <section id="demo" className="py-16">
                    <Container>
                        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{t('landing.demo.eyebrow')}</p>
                            <h2 className="mt-4 text-4xl font-extrabold leading-tight">{t('landing.demo.title')}</h2>
                            <p className="mt-4 text-lg leading-8 text-slate-300">
                                {t('landing.demo.description')}
                            </p>

                            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('landing.demo.activePlan')}</p>
                                <p className="mt-2 text-2xl font-bold">{activePlan.name}</p>
                                <p className="mt-2 text-sm text-slate-300">{activePlan.description}</p>
                            </div>

                            <ul className="mt-8 space-y-3 text-sm text-slate-300">
                                {t('landing.demo.bullets').map((bullet) => (
                                    <li key={bullet}>• {bullet}</li>
                                ))}
                            </ul>
                        </div>

                        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={t('landing.form.fullName')} name="fullName" value={formData.fullName} onChange={handleChange} required />
                                <Field label={t('landing.form.email')} name="email" type="email" value={formData.email} onChange={handleChange} required />
                                <Field label={t('landing.form.phone')} name="phone" value={formData.phone} onChange={handleChange} />
                                <Field label={t('landing.form.companyName')} name="companyName" value={formData.companyName} onChange={handleChange} required />

                                <div>
                                    <label htmlFor="clinicType" className="block text-sm font-bold text-slate-700">{t('landing.form.clinicType')}</label>
                                    <select
                                        id="clinicType"
                                        name="clinicType"
                                        value={formData.clinicType}
                                        onChange={handleChange}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        {clinicTypeOptions.map((option) => (
                                            <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <Field
                                    label={t('landing.form.teamSize')}
                                    name="teamSize"
                                    type="number"
                                    min="1"
                                    value={formData.teamSize}
                                    onChange={handleChange}
                                    placeholder={t('landing.form.teamSizePlaceholder')}
                                />

                                <div>
                                    <label htmlFor="desiredPlan" className="block text-sm font-bold text-slate-700">{t('landing.form.desiredPlan')}</label>
                                    <select
                                        id="desiredPlan"
                                        name="desiredPlan"
                                        value={formData.desiredPlan}
                                        onChange={handleChange}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        {plans.map((plan) => (
                                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <Field
                                    label={t('landing.form.preferredDemoDate')}
                                    name="preferredDemoDate"
                                    type="datetime-local"
                                    value={formData.preferredDemoDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="mt-5">
                                <label htmlFor="message" className="block text-sm font-bold text-slate-700">{t('landing.form.message')}</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder={t('landing.form.messagePlaceholder')}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            {submitState.message && (
                                <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${submitState.type === 'success'
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border border-red-200 bg-red-50 text-red-700'
                                    }`}>
                                    {submitState.message}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    {t('landing.demo.consent')}
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-2xl bg-blue-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? t('landing.demo.submitting') : t('landing.demo.submit')}
                                </button>
                            </div>
                        </form>
                    </div>
                    </Container>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white py-10">
                <Container className="flex flex-col gap-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
                    <p>© 2026 MediCore AI. {t('landing.footer.tagline')}</p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/doctors" className="transition-colors hover:text-blue-600">{t('landing.footer.doctorsDirectory')}</Link>
                        <Link to="/patient/login" className="transition-colors hover:text-blue-600">{t('landing.footer.patientPortal')}</Link>
                        <a href="#demo" className="transition-colors hover:text-blue-600">{t('landing.footer.requestDemo')}</a>
                    </div>
                </Container>
            </footer>
        </div>
    );
};

const MetricCard = ({ value, label }) => (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-3xl font-extrabold text-slate-950">{value}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
    </div>
);

const Field = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-bold text-slate-700">{label}</label>
        <input
            {...props}
            id={props.name}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
    </div>
);

export default LandingPage;
