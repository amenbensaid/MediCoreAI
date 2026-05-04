import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import PublicNavbar from '../../components/PublicNavbar';
import Container from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../stores/languageStore';
import { getAssetUrl } from '../../utils/assets';

const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value, language, fallback) => {
    if (!value) return fallback;
    const parsed = new Date(`${value}T00:00:00`);
    return parsed.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

const DoctorProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language, t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [doctor, setDoctor] = useState(null);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [consultationMode, setConsultationMode] = useState('in-person');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingFeedback, setBookingFeedback] = useState({ type: '', message: '' });
    const [reviewForm, setReviewForm] = useState({ rating: 5, reviewText: '' });
    const [reviewSaving, setReviewSaving] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('patient-token');
                const headers = token
                    ? { Authorization: `Bearer ${token}` }
                    : {};
                const res = await api.get(`/public/practitioners/${id}`, { headers });
                setDoctor(res.data.data || null);
            } catch (e) {
                console.error('[DOCTOR_PROFILE] fetch error', {
                    practitionerId: id,
                    status: e.response?.status,
                    data: e.response?.data,
                    message: e.message
                });
                setDoctor(null);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [id]);

    const isPatientLoggedIn = useMemo(() => Boolean(localStorage.getItem('patient-token')), []);
    const rating = Number(doctor?.ratingAvg || 0);
    const reviews = Number(doctor?.reviewsCount || 0);
    const canSubmitReview = Boolean(doctor?.canReview || doctor?.patientReview);

    useEffect(() => {
        if (doctor?.patientReview) {
            setReviewForm({
                rating: Number(doctor.patientReview.rating || 5),
                reviewText: doctor.patientReview.reviewText || ''
            });
            return;
        }

        setReviewForm({ rating: 5, reviewText: '' });
    }, [doctor?.patientReview?.id, doctor?.patientReview?.rating, doctor?.patientReview?.reviewText]);

    useEffect(() => {
        const fetchAppointmentTypes = async () => {
            if (!doctor?.id) {
                setAppointmentTypes([]);
                setSelectedServiceId('');
                return;
            }

            try {
                const res = await api.get('/public/appointment-types', {
                    params: { practitionerId: doctor.id }
                });
                const nextTypes = res.data.data || [];
                setAppointmentTypes(nextTypes);
                setSelectedServiceId(nextTypes[0]?.id || '');
            } catch (error) {
                console.error(error);
                setAppointmentTypes([]);
                setSelectedServiceId('');
            }
        };

        fetchAppointmentTypes();
    }, [doctor?.id]);

    const selectedType = useMemo(
        () => appointmentTypes.find((item) => item.id === selectedServiceId) || null,
        [appointmentTypes, selectedServiceId]
    );

    const activeDuration = slots.find((slot) => slot.time === selectedSlot)?.durationMinutes || doctor?.calendar?.defaultDurationMinutes || selectedType?.durationMinutes || 30;
    const activePrice = selectedType?.price || doctor?.consultationFee || 50;
    const availableSlots = slots.filter((slot) => slot.available);
    const normalizeSpecialty = (specialty) => (
        specialty === 'General Practice' ? t('doctorProfile.defaultSpecialty') : specialty
    );

    const normalizeBio = (bio) => (
        !bio || bio === 'Experienced healthcare professional dedicated to patient care.'
            ? t('doctorProfile.defaultBio')
            : bio
    );

    const getReviewCountLabel = (count) => t(
        count === 1 ? 'doctorProfile.reviewCount' : 'doctorProfile.reviewCountPlural',
        { count }
    );

    const getPublishedReviewCountLabel = (count) => t(
        count === 1 ? 'doctorProfile.reviews.published' : 'doctorProfile.reviews.publishedPlural',
        { count }
    );

    const getAvailableSlotsLabel = (count) => t(
        count === 1 ? 'doctorProfile.booking.availableSlot' : 'doctorProfile.booking.availableSlotPlural',
        { count }
    );

    const fallbackTypeLabel = selectedType?.name || t('doctorProfile.booking.fallbackType');
    const paymentSummary = consultationMode === 'online'
        ? t('doctorProfile.payment.online')
        : doctor?.paymentPolicy === 'deposit-30'
            ? t('doctorProfile.payment.deposit')
            : t('doctorProfile.payment.onsite');

    useEffect(() => {
        const fetchSlots = async () => {
            if (!doctor?.id || !selectedDate) {
                setSlots([]);
                return;
            }

            setSlotsLoading(true);
            setSelectedSlot('');
            setBookingFeedback({ type: '', message: '' });

            try {
                const res = await api.get('/public/available-slots', {
                    params: {
                        practitionerId: doctor.id,
                        date: selectedDate,
                        serviceId: selectedServiceId || undefined,
                        consultationMode
                    }
                });
                setSlots(res.data.data || []);
            } catch (error) {
                console.error(error);
                setSlots([]);
                setBookingFeedback({
                    type: 'error',
                    message: t('doctorProfile.booking.loadingError')
                });
            } finally {
                setSlotsLoading(false);
            }
        };

        fetchSlots();
    }, [doctor?.id, selectedDate, selectedServiceId, consultationMode]);

    useEffect(() => {
        if (availableSlots.length === 0) {
            setSelectedSlot('');
            return;
        }

        setSelectedSlot((current) => (
            availableSlots.some((slot) => slot.time === current) ? current : availableSlots[0].time
        ));
    }, [availableSlots]);

    useEffect(() => {
        const supportsOnline = doctor?.acceptsOnline && doctor?.calendar?.sessions?.some((session) => session.enabled && ['both', 'online'].includes(session.mode));
        if (consultationMode === 'online' && !supportsOnline) {
            setConsultationMode('in-person');
        }
    }, [doctor?.acceptsOnline, doctor?.calendar, consultationMode]);

    const handleBooking = async () => {
        if (!doctor?.id || !selectedDate || !selectedSlot) {
            setBookingFeedback({
                type: 'error',
                message: t('doctorProfile.booking.chooseSlotError')
            });
            return;
        }

        if (!isPatientLoggedIn) {
            navigate(`/patient/login?redirect=${encodeURIComponent(`/doctors/${doctor.id}`)}`);
            return;
        }

        setBookingLoading(true);
        setBookingFeedback({ type: '', message: '' });

        try {
            const token = localStorage.getItem('patient-token');
            const res = await api.post(
                '/public/book-appointment',
                {
                    practitionerId: doctor.id,
                    date: selectedDate,
                    time: selectedSlot,
                    appointmentType: selectedType?.name || t('doctorProfile.expertise.consultation'),
                    serviceId: selectedType?.id,
                    consultationMode
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setBookingFeedback({
                type: 'success',
                message: res.data.message || t('doctorProfile.booking.success')
            });

            const refreshed = await api.get('/public/available-slots', {
                params: {
                    practitionerId: doctor.id,
                    date: selectedDate,
                    serviceId: selectedServiceId || undefined
                }
            });
            setSlots(refreshed.data.data || []);
            setSelectedSlot('');
        } catch (error) {
            setBookingFeedback({
                type: 'error',
                message: error.response?.data?.message || t('doctorProfile.booking.error')
            });
        } finally {
            setBookingLoading(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!isPatientLoggedIn) {
            console.warn('[DOCTOR_PROFILE] review blocked: patient not logged in', { practitionerId: id });
            navigate(`/patient/login?redirect=${encodeURIComponent(`/doctors/${id}`)}`);
            return;
        }

        if (!canSubmitReview) {
            console.warn('[DOCTOR_PROFILE] review blocked: not eligible', {
                practitionerId: id,
                canReview: doctor?.canReview,
                patientReview: doctor?.patientReview
            });
            setReviewFeedback({
                type: 'error',
                message: t('doctorProfile.reviews.eligibilityError')
            });
            return;
        }

        setReviewSaving(true);
        setReviewFeedback({ type: '', message: '' });

        try {
            const token = localStorage.getItem('patient-token');
            await api.post(
                `/public/practitioners/${id}/reviews`,
                reviewForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const refreshed = await api.get(`/public/practitioners/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctor(refreshed.data.data || null);
            setReviewFeedback({
                type: 'success',
                message: t('doctorProfile.reviews.saved')
            });
        } catch (error) {
            console.error('[DOCTOR_PROFILE] review submit error', {
                practitionerId: id,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                payload: reviewForm,
                canReview: doctor?.canReview
            });
            setReviewFeedback({
                type: 'error',
                message: error.response?.data?.message || t('doctorProfile.reviews.saveError')
            });
        } finally {
            setReviewSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <PublicNavbar />
                <div className="flex justify-center py-20"><div className="spinner" /></div>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <PublicNavbar />
                <Container className="py-14">
                    <h1 className="text-2xl font-extrabold text-slate-950">{t('doctorProfile.notFoundTitle')}</h1>
                    <p className="mt-2 text-slate-600">{t('doctorProfile.notFoundDescription')}</p>
                    <div className="mt-6">
                        <Button as={Link} to="/doctors" variant="ghost">{t('doctorProfile.backToDirectory')}</Button>
                    </div>
                </Container>
            </div>
        );
    }

    const displaySpecialty = normalizeSpecialty(doctor.specialty);
    const displayBio = normalizeBio(doctor.bio);
    const expertiseFallbacks = [
        t('doctorProfile.expertise.consultation'),
        t('doctorProfile.expertise.followUp'),
        t('doctorProfile.expertise.prevention')
    ];
    const reviewHelpText = doctor.canReview
        ? doctor.patientReview
            ? t('doctorProfile.reviews.canEdit')
            : t('doctorProfile.reviews.eligible')
        : doctor.patientReview
            ? t('doctorProfile.reviews.canEdit')
            : t('doctorProfile.reviews.needsAppointment');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <PublicNavbar />

            <main className="fade-in-soft">
                <Container className="py-10 sm:py-12">
                    <button
                        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/doctors'))}
                        className="group inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium"
                    >
                        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('doctorProfile.backToDirectory')}
                    </button>

                    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                                    <div className="h-32 w-32 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 shadow-lg">
                                        {doctor.avatarUrl ? (
                                            <img src={getAssetUrl(doctor.avatarUrl)} alt={t('doctors.doctorAlt', { name: doctor.name })} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white/95">
                                                {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{doctor.name}</h1>
                                                <p className="mt-1 text-blue-600 text-lg font-semibold">{displaySpecialty}</p>
                                            </div>
                                            <div className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700 font-bold inline-flex items-center gap-1">
                                                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                                </svg>
                                                {reviews > 0 ? rating.toFixed(1) : t('doctorProfile.notRated')}
                                            </div>
                                        </div>

                                        <p className="text-slate-600 leading-relaxed">
                                            {displayBio}
                                        </p>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {doctor.acceptsOnline && (
                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                                    {t('doctorProfile.onlineConsultations')}
                                                </span>
                                            )}
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {getReviewCountLabel(reviews)}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {t('doctorProfile.fromPrice', { price: doctor.consultationFee })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                            </svg>
                                        </span>
                                        {t('doctorProfile.education.title')}
                                    </h2>
                                    <ul className="space-y-2 text-sm text-slate-600">
                                        <li>• {t('doctorProfile.education.degree')}</li>
                                        <li>• {t('doctorProfile.education.specialization', { specialty: displaySpecialty })}</li>
                                        <li>• {t('doctorProfile.education.continuing')}</li>
                                    </ul>
                                </div>

                                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </span>
                                        {t('doctorProfile.expertise.title')}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            ...(appointmentTypes.length > 0
                                                ? appointmentTypes.map((item) => item.name)
                                                : expertiseFallbacks),
                                            doctor.acceptsOnline ? t('doctorProfile.expertise.teleconsultation') : null
                                        ].filter(Boolean).slice(0, 5).map((item) => (
                                            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-950">{t('doctorProfile.reviews.title')}</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {t('doctorProfile.reviews.subtitle')}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                                        <div className="font-bold text-slate-900">{reviews > 0 ? rating.toFixed(1) : t('doctorProfile.notRated')} / 5</div>
                                        <div className="text-slate-500">{getPublishedReviewCountLabel(reviews)}</div>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                                    <div className="space-y-3">
                                        {doctor.reviews?.length > 0 ? doctor.reviews.map((review) => (
                                            <div key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{review.patientName}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(review.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                                                        </p>
                                                    </div>
                                                    <div className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-sm font-bold text-blue-700">
                                                        <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                                        </svg>
                                                        {review.rating}/5
                                                    </div>
                                                </div>
                                                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                                    {review.reviewText || t('doctorProfile.reviews.noComment')}
                                                </p>
                                            </div>
                                        )) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                                {t('doctorProfile.reviews.empty')}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                        <h3 className="text-lg font-bold text-slate-900">{t('doctorProfile.reviews.formTitle')}</h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {t('doctorProfile.reviews.formDescription')}
                                        </p>

                                        <div className="mt-4">
                                            <label className="mb-2 block text-sm font-bold text-slate-700">{t('doctorProfile.reviews.ratingLabel')}</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                                                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                                                            reviewForm.rating >= value
                                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                                : 'border-slate-200 bg-white text-slate-400'
                                                        }`}
                                                    >
                                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                                        </svg>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="mb-2 block text-sm font-bold text-slate-700">{t('doctorProfile.reviews.reviewLabel')}</label>
                                            <textarea
                                                value={reviewForm.reviewText}
                                                onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewText: event.target.value }))}
                                                rows={5}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                                placeholder={t('doctorProfile.reviews.placeholder')}
                                            />
                                        </div>

                                        <div className="mt-4 text-xs text-slate-500">
                                            {reviewHelpText}
                                        </div>

                                        {reviewFeedback.message && (
                                            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                                                reviewFeedback.type === 'success'
                                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : 'border border-red-200 bg-red-50 text-red-700'
                                            }`}>
                                                {reviewFeedback.message}
                                            </div>
                                        )}

                                        <Button
                                            variant="blue"
                                            className="mt-5 w-full"
                                            onClick={handleReviewSubmit}
                                            disabled={reviewSaving}
                                        >
                                            {reviewSaving
                                                ? t('doctorProfile.reviews.saving')
                                                : doctor.patientReview
                                                    ? t('doctorProfile.reviews.update')
                                                    : t('doctorProfile.reviews.publish')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside className="lg:col-span-1">
                            <div className="sticky top-24 space-y-5 rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-50">
                                <div className="text-center">
                                    <h2 className="text-2xl font-extrabold">{t('doctorProfile.booking.title')}</h2>
                                    <p className="mt-1 text-sm text-slate-500">{t('doctorProfile.booking.subtitle')}</p>
                                </div>

                                <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                                    <p className="font-bold">{t('doctorProfile.booking.selectedAvailability')}</p>
                                    <p className="mt-1">
                                        {formatDisplayDate(selectedDate, language, t('doctorProfile.dateNotSelected'))} · {getAvailableSlotsLabel(availableSlots.length)}
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">{t('doctorProfile.booking.typeLabel')}</label>
                                    <select
                                        value={selectedServiceId}
                                        onChange={(event) => setSelectedServiceId(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        {appointmentTypes.length > 0 ? (
                                            appointmentTypes.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} · €{item.price}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">{fallbackTypeLabel} · €{activePrice}</option>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">{t('doctorProfile.booking.modeLabel')}</label>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {doctor?.calendar?.sessions?.some((session) => session.enabled && ['both', 'in-person'].includes(session.mode)) !== false && (
                                        <button
                                            type="button"
                                            onClick={() => setConsultationMode('in-person')}
                                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${consultationMode === 'in-person'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                                }`}
                                        >
                                            {t('doctorProfile.booking.inPerson')}
                                        </button>
                                        )}
                                        {doctor.acceptsOnline && doctor?.calendar?.sessions?.some((session) => session.enabled && ['both', 'online'].includes(session.mode)) && (
                                            <button
                                                type="button"
                                                onClick={() => setConsultationMode('online')}
                                                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${consultationMode === 'online'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                                    }`}
                                            >
                                                {t('doctorProfile.booking.online')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">{t('doctorProfile.booking.dateLabel')}</label>
                                    <input
                                        type="date"
                                        min={getTodayDate()}
                                        value={selectedDate}
                                        onChange={(event) => setSelectedDate(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label className="block text-sm font-bold text-slate-700">{t('doctorProfile.booking.slotsLabel')}</label>
                                        {slotsLoading && <span className="text-xs text-slate-500">{t('doctorProfile.booking.loadingSlots')}</span>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {slots.map((slot) => (
                                            <button
                                                key={slot.time}
                                                type="button"
                                                disabled={!slot.available}
                                                onClick={() => setSelectedSlot(slot.time)}
                                                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedSlot === slot.time
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : slot.available
                                                        ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700'
                                                        : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
                                                    }`}
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                    {!slotsLoading && slots.length === 0 && (
                                        <p className="mt-3 text-sm text-slate-500">{t('doctorProfile.booking.noSlotsLoaded')}</p>
                                    )}
                                    {!slotsLoading && slots.length > 0 && availableSlots.length === 0 && (
                                        <p className="mt-3 text-sm text-amber-600">{t('doctorProfile.booking.noAvailability')}</p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">{t('doctorProfile.booking.duration')}</span>
                                        <span className="font-bold text-slate-900">{activeDuration} min</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-slate-500">{t('doctorProfile.booking.price')}</span>
                                        <span className="font-bold text-slate-900">€{activePrice}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-slate-500">{t('doctorProfile.booking.payment')}</span>
                                        <span className="font-bold text-slate-900">{paymentSummary}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-slate-500">{t('doctorProfile.booking.selectedSlot')}</span>
                                        <span className="font-bold text-slate-900">{selectedSlot || t('doctorProfile.booking.notSelected')}</span>
                                    </div>
                                </div>

                                {bookingFeedback.message && (
                                    <div className={`rounded-2xl px-4 py-3 text-sm ${bookingFeedback.type === 'success'
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border border-red-200 bg-red-50 text-red-700'
                                        }`}>
                                        {bookingFeedback.message}
                                    </div>
                                )}

                                <Button
                                    variant="blue"
                                    onClick={handleBooking}
                                    className="w-full"
                                    disabled={bookingLoading || slotsLoading || !selectedDate || availableSlots.length === 0 || !selectedSlot}
                                >
                                    {bookingLoading
                                        ? t('doctorProfile.booking.booking')
                                        : isPatientLoggedIn
                                            ? t('doctorProfile.booking.book')
                                            : t('doctorProfile.booking.loginToBook')}
                                </Button>

                                <p className="text-xs text-center text-slate-400">
                                    {isPatientLoggedIn
                                        ? t('doctorProfile.booking.loggedInHint')
                                        : t('doctorProfile.booking.loggedOutHint')}
                                </p>
                            </div>
                        </aside>
                    </div>
                </Container>
            </main>
        </div>
    );
};

export default DoctorProfile;
