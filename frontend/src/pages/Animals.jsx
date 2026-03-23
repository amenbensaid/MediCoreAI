import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const Animals = () => {
    const [animals, setAnimals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchAnimals = async () => {
            try {
                setIsLoading(true);
                // Fetch animals for the clinic
                const response = await api.get('/animals');
                setAnimals(response.data.data || []);
            } catch (err) {
                setError('Erreur lors du chargement des animaux');
                console.error('Error fetching animals:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnimals();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des Animaux</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Gérez tous les animaux de votre clinique vétérinaire</p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-dark-800 rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
                        <thead className="bg-gray-50 dark:bg-dark-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Nom
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Espèce
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Race
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Propriétaire
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Poids
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                            {animals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        Aucun animal enregistré
                                    </td>
                                </tr>
                            ) : (
                                animals.map((animal) => (
                                    <tr key={animal.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {animal.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {animal.species}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {animal.breed || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {animal.ownerName || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {animal.weight ? `${animal.weight} kg` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Animals;
