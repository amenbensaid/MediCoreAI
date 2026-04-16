import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PatientRegister = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        password: '', confirmPassword: '', dateOfBirth: '', gender: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/public/patient/register', formData);
            const { token, user } = res.data.data;
            localStorage.setItem('patient-token', token);
            localStorage.setItem('patient-user', JSON.stringify(user));
            navigate('/patient/portal');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
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
                        <p className="text-xs text-primary-300">Patient Portal</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Patient Account</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Book appointments online easily</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                    className="input-field" placeholder="John" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                    className="input-field" placeholder="Doe" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange}
                                className="input-field" placeholder="john@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                className="input-field" placeholder="+1 234 567 890" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                                    className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="input-field">
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                                    onChange={handleChange} className="input-field pr-12" placeholder="Min. 8 characters" required minLength={8} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword}
                                onChange={handleChange} className="input-field" placeholder="••••••••" required />
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
                            {loading ? (<><div className="spinner" />Creating...</>) : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/patient/login" className="text-primary-500 hover:text-primary-600 font-medium">Sign In</Link>
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                            Are you a practitioner? <Link to="/login" className="text-primary-500 hover:text-primary-600">Staff Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientRegister;
