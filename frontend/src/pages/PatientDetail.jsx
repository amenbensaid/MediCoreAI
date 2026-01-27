import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const PatientDetail = () => {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const fetchPatient = async () => {
        try {
            const response = await api.get(`/patients/${id}`);
            setPatient(response.data.data);
        } catch (error) {
            console.error('Error fetching patient:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
    }

    if (!patient) {
        return <div className="text-center py-16 text-gray-500">Patient non trouvé</div>;
    }

    const tabs = [
        { id: 'overview', name: 'Vue d\'ensemble', icon: '📋' },
        { id: 'appointments', name: 'Rendez-vous', icon: '📅' },
        { id: 'records', name: 'Dossier médical', icon: '🏥' },
        { id: 'invoices', name: 'Facturation', icon: '💳' },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/patients" className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{patient.fullName}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{patient.patientNumber}</p>
                </div>
                <button className="btn-secondary">Modifier</button>
                <button className="btn-primary">Nouveau RDV</button>
            </div>

            {/* Patient Card */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoItem label="Email" value={patient.email || '-'} />
                        <InfoItem label="Téléphone" value={patient.phone || '-'} />
                        <InfoItem label="Date de naissance" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : '-'} />
                        <InfoItem label="Adresse" value={patient.address || '-'} />
                        <InfoItem label="Ville" value={patient.city || '-'} />
                        <InfoItem label="Groupe sanguin" value={patient.bloodType || '-'} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}
                    >
                        {tab.icon} {tab.name}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Allergies</h3>
                            {patient.allergies?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {patient.allergies.map((allergy, i) => (
                                        <span key={i} className="badge badge-danger">{allergy}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">Aucune allergie connue</p>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Conditions chroniques</h3>
                            {patient.chronicConditions?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {patient.chronicConditions.map((condition, i) => (
                                        <span key={i} className="badge badge-warning">{condition}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">Aucune condition chronique</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                            <p className="text-gray-600 dark:text-gray-400">{patient.notes || 'Aucune note'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Historique des rendez-vous</h3>
                        {patient.recentAppointments?.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                {patient.recentAppointments.map(apt => (
                                    <div key={apt.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{apt.type}</p>
                                            <p className="text-sm text-gray-500">{apt.practitioner}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-900 dark:text-white">{new Date(apt.startTime).toLocaleDateString('fr-FR')}</p>
                                            <span className={`badge ${apt.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{apt.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Aucun rendez-vous</p>
                        )}
                    </div>
                )}

                {activeTab === 'records' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Dossier médical</h3>
                        {patient.recentRecords?.length > 0 ? (
                            <div className="space-y-4">
                                {patient.recentRecords.map(record => (
                                    <div key={record.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                        <div className="flex justify-between mb-2">
                                            <span className="badge badge-info">{record.type}</span>
                                            <span className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-white">{record.complaint}</p>
                                        {record.diagnosis && <p className="text-gray-600 dark:text-gray-400 mt-1">Diagnostic: {record.diagnosis}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Aucun dossier médical</p>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Factures en attente</h3>
                        {patient.pendingInvoices?.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                {patient.pendingInvoices.map(inv => (
                                    <div key={inv.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{inv.number}</p>
                                            <p className="text-sm text-gray-500">{new Date(inv.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900 dark:text-white">{inv.balance.toFixed(2)} €</p>
                                            <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{inv.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Aucune facture en attente</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem = ({ label, value }) => (
    <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
);

export default PatientDetail;
