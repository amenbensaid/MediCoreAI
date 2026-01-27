import { useState, useEffect } from 'react';
import api from '../services/api';

const Appointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const today = new Date();
            const startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endDate = new Date(today.setDate(today.getDate() + 30)).toISOString();

            const response = await api.get('/appointments', { params: { startDate, endDate } });
            setAppointments(response.data.data.appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'badge-info',
            confirmed: 'badge-success',
            in_progress: 'badge-warning',
            completed: 'badge-neutral',
            cancelled: 'badge-danger',
            no_show: 'badge-danger'
        };
        const labels = {
            scheduled: 'Planifié',
            confirmed: 'Confirmé',
            in_progress: 'En cours',
            completed: 'Terminé',
            cancelled: 'Annulé',
            no_show: 'Absent'
        };
        return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
    };

    const filteredAppointments = filter === 'all'
        ? appointments
        : appointments.filter(a => a.status === filter);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rendez-vous</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{appointments.length} rendez-vous à venir</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nouveau RDV
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}
                    >
                        {status === 'all' ? 'Tous' : status === 'scheduled' ? 'Planifiés' : status === 'confirmed' ? 'Confirmés' : status === 'completed' ? 'Terminés' : 'Annulés'}
                    </button>
                ))}
            </div>

            {/* Appointments List */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucun rendez-vous</h3>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-dark-700">
                        {filteredAppointments.map(apt => (
                            <div key={apt.id} className="p-6 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center">
                                            <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                                {apt.patient?.firstName?.[0]}{apt.patient?.lastName?.[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{apt.patient?.fullName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{apt.type}</p>
                                            {apt.practitioner && (
                                                <p className="text-sm text-primary-500">{apt.practitioner.fullName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {new Date(apt.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className="text-lg font-semibold text-primary-500">
                                                {new Date(apt.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(apt.status)}
                                            <div className="flex gap-2">
                                                <button className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Appointment Modal */}
            {showModal && <AddAppointmentModal onClose={() => setShowModal(false)} onSuccess={fetchAppointments} />}
        </div>
    );
};

const AddAppointmentModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({ patientId: '', appointmentType: '', startTime: '', endTime: '', notes: '' });
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/patients?limit=100').then(res => setPatients(res.data.data.patients));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/appointments', formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating appointment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau Rendez-vous</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient</label>
                        <select value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                            className="input-field" required>
                            <option value="">Sélectionner un patient</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de consultation</label>
                        <select value={formData.appointmentType} onChange={e => setFormData({ ...formData, appointmentType: e.target.value })}
                            className="input-field" required>
                            <option value="">Sélectionner</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Suivi">Suivi</option>
                            <option value="Urgence">Urgence</option>
                            <option value="Contrôle">Contrôle</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Début</label>
                            <input type="datetime-local" value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin</label>
                            <input type="datetime-local" value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="input-field" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="input-field" rows={3} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary">
                            {loading ? 'Création...' : 'Créer RDV'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Appointments;
