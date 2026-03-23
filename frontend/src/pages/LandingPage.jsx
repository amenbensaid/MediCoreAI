import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        price: '99€',
        period: '/mois',
        description: 'Pour cabinets en lancement',
        features: [
            'Jusqu\'à 3 praticiens',
            'Agenda & rappels automatiques',
            'Dossiers patients centralisés',
            'Support email prioritaire'
        ],
        highlighted: false
    },
    {
        id: 'professional',
        name: 'Professional',
        price: '249€',
        period: '/mois',
        description: 'Pour cabinets en croissance',
        features: [
            'Jusqu\'à 15 praticiens',
            'Analytics avancés & BI',
            'Facturation intelligente',
            'Automatisations IA',
            'Support prioritaire 7j/7'
        ],
        highlighted: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Sur devis',
        period: '',
        description: 'Pour groupes multi-sites',
        features: [
            'Multi-cabinets illimité',
            'Onboarding dédié',
            'SLA & support dédié',
            'Intégrations sur mesure',
            'Sécurité et conformité avancées'
        ],
        highlighted: false
    }
];

const paymentMethods = [
    { label: 'Visa' },
    { label: 'Mastercard' },
    { label: 'SEPA' },
    { label: 'Apple Pay' },
    { label: 'Google Pay' }
];

const trustedBrands = ['Clinics Group', 'DentalPro', 'Vet Alliance', 'Aesthetic Care', 'MediHub', 'CareFlow'];

const LandingPage = () => {
    const { isAuthenticated } = useAuthStore();
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

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
        );

        const revealNodes = document.querySelectorAll('[data-reveal]');
        revealNodes.forEach((node) => observer.observe(node));

        return () => {
            revealNodes.forEach((node) => observer.unobserve(node));
            observer.disconnect();
        };
    }, []);

    const scrollToDemoWithPlan = (planId) => {
        setFormData((prev) => ({ ...prev, desiredPlan: planId }));
        const demoSection = document.getElementById('demo');
        if (demoSection) {
            demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handlePlanMouseMove = (event) => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 10;
        const rotateX = (0.5 - py) * 8;

        card.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
        card.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
    };

    const resetPlanTransform = (event) => {
        const card = event.currentTarget;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitState({ type: '', message: '' });
        setIsSubmitting(true);

        try {
            await api.post('/demo-requests', formData);
            setSubmitState({
                type: 'success',
                message: 'Votre demande de démo a été envoyée. Notre équipe vous recontacte sous 24h ouvrées.'
            });
            setFormData({
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
        } catch (error) {
            const apiMessage = error.response?.data?.message;
            setSubmitState({
                type: 'error',
                message: apiMessage || 'Impossible d\'envoyer la demande pour le moment. Merci de réessayer.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white animate-fade-in">
            <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center shadow-glow">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold">MediCore AI</p>
                            <p className="text-xs text-slate-400">CRM/PMS Admin pour la santé</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a href="#offres" className="hidden md:inline text-sm text-slate-300 hover:text-white transition-colors">Offres</a>
                        <a href="#demo" className="hidden md:inline text-sm text-slate-300 hover:text-white transition-colors">Réserver une démo</a>
                        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="btn-secondary !py-2 !px-4 text-sm">
                            {isAuthenticated ? 'Accéder au CRM' : 'Connexion'}
                        </Link>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary-500/20 blur-3xl" />
                    <div className="absolute top-1/2 -right-24 w-[32rem] h-[32rem] rounded-full bg-medical-500/20 blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
                    <div data-reveal className="reveal-up">
                        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-400/30 bg-primary-500/10 text-primary-300 text-xs font-semibold mb-6">
                            Solution SaaS pour équipes admin & médicales
                        </p>
                        <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                            Pilotez votre
                            <span className="bg-gradient-to-r from-primary-400 to-medical-400 bg-clip-text text-transparent"> CRM médical </span>
                            avec excellence.
                        </h1>
                        <p className="text-slate-300 text-lg mt-6 max-w-xl">
                            MediCore AI centralise patients, agenda, facturation et analytics dans une interface premium.
                            Offrez à votre équipe admin un workflow moderne et à vos praticiens plus de temps clinique.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <a href="#demo" className="btn-primary">Réserver une démo</a>
                            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-secondary">
                                {isAuthenticated ? 'Voir le tableau de bord' : 'Créer un compte'}
                            </Link>
                        </div>

                        <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                            <KpiCard value="99.9%" label="Disponibilité" />
                            <KpiCard value="+2M" label="Patients gérés" />
                            <KpiCard value="24h" label="Mise en route" />
                        </div>
                    </div>

                    <div data-reveal className="reveal-up rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl animate-float-soft">
                        <p className="text-sm text-slate-300 mb-4">Aperçu du cockpit admin</p>
                        <div className="space-y-4">
                            <DemoRow label="Demandes de RDV" value="128" trend="+14%" />
                            <DemoRow label="CA prévisionnel" value="87 420€" trend="+9%" />
                            <DemoRow label="No-show détectés (IA)" value="7" trend="-23%" positive={false} />
                        </div>
                        <div className="mt-6 p-4 rounded-xl bg-slate-900/70 border border-white/10">
                            <p className="text-sm text-slate-300">Flux admin</p>
                            <p className="text-base mt-1 font-semibold">Validation des demandes de démo en 1 clic</p>
                            <div className="flex gap-2 mt-3">
                                <span className="badge badge-success">Acceptée</span>
                                <span className="badge badge-danger">Refusée</span>
                                <span className="badge badge-warning">En attente</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pb-10 border-t border-white/10">
                    <div className="marquee-track">
                        <div className="marquee-content">
                            {trustedBrands.map((brand) => (
                                <span key={`a-${brand}`} className="marquee-pill">{brand}</span>
                            ))}
                        </div>
                        <div className="marquee-content" aria-hidden="true">
                            {trustedBrands.map((brand) => (
                                <span key={`b-${brand}`} className="marquee-pill">{brand}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="offres" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
                <div data-reveal className="reveal-up text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Offres adaptées à votre structure</h2>
                    <p className="text-slate-300 mt-3">Des abonnements conçus pour un CRM admin médical performant et évolutif.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                        <article
                            key={plan.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => scrollToDemoWithPlan(plan.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    scrollToDemoWithPlan(plan.id);
                                }
                            }}
                            onMouseMove={handlePlanMouseMove}
                            onMouseLeave={resetPlanTransform}
                            style={{ animationDelay: `${index * 120}ms` }}
                            className={`plan-card plan-card-3d animate-rise-in rounded-2xl border p-7 transition-all duration-500 cursor-pointer group ${formData.desiredPlan === plan.id
                                ? 'ring-2 ring-primary-400 border-primary-300 bg-gradient-to-b from-primary-500/25 to-slate-900 shadow-glow scale-[1.02]'
                                : plan.highlighted
                                    ? 'border-primary-400/70 bg-gradient-to-b from-primary-500/16 to-slate-900 shadow-glow'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                {plan.highlighted && (
                                    <p className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/85 text-white">
                                        Recommandé
                                    </p>
                                )}
                                {formData.desiredPlan === plan.id && (
                                    <p className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-medical-500 text-white animate-pulse-slow">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                        Sélectionnée
                                    </p>
                                )}
                                {!plan.highlighted && formData.desiredPlan !== plan.id && <span />}
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold">{plan.name}</h3>
                                <p className="text-slate-300 mt-1">{plan.description}</p>
                                <p className="mt-6 text-4xl font-bold">
                                    {plan.price}
                                    <span className="text-base font-medium text-slate-400"> {plan.period}</span>
                                </p>
                                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 group-hover:translate-x-0.5 transition-transform duration-300">
                                            <svg className="w-5 h-5 text-medical-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        scrollToDemoWithPlan(plan.id);
                                    }}
                                    className={`mt-8 inline-flex w-full justify-center ${formData.desiredPlan === plan.id ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {formData.desiredPlan === plan.id ? 'Offre active' : `Choisir ${plan.name}`}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div data-reveal className="reveal-up rounded-2xl border border-white/10 bg-white/5 p-8">
                    <h3 className="text-2xl font-bold">Paiements sécurisés et flexibles</h3>
                    <p className="text-slate-300 mt-2">Abonnement mensuel ou annuel, facturation entreprise et conformité standard du secteur.</p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {paymentMethods.map((method) => (
                            <span key={method.label} className="floating-chip px-4 py-2 rounded-xl border border-white/15 bg-slate-900/70 text-sm text-slate-200">
                                {method.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section id="demo" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
                <div className="grid lg:grid-cols-5 gap-8 items-start">
                    <div data-reveal className="reveal-up lg:col-span-2">
                        <h2 className="text-3xl font-bold">Réservez votre démo personnalisée</h2>
                        <p className="text-slate-300 mt-3">
                            Expliquez votre besoin, sélectionnez votre offre et recevez une proposition de démo adaptée à votre organisation.
                        </p>
                        <ul className="mt-6 space-y-3 text-slate-200 text-sm">
                            <li>• Session de 30 minutes orientée opération admin</li>
                            <li>• Cas d'usage CRM + facturation + planning</li>
                            <li>• Validation de votre parcours de déploiement</li>
                        </ul>
                    </div>

                    <form data-reveal onSubmit={handleSubmit} className="reveal-up lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-6 lg:p-8 space-y-4">
                        <div className="rounded-xl border border-primary-400/30 bg-primary-500/10 px-4 py-3">
                            <p className="text-xs text-primary-200 uppercase tracking-wide">Offre active</p>
                            <p className="text-sm font-semibold mt-1">{plans.find((plan) => plan.id === formData.desiredPlan)?.name || 'Professional'}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Input label="Nom complet" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            <Input label="Email professionnel" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            <Input label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} />
                            <Input label="Nom du cabinet / groupe" name="companyName" value={formData.companyName} onChange={handleChange} required />
                            <Input label="Type de clinique" name="clinicType" value={formData.clinicType} onChange={handleChange} placeholder="Dentaire, esthétique, vétérinaire..." />
                            <Input label="Taille de l'équipe" name="teamSize" value={formData.teamSize} onChange={handleChange} placeholder="ex: 10-25" />
                            <div>
                                <label htmlFor="desiredPlan" className="block text-sm font-medium text-slate-200 mb-2">Offre souhaitée</label>
                                <select
                                    id="desiredPlan"
                                    name="desiredPlan"
                                    value={formData.desiredPlan}
                                    onChange={handleChange}
                                    className="input-field !bg-slate-900/80 !border-white/10 !text-white"
                                >
                                    <option value="starter">Starter</option>
                                    <option value="professional">Professional</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <Input label="Date souhaitée" name="preferredDemoDate" type="datetime-local" value={formData.preferredDemoDate} onChange={handleChange} />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-slate-200 mb-2">Message (optionnel)</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows={4}
                                className="input-field !bg-slate-900/80 !border-white/10 !text-white"
                                placeholder="Votre contexte, vos objectifs, vos contraintes..."
                            />
                        </div>

                        {submitState.message && (
                            <div className={`rounded-xl px-4 py-3 text-sm ${submitState.type === 'success'
                                ? 'bg-green-500/15 text-green-300 border border-green-400/30'
                                : 'bg-red-500/15 text-red-300 border border-red-400/30'
                                }`}>
                                {submitState.message}
                            </div>
                        )}

                        <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Envoi en cours...' : 'Réserver ma démo'}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
};

const KpiCard = ({ value, label }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
);

const DemoRow = ({ label, value, trend, positive = true }) => (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div>
            <p className="text-sm text-slate-300">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <span className={`text-sm font-semibold ${positive ? 'text-green-400' : 'text-orange-300'}`}>{trend}</span>
    </div>
);

const Input = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-200 mb-2">{label}</label>
        <input
            {...props}
            id={props.name}
            className="input-field !bg-slate-900/80 !border-white/10 !text-white"
        />
    </div>
);

export default LandingPage;
