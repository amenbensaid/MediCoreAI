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
import BookAppointment from './pages/patient/BookAppointment';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Animals from './pages/Animals';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Calendar from './pages/Calendar';
import Invoices from './pages/Invoices';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import DentalModule from './pages/DentalModule';
import AestheticModule from './pages/AestheticModule';
import VeterinaryModule from './pages/VeterinaryModule';
import DemoRequests from './pages/DemoRequests';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    const { isAuthenticated } = useAuthStore();
    
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
                <Route path="/patient/login" element={<PatientLogin />} />
                <Route path="/patient/register" element={<PatientRegister />} />
                <Route path="/patient/portal" element={<PatientPortal />} />
                <Route path="/patient/book" element={<BookAppointment />} />

                {/* Protected Routes (Staff/Admin) */}
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/animals" element={<Animals />} />
                    <Route path="/patients/:id" element={<PatientDetail />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/dental" element={<DentalModule />} />
                    <Route path="/aesthetic" element={<AestheticModule />} />
                    <Route path="/veterinary" element={<VeterinaryModule />} />
                    <Route path="/admin/demo-requests" element={<DemoRequests />} />
                </Route>

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;

