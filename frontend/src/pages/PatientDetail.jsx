import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);

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

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this patient?')) return;
        try {
            await api.delete(`/patients/${id}`);
            navigate('/patients');
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert('Failed to delete patient');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
    }

    if (!patient) {
        return <div className="text-center py-16 text-gray-500">Patient non trouvé</div>;
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📋' },
        { id: 'appointments', name: 'Appointments', icon: '📅' },
        { id: 'records', name: 'Medical Records', icon: '🏥' },
        { id: 'invoices', name: 'Billing', icon: '💳' },
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
                <button onClick={() => setShowEditModal(true)} className="btn-secondary">Edit</button>
                <Link to="/appointments" className="btn-primary">New Appointment</Link>
                <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete patient">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Patient Card */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoItem label="Email" value={patient.email || '-'} />
                        <InfoItem label="Phone" value={patient.phone || '-'} />
                        <InfoItem label="Date of Birth" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-US') : '-'} />
                        <InfoItem label="Address" value={patient.address || '-'} />
                        <InfoItem label="City" value={patient.city || '-'} />
                        <InfoItem label="Blood Type" value={patient.bloodType || '-'} />
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
                                <p className="text-gray-500">No known allergies</p>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Chronic Conditions</h3>
                            {patient.chronicConditions?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {patient.chronicConditions.map((condition, i) => (
                                        <span key={i} className="badge badge-warning">{condition}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No chronic conditions</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                            <p className="text-gray-600 dark:text-gray-400">{patient.notes || 'No notes'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Appointment History</h3>
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
                        <h3 className="font-semibold text-gray-900 dark:text-white">Medical Records</h3>
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
                        <h3 className="font-semibold text-gray-900 dark:text-white">Pending Invoices</h3>
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
