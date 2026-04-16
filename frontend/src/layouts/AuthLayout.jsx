import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

const AuthLayout = () => {
    const { initializeTheme } = useThemeStore();

    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-medical-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-16">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center shadow-glow">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">MediCore</h1>
                            <p className="text-primary-300 font-medium">AI-Powered Healthcare</p>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">Smart Management</h3>
                                <p className="text-gray-400">Automate your administrative tasks with AI</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-medical-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-medical-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">Smart Scheduling</h3>
                                <p className="text-gray-400">No-show prediction and appointment optimization</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">Advanced Analytics</h3>
                                <p className="text-gray-400">BI dashboards to drive your practice</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-16 flex gap-12">
                        <div>
                            <p className="text-4xl font-bold text-white">10k+</p>
                            <p className="text-gray-400">Practitioners</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-white">2M+</p>
                            <p className="text-gray-400">Patients managed</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-white">99.9%</p>
                            <p className="text-gray-400">Uptime</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
