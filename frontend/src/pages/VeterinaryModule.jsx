import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatRelativeDueDate = (dateValue) => {
    if (!dateValue) return 'Aucune date';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateValue);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Aujourd’hui';
    if (diffDays === 1) return '1 jour';
    return `${diffDays} jours`;
};

const formatDate = (dateValue) => {
    if (!dateValue) return 'Non planifié';
    return new Date(dateValue).toLocaleDateString('fr-FR');
};

const getSpeciesIcon = (species = '') => {
    const normalized = species.toLowerCase();
    if (normalized.includes('chien') || normalized.includes('dog')) return '🐶';
    if (normalized.includes('chat') || normalized.includes('cat')) return '🐱';
    if (normalized.includes('cheval') || normalized.includes('equid')) return '🐴';
    return '🐾';
};

const statusStyles = {
    Healthy: 'badge-success',
    'Follow-up': 'badge-warning',
    Emergency: 'badge-danger'
};

const VeterinaryModule = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [overview, setOverview] = useState({
        stats: { dogs: 0, cats: 0, nac: 0, equines: 0, emergencies: 0, total: 0 },
        activePatients: [],
        reminders: [],
        urgentCase: null
    });

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await api.get('/animals/overview');
                setOverview(response.data.data);
            } catch (err) {
                console.error('Failed to load veterinary overview:', err);
                setError('Erreur lors du chargement du module vétérinaire');
            } finally {
                setLoading(false);
            }
        };

        fetchOverview();
    }, []);

    const filteredAnimals = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return overview.activePatients;

        return overview.activePatients.filter((animal) =>
            [animal.name, animal.breed, animal.ownerName, animal.species, animal.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [overview.activePatients, search]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Vétérinaire</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Vue en direct des animaux, rappels vaccinaux et urgences de la clinique.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button">Carnet Santé PDF</button>
                    <Link to="/animals" className="btn-primary">+ Nouveau Patient Animal</Link>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                <SpeciesCard icon="🐶" label="Chiens" count={overview.stats.dogs} color="bg-orange-500" />
                <SpeciesCard icon="🐱" label="Chats" count={overview.stats.cats} color="bg-blue-500" />
                <SpeciesCard icon="🐾" label="NAC" count={overview.stats.nac} color="bg-green-500" />
                <SpeciesCard icon="🐴" label="Equidés" count={overview.stats.equines} color="bg-purple-500" />
                <SpeciesCard icon="🚨" label="Urgences" count={overview.stats.emergencies} color="bg-red-500" pulse={overview.stats.emergencies > 0} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg dark:border-dark-700 dark:bg-dark-800 lg:col-span-2">
                    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-dark-700 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Patients en cours</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {filteredAnimals.length} / {overview.stats.total} animaux affichés
                            </p>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un animal..."
                            className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 border-0 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-dark-700">
                        {filteredAnimals.length > 0 ? (
                            filteredAnimals.map((animal) => (
                                <div key={animal.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl dark:bg-dark-900">
                                            {getSpeciesIcon(animal.species)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{animal.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {[animal.breed, animal.ownerName].filter(Boolean).join(' • ') || animal.species}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className={`badge ${statusStyles[animal.status] || 'badge-info'} mb-1`}>
                                            {animal.status}
                                        </span>
                                        <p className="text-[11px] text-gray-400">
                                            Vaccin: {formatDate(animal.nextVaccine)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                Aucun animal ne correspond à la recherche.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Rappels Vaccination</h3>
                        <div className="space-y-3">
                            {overview.reminders.length > 0 ? (
                                overview.reminders.map((reminder) => (
                                    <ReminderItem
                                        key={reminder.id}
                                        name={reminder.animalName}
                                        vaccine={reminder.vaccineName}
                                        days={formatRelativeDueDate(reminder.nextDueDate)}
                                    />
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
                                    Aucun rappel vaccinal à venir.
                                </div>
                            )}
                        </div>
                        <button className="mt-6 w-full btn-primary text-sm py-2" type="button">Envoyer Rappels SMS</button>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Urgence Rapide</h3>
                        {overview.urgentCase ? (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                                <p className="text-xs text-red-600 dark:text-red-400">🚨 Cas prioritaire</p>
                                <p className="mt-1 text-sm font-bold text-red-700 dark:text-red-300">
                                    {overview.urgentCase.name}{overview.urgentCase.breed ? ` - ${overview.urgentCase.breed}` : ''}
                                </p>
                                <p className="mt-1 text-[11px] text-red-600/80 dark:text-red-300/80">
                                    {overview.urgentCase.reason}
                                </p>
                                <p className="mt-1 text-[11px] text-red-500/70 dark:text-red-300/70">
                                    {formatDate(overview.urgentCase.startTime)}
                                </p>
                                <button
                                    className="mt-4 w-full rounded-lg bg-red-600 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
                                    type="button"
                                >
                                    Ouvrir Protocole Urgence
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
                                Aucun cas critique détecté pour le moment.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpeciesCard = ({ icon, label, count, color, pulse }) => (
    <div className="stat-card flex flex-col items-center justify-center p-4 transition-transform hover:scale-[1.02]">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-lg ${color} ${pulse ? 'animate-pulse' : ''}`}>
            {icon}
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{count}</p>
        <p className="text-xs uppercase tracking-tight text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);

const ReminderItem = ({ name, vaccine, days }) => (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm dark:border-dark-700">
        <div>
            <span className="font-semibold text-gray-800 dark:text-white">{name}</span>
            <span className="ml-2 text-gray-400">({vaccine})</span>
        </div>
        <span className="font-medium text-primary-500">{days}</span>
    </div>
);

export default VeterinaryModule;
