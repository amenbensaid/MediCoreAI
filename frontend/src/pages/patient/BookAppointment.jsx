import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import PublicNavbar from '../../components/PublicNavbar';
import Container from '../../components/ui/Container';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getAssetUrl } from '../../utils/assets';
import Avatar from '../../components/ui/Avatar';

const illnessOptionsByDomain = {
    dental: ['Douleur dentaire', 'Contrôle', 'Détartrage', 'Carie', 'Orthodontie', 'Urgence dentaire'],
    aesthetic: ['Consultation esthétique', 'Injection', 'Soin peau', 'Suivi traitement', 'Laser', 'Avis médical'],
    veterinary: ['Vaccination', 'Douleur ou blessure', 'Contrôle', 'Urgence', 'Suivi traitement', 'Comportement'],
    default: ['Douleur', 'Fièvre', 'Contrôle', 'Suivi traitement', 'Bilan', 'Urgence']
};

const getIllnessOptions = (practitioner) => {
    const source = `${practitioner?.specialty || ''} ${practitioner?.clinicType || ''}`.toLowerCase();
    if (source.includes('dent')) return illnessOptionsByDomain.dental;
    if (source.includes('esth') || source.includes('derm') || source.includes('skin')) return illnessOptionsByDomain.aesthetic;
    if (source.includes('vét') || source.includes('vet')) return illnessOptionsByDomain.veterinary;
    return illnessOptionsByDomain.default;
};

const BookAppointment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedDoctor = searchParams.get('doctor');

    const [step, setStep] = useState(preselectedDoctor ? 2 : 1);
    const [practitioners, setPractitioners] = useState([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [appointmentType, setAppointmentType] = useState('Consultation');
    const [consultationMode, setConsultationMode] = useState('in-person');
    const [slotsMeta, setSlotsMeta] = useState(null);
    const [notes, setNotes] = useState('');
    const [reasonCategory, setReasonCategory] = useState('');
    const [reasonDetail, setReasonDetail] = useState('');
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [user, setUser] = useState(null);
    
    // Nouveaux états pour une meilleure expérience
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) { navigate('/patient/login'); return; }
        setUser(JSON.parse(userData));
        fetchPractitioners();
    }, []);

    useEffect(() => {
        if (selectedPractitioner) {
            fetchAppointmentTypes(selectedPractitioner.id);
            const calendar = selectedPractitioner.calendar;
            const supportsInPerson = calendar?.sessions?.some((session) => session.enabled && ['both', 'in-person'].includes(session.mode)) ?? true;
            const supportsOnline = Boolean(selectedPractitioner.acceptsOnline && calendar?.sessions?.some((session) => session.enabled && ['both', 'online'].includes(session.mode)));
            if (!supportsInPerson && supportsOnline) {
                setConsultationMode('online');
            } else {
                setConsultationMode('in-person');
            }
            setSelectedDate('');
            setSelectedSlot('');
            setReasonCategory('');
            setReasonDetail('');
            setSlots([]);
        }
    }, [selectedPractitioner]);

    useEffect(() => {
        if (selectedDate) {
            fetchSlots(selectedDate);
        }
    }, [selectedDate, consultationMode, appointmentType]);

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

    // Obtenir les spécialités uniques pour le filtrage
    const getSpecialties = () => {
        const specialties = [...new Set(practitioners.map(p => p.specialty).filter(Boolean))];
        return ['all', ...specialties.sort()];
    };

    // Filtrer les médecins selon recherche et spécialité
    const filteredPractitioners = practitioners.filter(practitioner => {
        const matchesSearch = practitioner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            practitioner.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpecialty = selectedSpecialty === 'all' || practitioner.specialty === selectedSpecialty;
        return matchesSearch && matchesSpecialty;
    });

    // Obtenir les créneaux disponibles pour une semaine
    const getWeeklyAvailability = async (practitionerId, startDate) => {
        const weeklySlots = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            try {
                const res = await api.get('/public/available-slots', {
                    params: { practitionerId, date: dateStr }
                });
                const availableSlots = res.data.data.filter(slot => slot.available);
                if (availableSlots.length > 0) {
                    weeklySlots.push({
                        date: dateStr,
                        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
                        slots: availableSlots
                    });
                }
            } catch (err) {
                console.error(`Error fetching slots for ${dateStr}:`, err);
            }
        }
        return weeklySlots;
    };

    const fetchAppointmentTypes = async (practitionerId) => {
        try {
            const res = await api.get('/public/appointment-types', {
                params: { practitionerId }
            });
            const nextTypes = res.data.data || [];
            setAppointmentTypes(nextTypes);

            if (nextTypes.length > 0) {
                setAppointmentType((current) =>
                    nextTypes.find((t) => t.name === current) ? current : nextTypes[0].name
                );
            }
        } catch (err) { console.error(err); }
    };

    const fetchSlots = async (date) => {
        setSlotsLoading(true);
        try {
            const res = await api.get('/public/available-slots', {
                params: {
                    practitionerId: selectedPractitioner.id,
                    date,
                    consultationMode
                }
            });
            setSlots(res.data.data);
            setSlotsMeta(res.data.meta || null);
        } catch (err) { console.error(err); }
        finally { setSlotsLoading(false); }
    };

    const handleDateChange = (date) => { setSelectedDate(date); setSelectedSlot(''); };

    // Variables pour le calcul des frais
    const fee = selectedPractitioner?.consultationFee || 50;
    const policy = selectedPractitioner?.paymentPolicy || 'full-onsite';
    const deposit = policy === 'deposit-30' ? fee * 0.3 : 0;
    const isOnline = consultationMode === 'online';
    const today = new Date().toISOString().split('T')[0];
    const selectedTypeConfig = appointmentTypes.find(t => t.name === appointmentType);
    const calendarSettings = selectedPractitioner?.calendar || {};
    const durationMinutes = slots.find((slot) => slot.time === selectedSlot)?.durationMinutes || calendarSettings.defaultDurationMinutes || 30;
    const supportsInPerson = calendarSettings.sessions?.some((session) => session.enabled && ['both', 'in-person'].includes(session.mode)) ?? true;
    const supportsOnline = Boolean(selectedPractitioner?.acceptsOnline && calendarSettings.sessions?.some((session) => session.enabled && ['both', 'online'].includes(session.mode)));
    const availableModeOptions = [
        supportsInPerson && { value: 'in-person', title: 'Présentiel', description: 'Au cabinet' },
        supportsOnline && { value: 'online', title: 'En ligne', description: 'Jitsi après validation' }
    ].filter(Boolean);
    const illnessOptions = getIllnessOptions(selectedPractitioner);

    const handleBook = async () => {
        setLoading(true); setError('');
        try {
            const token = localStorage.getItem('patient-token');
            const selectedType = appointmentTypes.find((item) => item.name === appointmentType);
            const res = await api.post('/public/book-appointment', {
                practitionerId: selectedPractitioner.id, date: selectedDate,
                time: selectedSlot, appointmentType, serviceId: selectedType?.id, notes, consultationMode,
                reasonCategory: reasonCategory === 'Autre' ? 'Autre' : reasonCategory,
                reasonDetail: reasonCategory === 'Autre' ? reasonDetail : reasonCategory
            }, { headers: { Authorization: `Bearer ${token}` } });
            setBookingResult(res.data);
            setSuccess(true);
        } catch (err) { setError(err.response?.data?.message || 'Booking failed'); }
        finally { setLoading(false); }
    };

    // ── Success Screen ──
    if (success) {
        const apt = bookingResult?.data;
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <PublicNavbar />
                <Container className="py-14">
                    <div className="mx-auto max-w-md text-center fade-in-soft">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900">
                            {apt?.consultation_mode === 'online' || consultationMode === 'online' ? 'Demande envoyée !' : 'RDV Confirmé !'}
                        </h2>
                        <p className="mt-2 text-slate-600">{bookingResult?.message}</p>

                        <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm">
                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>Date</span>
                                    <span className="font-semibold text-slate-900">{new Date(apt?.start_time || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Heure</span>
                                    <span className="font-semibold text-slate-900">{new Date(apt?.start_time || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Médecin</span>
                                    <span className="font-semibold text-slate-900">{apt?.practitioner_name || selectedPractitioner?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Mode</span>
                                    <span className="font-semibold text-slate-900">{apt?.consultation_mode === 'online' ? 'En ligne' : 'Présentiel'}</span>
                                </div>
                                {apt?.consultation_mode === 'online' && (
                                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                                        ℹ️ Le lien Jitsi Meet sera visible après validation médecin.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <Button variant="blue" onClick={() => navigate('/patient/appointments')} className="w-full !px-6 !py-3">
                                Voir mes rendez-vous
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/patient/book')} className="w-full !px-6 !py-3">
                                Nouveau rendez-vous
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <PublicNavbar />
            <main className="fade-in-soft">
                <Container className="max-w-6xl py-8 sm:py-10">
                {/* ── Step 1: Choose Practitioner ── */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Réservation</p>
                                    <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Choisir un praticien</h2>
                                    <p className="mt-2 max-w-2xl text-slate-600">
                                        Recherchez par nom ou spécialité, puis sélectionnez le médecin pour voir ses disponibilités.
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 text-xs font-bold text-slate-500">
                                    <span className="rounded-xl bg-blue-600 px-3 py-2 text-center text-white">1 Médecin</span>
                                    <span className="px-3 py-2 text-center">2 Créneau</span>
                                    <span className="px-3 py-2 text-center">3 Confirmation</span>
                                </div>
                            </div>
                        </div>

                        {/* Filtres et recherche */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            {/* Barre de recherche */}
                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom ou spécialité..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            {/* Filtres par spécialité et vue */}
                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                {/* Filtres de spécialité */}
                                <div className="flex flex-wrap gap-2">
                                    {getSpecialties().map(specialty => (
                                        <button
                                            key={specialty}
                                            onClick={() => setSelectedSpecialty(specialty)}
                                            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                selectedSpecialty === specialty
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                            }`}
                                        >
                                            {specialty === 'all' ? 'Toutes spécialités' : specialty}
                                        </button>
                                    ))}
                                </div>

                                {/* Changement de vue */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition ${
                                            viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition ${
                                            viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Résultats de recherche */}
                        <div>
                            <p className="text-sm text-slate-500">
                                {filteredPractitioners.length} praticien{filteredPractitioners.length !== 1 ? 's' : ''} trouvé{filteredPractitioners.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Liste des médecins */}
                        {filteredPractitioners.length > 0 ? (
                            <div className={viewMode === 'grid' ? 'grid gap-4 lg:grid-cols-2' : 'space-y-4'}>
                                {filteredPractitioners.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => { setSelectedPractitioner(p); setStep(2); }}
                                        className={`group cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg ${
                                            selectedPractitioner?.id === p.id ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex gap-4">
                                            <Avatar
                                                src={p.avatarUrl}
                                                firstName={p.firstName}
                                                lastName={p.lastName}
                                                name={p.name}
                                                alt={`Photo de ${p.name}`}
                                                size="lg"
                                                radius="xl"
                                                className="h-20 w-20 ring-2 ring-slate-100"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-lg font-extrabold text-slate-900 transition-colors group-hover:text-blue-600">
                                                    {p.name}
                                                        </h3>
                                                        <p className="text-sm font-semibold text-blue-600">{p.specialty}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                        Disponible
                                                    </div>
                                                </div>

                                                <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                                                    {p.bio || 'Professionnel de santé disponible pour vous accompagner.'}
                                                </p>

                                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                                                    <span className="rounded-xl bg-slate-50 px-3 py-2 font-bold text-slate-900">€{p.consultationFee}</span>
                                                    <span className="rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                                                        {p.calendar?.defaultDurationMinutes || 30} min
                                                    </span>
                                                    {p.acceptsOnline && (
                                                        <span className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-700">En ligne</span>
                                                    )}
                                                    <span className="ml-auto flex items-center gap-1 font-semibold text-slate-700">
                                                        <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                                        </svg>
                                                        {p.ratingAvg ? p.ratingAvg.toFixed(1) : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun praticien trouvé</h3>
                                <p className="text-slate-500">Essayez d'ajuster vos filtres ou votre recherche</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 2: Date, Time, Mode ── */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Disponibilités</p>
                                    <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Date et créneau</h2>
                                    <p className="mt-2 text-slate-600">
                                        Réservation avec <span className="font-bold text-blue-600">{selectedPractitioner?.name}</span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 text-xs font-bold text-slate-500">
                                    <button onClick={() => setStep(1)} className="rounded-xl px-3 py-2 text-center hover:bg-white">1 Médecin</button>
                                    <span className="rounded-xl bg-blue-600 px-3 py-2 text-center text-white">2 Créneau</span>
                                    <span className="px-3 py-2 text-center">3 Confirmation</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                            {/* Carte du médecin */}
                            <aside>
                                <Card className="sticky top-24 border-slate-100 p-5">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={selectedPractitioner?.avatarUrl}
                                            firstName={selectedPractitioner?.firstName}
                                            lastName={selectedPractitioner?.lastName}
                                            name={selectedPractitioner?.name}
                                            alt={`Photo de ${selectedPractitioner?.name || 'médecin'}`}
                                            size="lg"
                                            radius="xl"
                                            className="h-20 w-20 ring-2 ring-slate-100"
                                        />
                                        <div className="min-w-0">
                                            <h3 className="text-xl font-extrabold text-slate-950">{selectedPractitioner?.name}</h3>
                                            <p className="text-sm font-semibold text-blue-600">{selectedPractitioner?.specialty}</p>
                                            <button onClick={() => setStep(1)} className="mt-2 text-xs font-bold text-slate-500 hover:text-blue-600">
                                                Changer de praticien
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-5 space-y-3 text-sm">
                                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                            <span className="text-slate-600">Tarif</span>
                                            <span className="font-bold text-slate-900">€{selectedPractitioner?.consultationFee}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                            <span className="text-slate-600">Durée</span>
                                            <span className="font-semibold text-slate-700">{durationMinutes} min</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                                            <span className="text-emerald-700">Modes</span>
                                            <span className="font-semibold text-emerald-700">
                                                {supportsInPerson && supportsOnline ? 'Deux modes' : supportsOnline ? 'En ligne' : 'Présentiel'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                                        Les créneaux affichés respectent les séances configurées par le médecin.
                                    </div>
                                </Card>
                            </aside>

                            {/* Date & Time Selection */}
                            <div className="grid gap-5 xl:grid-cols-2">
                                <Card className="border-slate-100 p-5">
                                    <label className="mb-3 block text-sm font-bold text-slate-700">Mode de consultation</label>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {availableModeOptions.map((mode) => (
                                            <button
                                                key={mode.value}
                                                type="button"
                                                onClick={() => { setConsultationMode(mode.value); setSelectedSlot(''); }}
                                                className={`rounded-2xl border p-4 text-left transition-all ${
                                                    consultationMode === mode.value
                                                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                                }`}
                                            >
                                                <p className="font-extrabold">{mode.title}</p>
                                                <p className="mt-1 text-sm">{mode.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                    {availableModeOptions.length === 0 && (
                                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                                            Aucun mode n&apos;est disponible dans les séances configurées par ce médecin.
                                        </p>
                                    )}
                                </Card>

                                {/* Date Selection */}
                                <Card className="border-slate-100 p-5">
                                    <div className="mb-4">
                                        <label className="mb-3 block text-sm font-bold text-slate-700">Date de consultation</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="date" 
                                                min={new Date().toISOString().split('T')[0]} 
                                                value={selectedDate} 
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" 
                                            />
                                            <button
                                                onClick={() => setShowCalendar(!showCalendar)}
                                                className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 transition"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick date selection */}
                                    <div className="flex flex-wrap gap-2">
                                        {['Aujourd\'hui', 'Demain', 'Cette semaine', 'La semaine prochaine'].map((label, index) => {
                                            const date = new Date();
                                            if (index === 1) date.setDate(date.getDate() + 1);
                                            else if (index === 2) date.setDate(date.getDate() + 7);
                                            else if (index === 3) date.setDate(date.getDate() + 14);
                                            
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => handleDateChange(date.toISOString().split('T')[0])}
                                                    className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition"
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Card>

                                {/* Time Slots */}
                                <Card className="border-slate-100 p-5 xl:col-span-2">
                                    <div className="mb-4">
                                        <label className="mb-3 block text-sm font-bold text-slate-700">Créneaux disponibles</label>
                                        {selectedDate && (
                                            <p className="text-sm text-slate-500">
                                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { 
                                                    weekday: 'long', 
                                                    day: 'numeric', 
                                                    month: 'long' 
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    {!selectedDate ? (
                                        <div className="text-center py-12">
                                            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500">Choisissez une date pour voir les créneaux disponibles</p>
                                        </div>
                                    ) : slotsLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="spinner" />
                                        </div>
                                    ) : slots.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500">Aucun créneau disponible pour cette date et ce mode</p>
                                            <p className="mt-2 text-xs text-slate-400">
                                                Les séances sont définies par le médecin dans son calendrier.
                                            </p>
                                            <button
                                                onClick={() => setShowCalendar(true)}
                                                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                                            >
                                                Voir d'autres dates
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Morning slots */}
                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    Matin
                                                </h4>
                                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                                                    {slots.filter(slot => {
                                                        const hour = parseInt(slot.time.split(':')[0]);
                                                        return hour >= 8 && hour < 12;
                                                    }).map(slot => (
                                                        <button key={slot.time} disabled={!slot.available}
                                                            onClick={() => setSelectedSlot(slot.time)}
                                                            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-all ${
                                                                !slot.available
                                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                                                                    : selectedSlot === slot.time
                                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200'
                                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                                                            }`}>
                                                            {slot.time}
                                                            <span className="mt-0.5 block text-[10px] font-medium opacity-70">{slot.endTime}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Afternoon slots */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                    </svg>
                                                    Après-midi
                                                </h4>
                                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                                                    {slots.filter(slot => {
                                                        const hour = parseInt(slot.time.split(':')[0]);
                                                        return hour >= 12 && hour < 18;
                                                    }).map(slot => (
                                                        <button key={slot.time} disabled={!slot.available}
                                                            onClick={() => setSelectedSlot(slot.time)}
                                                            className={`rounded-xl border px-3 py-3 text-sm font-bold transition-all ${
                                                                !slot.available
                                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                                                                    : selectedSlot === slot.time
                                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200'
                                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                                                            }`}>
                                                            {slot.time}
                                                            <span className="mt-0.5 block text-[10px] font-medium opacity-70">{slot.endTime}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {/* Appointment Type & Notes */}
                                <Card className="space-y-4 border-slate-100 p-5 xl:col-span-2">
                                    <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Type de consultation</label>
                                        <select 
                                            value={appointmentType} 
                                            onChange={(e) => setAppointmentType(e.target.value)} 
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        >
                                            {appointmentTypes.length > 0 ? appointmentTypes.map((type) => (
                                                <option key={type.id} value={type.name}>
                                                    {type.name}
                                                </option>
                                            )) : (
                                                <>
                                                    <option value="Consultation">Consultation</option>
                                                    <option value="Follow-up">Suivi</option>
                                                    <option value="Check-up">Bilan</option>
                                                    <option value="Emergency">Urgence</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Motif / type de maladie</label>
                                        <select
                                            value={reasonCategory}
                                            onChange={(e) => {
                                                setReasonCategory(e.target.value);
                                                if (e.target.value !== 'Autre') setReasonDetail('');
                                            }}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        >
                                            <option value="">Sélectionner un motif</option>
                                            {illnessOptions.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                            <option value="Autre">Autre</option>
                                        </select>
                                    </div>
                                    </div>
                                    {reasonCategory === 'Autre' && (
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">Précisez le motif</label>
                                            <input
                                                value={reasonDetail}
                                                onChange={(e) => setReasonDetail(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                                placeholder="Décrivez brièvement votre motif..."
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">Notes (optionnel)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                            rows={3}
                                            placeholder="Décrivez vos symptômes ou besoins..."
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>

                        <div className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <Button variant="ghost" onClick={() => setStep(1)} className="!px-6 !py-3">Retour</Button>
                            <Button variant="blue" onClick={() => setStep(3)} disabled={!selectedDate || !selectedSlot} className="flex-1">
                                {selectedDate && selectedSlot ? `Continuer avec ${selectedSlot}` : 'Choisissez une date et un créneau'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 3 && (
                    <div>
                        <div className="mb-8">
                            <h2 className="mb-2 text-3xl font-extrabold text-slate-950">3. Confirmation</h2>
                            <p className="text-slate-600">Vérifiez les détails avant de confirmer votre rendez-vous.</p>
                        </div>

                        <div className="mx-auto max-w-2xl">
                            <Card className="border-slate-100 p-8">
                            <div className="space-y-6">
                                {/* Médecin sélectionné */}
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-xl font-extrabold text-white overflow-hidden shadow-lg">
                                        {selectedPractitioner?.avatarUrl ? (
                                            <img src={getAssetUrl(selectedPractitioner.avatarUrl)} alt={selectedPractitioner.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{selectedPractitioner?.firstName?.[0]}{selectedPractitioner?.lastName?.[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-extrabold text-slate-950">{selectedPractitioner?.name}</p>
                                        <p className="text-sm font-semibold text-blue-600">{selectedPractitioner?.specialty}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                            </svg>
                                            <span className="text-sm font-semibold text-slate-700">
                                                {selectedPractitioner?.ratingAvg ? selectedPractitioner.ratingAvg.toFixed(1) : 'N/A'}
                                            </span>
                                            <span className="text-sm text-slate-500">
                                                ({selectedPractitioner?.reviewsCount || 0} avis)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Détails du rendez-vous */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-semibold">Date</p>
                                                <p className="font-bold text-slate-900">
                                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { 
                                                        weekday: 'long', 
                                                        day: 'numeric', 
                                                        month: 'long', 
                                                        year: 'numeric' 
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-green-600 font-semibold">Heure</p>
                                                <p className="font-bold text-slate-900">{selectedSlot}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-purple-600 font-semibold">Type de consultation</p>
                                                <p className="font-bold text-slate-900">{appointmentType}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-cyan-50 rounded-xl">
                                            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h4m5-8V6a2 2 0 00-2-2H8L4 8v10a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-cyan-600 font-semibold">Motif</p>
                                                <p className="font-bold text-slate-900">
                                                    {reasonCategory === 'Autre' ? reasonDetail || 'Autre' : reasonCategory || 'Non précisé'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                                            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center text-white">
                                                {isOnline ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 5h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-amber-600 font-semibold">Mode</p>
                                                <p className="font-bold text-slate-900">
                                                    {isOnline ? 'Consultation en ligne' : 'Consultation présentiel'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Informations supplémentaires */}
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Durée estimée</p>
                                        <p className="font-semibold text-slate-700">{durationMinutes} minutes</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Tarif</p>
                                        <p className="font-bold text-slate-900">€{selectedPractitioner?.consultationFee || 50}</p>
                                    </div>
                                </div>

                                {/* Notes du patient */}
                                {notes && (
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-500 mb-2 font-semibold">Notes pour le médecin</p>
                                        <p className="text-sm text-slate-700 italic">"{notes}"</p>
                                    </div>
                                )}

                                {/* Informations de paiement */}
                                <div className={`rounded-2xl border p-6 ${
                                    isOnline 
                                        ? 'border-blue-200 bg-blue-50' 
                                        : 'border-slate-200 bg-slate-50'
                                }`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        <h4 className="font-bold text-slate-900">Informations de paiement</h4>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Tarif de la consultation</span>
                                            <span className="font-bold text-slate-900">€{selectedPractitioner?.consultationFee || 50}</span>
                                        </div>
                                        
                                        {isOnline ? (
                                            <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg">
                                                <span className="text-blue-700 font-semibold">Paiement en ligne</span>
                                                <span className="text-blue-700 font-bold">100% à l'avance</span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
                                                <span className="text-slate-700 font-semibold">Paiement sur place</span>
                                                <span className="text-slate-700">Au moment du rendez-vous</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isOnline && (
                                        <p className="mt-3 text-xs text-blue-700 bg-blue-100 p-3 rounded-lg">
                                            💡 Le lien Jitsi Meet sera généré et envoyé après confirmation du rendez-vous par le médecin.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 !px-6 !py-3">
                                    Retour
                                </Button>
                                <Button variant="blue" onClick={handleBook} disabled={loading} className="flex-1">
                                    {loading ? (
                                        <>
                                            <span className="spinner" />
                                            Confirmation...
                                        </>
                                    ) : (
                                        'Confirmer le RDV'
                                    )}
                                </Button>
                            </div>
                            </Card>
                        </div>
                    </div>
                )}
                </Container>
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
