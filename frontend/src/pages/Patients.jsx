import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });

    useEffect(() => {
        fetchPatients();
    }, [search]);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await api.get('/patients', { params: { search, page: 1, limit: 20 } });
            setPatients(response.data.data.patients);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patients</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.totalCount} patients</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Nouveau Patient
                </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Rechercher un patient..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select className="px-4 py-3 bg-gray-50 dark:bg-dark-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                        <option>Tous les statuts</option>
                        <option>Actifs</option>
                        <option>Inactifs</option>
                    </select>
                </div>
            </div>

            {/* Patient List */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="spinner" />
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucun patient trouvé</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Commencez par ajouter votre premier patient</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-dark-700">
                                <tr>
                                    <th className="table-header">Patient</th>
                                    <th className="table-header">Contact</th>
                                    <th className="table-header">Date de naissance</th>
                                    <th className="table-header">RDV</th>
                                    <th className="table-header">Statut</th>
                                    <th className="table-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                                {patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <td className="table-cell">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                                    {patient.firstName?.[0]}{patient.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <Link to={`/patients/${patient.id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary-500">
                                                        {patient.fullName}
                                                    </Link>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{patient.patientNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <p className="text-gray-900 dark:text-white">{patient.email || '-'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{patient.phone || '-'}</p>
                                        </td>
                                        <td className="table-cell">
                                            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : '-'}
                                        </td>
                                        <td className="table-cell">
                                            <span className="badge badge-info">{patient.appointmentCount} RDV</span>
                                        </td>
                                        <td className="table-cell">
                                            <span className={`badge ${patient.isActive ? 'badge-success' : 'badge-neutral'}`}>
                                                {patient.isActive ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                <Link to={`/patients/${patient.id}`} className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Patient Modal */}
            {showModal && <AddPatientModal onClose={() => setShowModal(false)} onSuccess={fetchPatients} />}
        </div>
    );
};

// Add Patient Modal
const AddPatientModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/patients', formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating patient:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau Patient</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                            <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                            <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="input-field" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="input-field" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de naissance</label>
                            <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genre</label>
                            <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="input-field">
                                <option value="">Sélectionner</option>
                                <option value="male">Homme</option>
                                <option value="female">Femme</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? 'Création...' : 'Créer Patient'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Patients;
