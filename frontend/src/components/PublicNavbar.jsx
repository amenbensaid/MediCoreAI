import { Link, useLocation } from 'react-router-dom';
import Container from './ui/Container';
import { Button } from './ui/Button';
import { useAuthStore } from '../stores/authStore';
import { PATIENT_DASHBOARD_PATH, PATIENT_LOGIN_PATH, STAFF_LOGIN_PATH, getPublicDashboardTarget } from '../utils/authRouting';
import LanguageSwitch from './ui/LanguageSwitch';
import { useI18n } from '../stores/languageStore';

const NavLink = ({ to, children }) => {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <Link
            to={to}
            className={`text-sm font-medium transition-colors ${active ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
        >
            {children}
        </Link>
    );
};

const PublicNavbar = () => {
    const { user, isAuthenticated, isAuthReady } = useAuthStore();
    const { t } = useI18n();
    const dashboardTarget = getPublicDashboardTarget({ user, isAuthenticated, isAuthReady });

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <Container className="flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-600 p-2">
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                        </svg>
                    </div>
                    <span className="text-xl font-extrabold tracking-tight text-blue-900">
                        MediCore <span className="text-blue-500">AI</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                    <NavLink to="/">{t('nav.home')}</NavLink>
                    <NavLink to="/doctors">{t('nav.doctors')}</NavLink>
                    <a href="/#offres" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600">{t('nav.offers')}</a>
                    <a href="/#demo" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600">{t('nav.demo')}</a>
                </nav>

                <div className="flex items-center gap-2">
                    <LanguageSwitch compact />
                    <Link
                        to={dashboardTarget === PATIENT_DASHBOARD_PATH ? PATIENT_DASHBOARD_PATH : PATIENT_LOGIN_PATH}
                        className="hidden sm:block text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                        {t('common.patientPortal')}
                    </Link>
                    <Button
                        as={Link}
                        to={dashboardTarget || STAFF_LOGIN_PATH}
                        variant="blue"
                        className="!rounded-full !px-5 !py-2 text-sm shadow-md shadow-blue-200"
                    >
                        {dashboardTarget ? t('common.dashboard') : t('common.signIn')}
                    </Button>
                </div>
            </Container>
        </header>
    );
};

export default PublicNavbar;
