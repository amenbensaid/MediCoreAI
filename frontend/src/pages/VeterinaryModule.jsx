import { useState } from 'react';

const VeterinaryModule = () => {
    const [filter, setFilter] = useState('all');

    const animals = [
        { id: 1, name: 'Oscar', species: 'Chien', breed: 'Golden Retriever', owner: 'M. Jean Dupont', status: 'Healthy', nextVaccine: '12/05/2024' },
        { id: 2, name: 'Luna', species: 'Chat', breed: 'Siamois', owner: 'Mme. Marie Martin', status: 'Follow-up', nextVaccine: '03/02/2024' },
        { id: 3, name: 'Bella', species: 'Chien', breed: 'Berger Allemand', owner: 'M. Pierre Bernard', status: 'Emergency', nextVaccine: 'Today' },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Vétérinaire</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gestion par espèce/race et carnets de vaccination</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Carnet Santé PDF</button>
                    <button className="btn-primary">+ Nouveau Patient Animal</button>
                </div>
            </div>

            {/* Species Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SpeciesCard icon="🐶" label="Chiens" count={142} color="bg-orange-500" />
                <SpeciesCard icon="🐱" label="Chats" count={98} color="bg-blue-500" />
                <SpeciesCard icon="🐰" label="NAC" count={24} color="bg-green-500" />
                <SpeciesCard icon="🐴" label="Equidés" count={12} color="bg-purple-500" />
                <SpeciesCard icon="🩺" label="Urgences" count={5} color="bg-red-500" pulse />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Animal List */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-white font-medium">Patients en cours</h3>
                        <input type="text" placeholder="Rechercher..." className="px-3 py-1.5 bg-gray-50 dark:bg-dark-700 rounded-lg text-sm border-0 focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-dark-700">
                        {animals.map(animal => (
                            <div key={animal.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-900 flex items-center justify-center text-2xl">
                                        {animal.species === 'Chien' ? '🐶' : '🐱'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{animal.name}</p>
                                        <p className="text-xs text-gray-500">{animal.breed} • {animal.owner}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`badge ${animal.status === 'Healthy' ? 'badge-success' :
                                            animal.status === 'Emergency' ? 'badge-danger' : 'badge-warning'
                                        } mb-1`}>
                                        {animal.status}
                                    </span>
                                    <p className="text-[10px] text-gray-400">Vaccin: {animal.nextVaccine}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reminders & Alerts */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Rappels Vaccination</h3>
                        <div className="space-y-3">
                            <ReminderItem name="Oscar" vaccine="Rage + Parvo" days="3 jours" />
                            <ReminderItem name="Luna" vaccine="Leucose" days="12 jours" />
                            <ReminderItem name="Rex" vaccine="Toux du Chenil" days="15 jours" />
                        </div>
                        <button className="w-full btn-primary mt-6 text-sm py-2">Envoyer Rappels SMS</button>
                    </div>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Urgence Rapide</h3>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                            <p className="text-xs text-red-600 dark:text-red-400">🚨 1 cas critique</p>
                            <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">Bella - Berger Allemand</p>
                            <p className="text-[10px] text-red-600/70 mt-1">Syndrome Dilatation-Torsion d'Estomac (SDTE)</p>
                            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-bold mt-4 transition-colors cursor-pointer">
                                Ouvrir Protocole Urgence
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpeciesCard = ({ icon, label, count, color, pulse }) => (
    <div className="stat-card flex flex-col items-center justify-center p-4 hover:scale-105 transition-transform">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-2xl shadow-lg mb-3 ${pulse ? 'animate-pulse' : ''}`}>
            {icon}
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{count}</p>
        <p className="text-xs text-gray-500 uppercase tracking-tighter transition-colors cursor-pointer">{label}</p>
    </div>
);

const ReminderItem = ({ name, vaccine, days }) => (
    <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-dark-700 pb-2 transition-colors cursor-pointer">
        <div>
            <span className="font-semibold text-gray-800 dark:text-white">{name}</span>
            <span className="text-gray-400 ml-2">({vaccine})</span>
        </div>
        <span className="text-primary-500 font-medium">{days}</span>
    </div>
);

export default VeterinaryModule;
