import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <div className="animate-fade-in">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <span className="text-2xl font-bold text-white">MediCore AI</span>
            </div>

            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
                    <p className="text-gray-500 dark:text-gray-400">Sign in to your account</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pr-12"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500" />
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                        </label>
                        <a href="#" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
                            Sign Up
                        </Link>
                    </p>
                </div>

                {/* Demo credentials */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">Demo account:</p>
                    <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                        <span className="font-mono">admin@medicore.ai</span> / <span className="font-mono">Admin@123</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
