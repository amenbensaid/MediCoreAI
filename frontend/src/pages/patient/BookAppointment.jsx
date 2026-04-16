import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BookAppointment = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=practitioner, 2=date/time, 3=confirm
    const [practitioners, setPractitioners] = useState([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [appointmentType, setAppointmentType] = useState('Consultation');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) {
            navigate('/patient/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchPractitioners();
    }, []);

    const fetchPractitioners = async () => {
        try {
            const res = await api.get('/public/practitioners');
            setPractitioners(res.data.data);
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const fetchSlots = async (date) => {
        if (!selectedPractitioner || !date) return;
        setSlotsLoading(true);
        try {
            const res = await api.get('/public/available-slots', {
                params: { practitionerId: selectedPractitioner.id, date }
            });
            setSlots(res.data.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedSlot('');
        fetchSlots(date);
    };

    const handleBook = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('patient-token');
            await api.post('/public/book-appointment', {
                practitionerId: selectedPractitioner.id,
                date: selectedDate,
                time: selectedSlot,
                appointmentType,
                notes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed');
        } finally {
            setLoading(false);
        }
    };

    // Get min date = today
    const today = new Date().toISOString().split('T')[0];

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Appointment Booked!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                        Your appointment with <span className="font-medium text-gray-900 dark:text-white">{selectedPractitioner.name}</span> has been confirmed.
                    </p>
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-6 inline-block">
                        <p className="text-lg font-bold text-primary-500">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">at {selectedSlot}</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/patient/portal" className="flex-1 btn-secondary">My Appointments</Link>
                        <button onClick={() => { setSuccess(false); setStep(1); setSelectedPractitioner(null); setSelectedDate(''); setSelectedSlot(''); }}
                            className="flex-1 btn-primary">Book Another</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/patient/portal" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Book Appointment</h1>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Step {step} of 3</span>
                </div>
            </header>

            {/* Progress bar */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
                {/* Step 1: Choose Practitioner */}
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose a Practitioner</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Select the doctor you'd like to see</p>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {practitioners.map(p => (
                                <button key={p.id}
                                    onClick={() => { setSelectedPractitioner(p); setStep(2); }}
                                    className={`p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                                        selectedPractitioner?.id === p.id
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-medical-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                            {p.name.split(' ').slice(1).map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{p.specialty}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {practitioners.length === 0 && (
                            <div className="text-center py-12 text-gray-500">Loading practitioners...</div>
                        )}
                    </div>
                )}

                {/* Step 2: Choose Date & Time */}
                {step === 2 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Date & Time</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Booking with <span className="font-medium text-primary-500">{selectedPractitioner?.name}</span>
                        </p>

                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Date picker */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Date</label>
                                <input type="date" min={today} value={selectedDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="input-field text-lg" />

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Appointment Type</label>
                                    <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}
                                        className="input-field">
                                        <option value="Consultation">Consultation</option>
                                        <option value="Follow-up">Follow-up</option>
                                        <option value="Check-up">Check-up</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (optional)</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                        className="input-field" rows={3} placeholder="Describe your symptoms or reason for visit..." />
                                </div>
                            </div>

                            {/* Time slots */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Time Slots</label>
                                {!selectedDate ? (
                                    <p className="text-gray-400 dark:text-gray-500 text-center py-8">Pick a date first</p>
                                ) : slotsLoading ? (
                                    <div className="flex items-center justify-center py-8"><div className="spinner" /></div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-y-auto">
                                        {slots.map(slot => (
                                            <button key={slot.time}
                                                disabled={!slot.available}
                                                onClick={() => setSelectedSlot(slot.time)}
                                                className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                                                    !slot.available
                                                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed line-through'
                                                        : selectedSlot === slot.time
                                                            ? 'bg-primary-500 text-white shadow-lg scale-105'
                                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600'
                                                }`}>
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                            <button onClick={() => setStep(3)} disabled={!selectedDate || !selectedSlot}
                                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                Continue to Confirmation
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm Appointment</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Review your booking details</p>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-lg mx-auto">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-medical-500 flex items-center justify-center text-white text-lg font-bold">
                                        {selectedPractitioner?.name.split(' ').slice(1).map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{selectedPractitioner?.name}</p>
                                        <p className="text-sm text-gray-500">{selectedPractitioner?.specialty}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedSlot}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{appointmentType}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                                        <p className="font-medium text-gray-900 dark:text-white">30 minutes</p>
                                    </div>
                                </div>

                                {notes && (
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(2)} className="flex-1 btn-secondary">Back</button>
                                <button onClick={handleBook} disabled={loading}
                                    className="flex-1 btn-primary flex items-center justify-center gap-2">
                                    {loading ? (<><div className="spinner" />Booking...</>) : '✓ Confirm Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BookAppointment;
