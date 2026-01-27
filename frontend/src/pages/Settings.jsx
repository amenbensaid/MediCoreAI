import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const Settings = () => {
    const { user, updateUser } = useAuthStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', name: 'Profil', icon: '👤' },
        { id: 'clinic', name: 'Cabinet', icon: '🏥' },
        { id: 'notifications', name: 'Notifications', icon: '🔔' },
        { id: 'security', name: 'Sécurité', icon: '🔐' },
        { id: 'appearance', name: 'Apparence', icon: '🎨' },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Paramètres</h1>

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
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informations du profil</h2>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                                <button className="btn-secondary">Changer la photo</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prénom</label>
                                    <input type="text" defaultValue={user?.firstName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom</label>
                                    <input type="text" defaultValue={user?.lastName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input type="email" defaultValue={user?.email} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spécialité</label>
                                    <input type="text" defaultValue={user?.specialty} className="input-field" />
                                </div>
                            </div>
                            <button className="btn-primary">Sauvegarder</button>
                        </div>
                    )}

                    {activeTab === 'clinic' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Paramètres du cabinet</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du cabinet</label>
                                    <input type="text" defaultValue={user?.clinicName} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                    <select className="input-field">
                                        <option value="general">Médecine Générale</option>
                                        <option value="dental">Cabinet Dentaire</option>
                                        <option value="aesthetic">Clinique Esthétique</option>
                                        <option value="veterinary">Clinique Vétérinaire</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adresse</label>
                                    <input type="text" className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Téléphone</label>
                                    <input type="tel" className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input type="email" className="input-field" />
                                </div>
                            </div>
                            <button className="btn-primary">Sauvegarder</button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Préférences de notification</h2>
                            <div className="space-y-4">
                                <ToggleSetting title="Rappels de RDV par email" description="Recevoir un email pour chaque nouveau RDV" defaultChecked />
                                <ToggleSetting title="Alertes SMS" description="Recevoir des SMS pour les urgences" />
                                <ToggleSetting title="Rapport quotidien" description="Recevoir un résumé quotidien par email" defaultChecked />
                                <ToggleSetting title="Alertes IA" description="Notifications pour les prédictions IA importantes" defaultChecked />
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sécurité</h2>
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Changer le mot de passe</h3>
                                <div className="space-y-4">
                                    <input type="password" placeholder="Mot de passe actuel" className="input-field" />
                                    <input type="password" placeholder="Nouveau mot de passe" className="input-field" />
                                    <input type="password" placeholder="Confirmer le nouveau mot de passe" className="input-field" />
                                    <button className="btn-primary">Changer le mot de passe</button>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Authentification à deux facteurs</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                                <button className="btn-secondary">Activer la 2FA</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Apparence</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">Mode sombre</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Activer le thème sombre</p>
                                    </div>
                                    <button onClick={toggleTheme}
                                        className={`relative w-14 h-8 rounded-full transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-gray-300'}`}>
                                        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Couleur d'accent</h3>
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
