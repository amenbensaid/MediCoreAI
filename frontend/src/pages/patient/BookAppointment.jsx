import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const BookAppointment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedDoctor = searchParams.get('doctor');

    const [step, setStep] = useState(preselectedDoctor ? 2 : 1);
    const [practitioners, setPractitioners] = useState([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [appointmentType, setAppointmentType] = useState('Consultation');
    const [consultationMode, setConsultationMode] = useState('in-person');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) { navigate('/patient/login'); return; }
        setUser(JSON.parse(userData));
        fetchPractitioners();
    }, []);

    const fetchPractitioners = async () => {
        try {
            const res = await api.get('/public/practitioners');
            setPractitioners(res.data.data);
            if (preselectedDoctor) {
                const dr = res.data.data.find(p => p.id === preselectedDoctor);
                if (dr) setSelectedPractitioner(dr);
            }
        } catch (err) { console.error(err); }
    };

    const fetchSlots = async (date) => {
        if (!selectedPractitioner || !date) return;
        setSlotsLoading(true);
        try {
            const res = await api.get('/public/available-slots', {
                params: { practitionerId: selectedPractitioner.id, date }
            });
            setSlots(res.data.data);
        } catch (err) { console.error(err); }
        finally { setSlotsLoading(false); }
    };

    const handleDateChange = (date) => { setSelectedDate(date); setSelectedSlot(''); fetchSlots(date); };

    const handleBook = async () => {
        setLoading(true); setError('');
        try {
            const token = localStorage.getItem('patient-token');
            const res = await api.post('/public/book-appointment', {
                practitionerId: selectedPractitioner.id, date: selectedDate,
                time: selectedSlot, appointmentType, notes, consultationMode
            }, { headers: { Authorization: `Bearer ${token}` } });
            setBookingResult(res.data);
            setSuccess(true);
        } catch (err) { setError(err.response?.data?.message || 'Booking failed'); }
        finally { setLoading(false); }
    };

    const today = new Date().toISOString().split('T')[0];
    const fee = selectedPractitioner?.consultationFee || 50;
    const isOnline = consultationMode === 'online';
    const policy = selectedPractitioner?.paymentPolicy || 'full-onsite';
    const deposit = policy === 'deposit-30' ? Math.round(fee * 0.3 * 100) / 100 : 0;

    // ── Success Screen ──
    if (success) {
        const apt = bookingResult?.data;
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Appointment Booked!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{bookingResult?.message}</p>

                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
                        <p className="text-lg font-bold text-primary-500">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">at {selectedSlot}</p>
                        <p className="text-sm text-gray-500 mt-1">{selectedPractitioner?.name} • {consultationMode === 'online' ? '🖥️ Online' : '🏥 In-person'}</p>
                    </div>

                    {apt?.meet_link && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">📹 Google Meet Link</p>
                            <a href={apt.meet_link} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline text-sm break-all">{apt.meet_link}</a>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Link to="/patient/portal" className="flex-1 btn-secondary">My Appointments</Link>
                        <button onClick={() => { setSuccess(false); setStep(1); setSelectedPractitioner(null); setSelectedDate(''); setSelectedSlot(''); setBookingResult(null); }}
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

            {/* Progress */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex gap-2 mb-8">
                    {[1,2,3].map(s => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
                {/* ── Step 1: Choose Practitioner ── */}
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose a Practitioner</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Select the doctor you'd like to see</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {practitioners.map(p => (
                                <button key={p.id} onClick={() => { setSelectedPractitioner(p); setStep(2); }}
                                    className={`p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                                        selectedPractitioner?.id === p.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-medical-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                            {p.firstName?.[0]}{p.lastName?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{p.specialty}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm font-medium text-primary-500">€{p.consultationFee}</span>
                                                {p.acceptsOnline && <span className="text-xs text-green-500">• Online available</span>}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {practitioners.length === 0 && <div className="text-center py-12 text-gray-500">Loading...</div>}
                    </div>
                )}

                {/* ── Step 2: Date, Time, Mode ── */}
                {step === 2 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Date & Time</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Booking with <span className="font-medium text-primary-500">{selectedPractitioner?.name}</span>
                        </p>

                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Left: Options */}
                            <div className="space-y-4">
                                {/* Mode Toggle */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Consultation Mode</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setConsultationMode('in-person')}
                                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                                                consultationMode === 'in-person' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-slate-700'
                                            }`}>
                                            <span className="text-2xl mb-1 block">🏥</span>
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">In-Person</span>
                                            <p className="text-xs text-gray-500 mt-1">Visit the clinic</p>
                                        </button>
                                        {selectedPractitioner?.acceptsOnline && (
                                            <button onClick={() => setConsultationMode('online')}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${
                                                    consultationMode === 'online' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-slate-700'
                                                }`}>
                                                <span className="text-2xl mb-1 block">🖥️</span>
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">Online</span>
                                                <p className="text-xs text-gray-500 mt-1">Google Meet</p>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Date & Type */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Date</label>
                                        <input type="date" min={today} value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
                                            className="input-field text-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Appointment Type</label>
                                        <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} className="input-field">
                                            <option value="Consultation">Consultation</option>
                                            <option value="Follow-up">Follow-up</option>
                                            <option value="Check-up">Check-up</option>
                                            <option value="Emergency">Emergency</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (optional)</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={3}
                                            placeholder="Describe your symptoms or reason for visit..." />
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">💳 Payment Summary</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Consultation fee</span>
                                            <span className="font-medium text-gray-900 dark:text-white">€{fee}</span>
                                        </div>
                                        {isOnline ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Payment</span>
                                                <span className="font-medium text-green-600">100% in advance</span>
                                            </div>
                                        ) : policy === 'deposit-30' ? (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Deposit now (30%)</span>
                                                    <span className="font-medium text-primary-500">€{deposit}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Remaining on-site</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">€{(fee - deposit).toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Payment</span>
                                                <span className="font-medium text-gray-900 dark:text-white">Full payment on-site</span>
                                            </div>
                                        )}
                                        {isOnline && (
                                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                                                ℹ️ Online appointments are fully refundable upon cancellation
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Time Slots */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Time Slots</label>
                                {!selectedDate ? (
                                    <div className="text-center py-12">
                                        <span className="text-4xl mb-3 block">📅</span>
                                        <p className="text-gray-400 dark:text-gray-500">Select a date first</p>
                                    </div>
                                ) : slotsLoading ? (
                                    <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                                        {slots.map(slot => (
                                            <button key={slot.time} disabled={!slot.available}
                                                onClick={() => setSelectedSlot(slot.time)}
                                                className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                                                    !slot.available
                                                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed line-through'
                                                        : selectedSlot === slot.time
                                                            ? 'bg-primary-500 text-white shadow-lg scale-105'
                                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
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

                {/* ── Step 3: Confirm ── */}
                {step === 3 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm Appointment</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Review your booking details</p>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-lg mx-auto">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-medical-500 flex items-center justify-center text-white text-lg font-bold">
                                        {selectedPractitioner?.firstName?.[0]}{selectedPractitioner?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{selectedPractitioner?.name}</p>
                                        <p className="text-sm text-gray-500">{selectedPractitioner?.specialty}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <InfoItem label="Date" value={new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })} />
                                    <InfoItem label="Time" value={selectedSlot} />
                                    <InfoItem label="Type" value={appointmentType} />
                                    <InfoItem label="Mode" value={isOnline ? '🖥️ Online (Google Meet)' : '🏥 In-person'} />
                                    <InfoItem label="Duration" value="30 minutes" />
                                    <InfoItem label="Fee" value={`€${fee}`} />
                                </div>

                                {/* Payment box */}
                                <div className={`rounded-xl p-4 ${isOnline ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-700'}`}>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {isOnline ? '💳 Payment: €' + fee + ' charged now' :
                                         policy === 'deposit-30' ? '💳 Deposit: €' + deposit + ' charged now (30%)' :
                                         '💳 Payment: Full payment on-site (€' + fee + ')'}
                                    </p>
                                    {isOnline && <p className="text-xs text-blue-600 dark:text-blue-400">Refundable if cancelled</p>}
                                    {policy === 'deposit-30' && !isOnline && <p className="text-xs text-gray-500">Remaining €{(fee-deposit).toFixed(2)} due at appointment</p>}
                                </div>

                                {notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p></div>}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm">{error}</div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(2)} className="flex-1 btn-secondary">Back</button>
                                <button onClick={handleBook} disabled={loading}
                                    className="flex-1 btn-primary flex items-center justify-center gap-2">
                                    {loading ? (<><div className="spinner" />Booking...</>) :
                                     isOnline ? `Pay €${fee} & Book` :
                                     policy === 'deposit-30' ? `Pay €${deposit} & Book` :
                                     '✓ Confirm Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const InfoItem = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="font-medium text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
);

export default BookAppointment;
