import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import LandingPage from './pages/LandingPage';

// Patient Portal Pages
import PatientLogin from './pages/patient/PatientLogin';
import PatientRegister from './pages/patient/PatientRegister';
import PatientPortal from './pages/patient/PatientPortal';
import EditProfile from './pages/patient/EditProfile';
import PatientSettings from './pages/patient/PatientSettings';
import BookAppointment from './pages/patient/BookAppointment';
import DoctorsPage from './pages/patient/DoctorsPage';
import DoctorProfile from './pages/patient/DoctorProfile';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Animals from './pages/Animals';
import AdminDoctors from './pages/AdminDoctors';
import PlatformAccounts from './pages/PlatformAccounts';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Calendar from './pages/Calendar';
import CalendarDay from './pages/CalendarDay';
import Teleconsultations from './pages/Teleconsultations';
import Invoices from './pages/Invoices';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import DentalModule from './pages/DentalModule';
import AestheticModule from './pages/AestheticModule';
import VeterinaryModule from './pages/VeterinaryModule';
import DemoRequests from './pages/DemoRequests';
import Reviews from './pages/Reviews';
import DoctorProfileEdit from './pages/doctor/DoctorProfileEdit';
import { canAccessModule } from './utils/access';
import {
    PATIENT_DASHBOARD_PATH,
    PATIENT_LOGIN_PATH,
    STAFF_DASHBOARD_PATH,
    STAFF_LOGIN_PATH,
    isPatientSessionActive
} from './utils/authRouting';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, isAuthenticated, isLoading, isAuthReady } = useAuthStore();

    if (isLoading || !isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={STAFF_LOGIN_PATH} replace />;
    }

    if (user?.role === 'patient') {
        return <Navigate to={PATIENT_LOGIN_PATH} replace />;
    }

    return children;
};

const PatientProtectedRoute = ({ children }) => {
    if (!isPatientSessionActive()) {
        return <Navigate to={PATIENT_LOGIN_PATH} replace />;
    }

    return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
    const { user, isAuthenticated, isAuthReady } = useAuthStore();

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
                <div className="spinner" />
            </div>
        );
    }

    if (isAuthenticated) {
        if (user?.role === 'patient') {
            return <Navigate to={PATIENT_LOGIN_PATH} replace />;
        }

        return <Navigate to={STAFF_DASHBOARD_PATH} replace />;
    }

    return children;
};

const PatientPublicRoute = ({ children }) => {
    if (isPatientSessionActive()) {
        return <Navigate to={PATIENT_DASHBOARD_PATH} replace />;
    }

    return children;
};

const ModuleRoute = ({ moduleKey, children }) => {
    const { user } = useAuthStore();

    if (!canAccessModule(user, moduleKey)) {
        return <Navigate to={STAFF_DASHBOARD_PATH} replace />;
    }

    return children;
};

function App() {
    const initializeAuth = useAuthStore((state) => state.initializeAuth);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    return (
        <Router>
            <Routes>
                {/* Public Routes - Landing page visible to everyone */}
                <Route path="/" element={<LandingPage />} />
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                </Route>

                {/* Patient Portal Routes (no staff auth required) */}
                <Route path="/doctors" element={<DoctorsPage />} />
                <Route path="/doctors/:id" element={<DoctorProfile />} />
                <Route path="/patient/login" element={<PatientPublicRoute><PatientLogin /></PatientPublicRoute>} />
                <Route path="/patient/register" element={<PatientPublicRoute><PatientRegister /></PatientPublicRoute>} />
                <Route path="/patient/portal" element={<PatientProtectedRoute><PatientPortal /></PatientProtectedRoute>} />
                <Route path="/patient/edit-profile" element={<PatientProtectedRoute><EditProfile /></PatientProtectedRoute>} />
                <Route path="/patient/settings" element={<PatientProtectedRoute><PatientSettings /></PatientProtectedRoute>} />
                <Route path="/patient/book" element={<BookAppointment />} />

                {/* Protected Routes (Staff/Admin) */}
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<ModuleRoute moduleKey="dashboard"><Dashboard /></ModuleRoute>} />
                    <Route path="/doctor/profile" element={<DoctorProfileEdit />} />
                    <Route path="/patients" element={<ModuleRoute moduleKey="patients"><Patients /></ModuleRoute>} />
                    <Route path="/admin/doctors" element={<ModuleRoute moduleKey="adminDoctors"><AdminDoctors /></ModuleRoute>} />
                    <Route path="/admin/accounts" element={<ModuleRoute moduleKey="platformAccounts"><PlatformAccounts /></ModuleRoute>} />
                    <Route path="/animals" element={<ModuleRoute moduleKey="animals"><Animals /></ModuleRoute>} />
                    <Route path="/patients/:id" element={<ModuleRoute moduleKey="patients"><PatientDetail /></ModuleRoute>} />
                    <Route path="/appointments" element={<ModuleRoute moduleKey="appointments"><Appointments /></ModuleRoute>} />
                    <Route path="/calendar" element={<ModuleRoute moduleKey="calendar"><Calendar /></ModuleRoute>} />
                    <Route path="/calendar/day/:date" element={<ModuleRoute moduleKey="calendar"><CalendarDay /></ModuleRoute>} />
                    <Route path="/teleconsultations" element={<ModuleRoute moduleKey="teleconsultations"><Teleconsultations /></ModuleRoute>} />
                    <Route path="/reviews" element={<ModuleRoute moduleKey="reviews"><Reviews /></ModuleRoute>} />
                    <Route path="/invoices" element={<ModuleRoute moduleKey="billing"><Invoices /></ModuleRoute>} />
                    <Route path="/analytics" element={<ModuleRoute moduleKey="analytics"><Analytics /></ModuleRoute>} />
                    <Route path="/settings" element={<ModuleRoute moduleKey="settings"><Settings /></ModuleRoute>} />
                    <Route path="/dental" element={<ModuleRoute moduleKey="dental"><DentalModule /></ModuleRoute>} />
                    <Route path="/aesthetic" element={<ModuleRoute moduleKey="aesthetic"><AestheticModule /></ModuleRoute>} />
                    <Route path="/veterinary" element={<ModuleRoute moduleKey="veterinary"><VeterinaryModule /></ModuleRoute>} />
                    <Route path="/admin/demo-requests" element={<ModuleRoute moduleKey="demoRequests"><DemoRequests /></ModuleRoute>} />
                </Route>

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
