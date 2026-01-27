import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        specialty: '',
        clinicName: '',
        clinicType: 'general'
    });
    const [showPassword, setShowPassword] = useState(false);
    const { register, isLoading, error } = useAuthStore();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        await register(formData);
    };

    const clinicTypes = [
        { value: 'general', label: 'Médecine Générale' },
        { value: 'dental', label: 'Cabinet Dentaire' },
        { value: 'aesthetic', label: 'Clinique Esthétique' },
        { value: 'veterinary', label: 'Clinique Vétérinaire' }
    ];

    return (
        <div className="animate-fade-in">
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
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Créer un compte</h2>
                    <p className="text-gray-500 dark:text-gray-400">Commencez votre essai gratuit de 14 jours</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prénom</label>
                            <input
                                type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                className="input-field" placeholder="Jean" required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom</label>
                            <input
                                type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                className="input-field" placeholder="Dupont" required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                        <input
                            type="email" name="email" value={formData.email} onChange={handleChange}
                            className="input-field" placeholder="vous@exemple.com" required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spécialité</label>
                        <input
                            type="text" name="specialty" value={formData.specialty} onChange={handleChange}
                            className="input-field" placeholder="Ex: Médecin généraliste, Dentiste..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du cabinet</label>
                        <input
                            type="text" name="clinicName" value={formData.clinicName} onChange={handleChange}
                            className="input-field" placeholder="Cabinet Médical Dupont"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de cabinet</label>
                        <select name="clinicType" value={formData.clinicType} onChange={handleChange} className="input-field">
                            {clinicTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mot de passe</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'} name="password"
                                value={formData.password} onChange={handleChange}
                                className="input-field pr-12" placeholder="••••••••" required minLength={8}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmer le mot de passe</label>
                        <input
                            type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                            className="input-field" placeholder="••••••••" required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full btn-primary flex items-center justify-center gap-2">
                        {isLoading ? (<><div className="spinner" />Création...</>) : "Créer mon compte"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Déjà un compte ?{' '}
                        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">Se connecter</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
