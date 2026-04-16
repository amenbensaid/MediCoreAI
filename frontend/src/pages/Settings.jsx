import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const Settings = () => {
    const { user, updateUser } = useAuthStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', name: 'Profile', icon: '👤' },
        { id: 'clinic', name: 'Clinic', icon: '🏥' },
        { id: 'notifications', name: 'Notifications', icon: '🔔' },
        { id: 'security', name: 'Security', icon: '🔐' },
        { id: 'appearance', name: 'Appearance', icon: '🎨' },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <div className="md:w-64 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-4">
                    <nav className="space-y-2">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                                    }`}>
                                <span>{tab.icon}</span>
                                <span className="font-medium">{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                                <button className="btn-secondary">Change Photo</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                                    <input type="text" defaultValue={user?.firstName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                                    <input type="text" defaultValue={user?.lastName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input type="email" defaultValue={user?.email} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Specialty</label>
                                    <input type="text" defaultValue={user?.specialty} className="input-field" />
                                </div>
                            </div>
                            <button className="btn-primary">Save Changes</button>
                        </div>
                    )}

                    {activeTab === 'clinic' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Clinic Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clinic Name</label>
                                    <input type="text" defaultValue={user?.clinicName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                    <select className="input-field">
                                        <option value="general">General Practice</option>
                                        <option value="dental">Dental Clinic</option>
                                        <option value="aesthetic">Aesthetic Clinic</option>
                                        <option value="veterinary">Veterinary Clinic</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                    <input type="text" className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                    <input type="tel" className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input type="email" className="input-field" />
                                </div>
                            </div>
                            <button className="btn-primary">Save Changes</button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                            <div className="space-y-4">
                                <ToggleSetting title="Appointment reminders via email" description="Receive an email for each new appointment" defaultChecked />
                                <ToggleSetting title="SMS Alerts" description="Receive SMS for emergencies" />
                                <ToggleSetting title="Daily Report" description="Receive a daily summary via email" defaultChecked />
                                <ToggleSetting title="AI Alerts" description="Notifications for important AI predictions" defaultChecked />
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Change Password</h3>
                                <div className="space-y-4">
                                    <input type="password" placeholder="Current password" className="input-field" />
                                    <input type="password" placeholder="New password" className="input-field" />
                                    <input type="password" placeholder="Confirm new password" className="input-field" />
                                    <button className="btn-primary">Change Password</button>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add an extra layer of security to your account</p>
                                <button className="btn-secondary">Enable 2FA</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable dark theme</p>
                                    </div>
                                    <button onClick={toggleTheme}
                                        className={`relative w-14 h-8 rounded-full transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-gray-300'}`}>
                                        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Accent Color</h3>
                                    <div className="flex gap-3">
                                        {['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                                            <button key={color} className="w-10 h-10 rounded-full ring-2 ring-offset-2 ring-transparent hover:ring-gray-400 transition-all"
                                                style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ToggleSetting = ({ title, description, defaultChecked = false }) => {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
            <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <button onClick={() => setChecked(!checked)}
                className={`relative w-14 h-8 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${checked ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
};

export default Settings;
