import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import en from '@/src/i18n/en';
import fr from '@/src/i18n/fr';
import { patientApi } from '@/src/api/patient';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';
import type { AppointmentType, AvailableSlot, Practitioner } from '@/src/types/doctor';
import { getFileUrl } from '@/src/utils/getFileUrl';

const today = () => new Date().toISOString().slice(0, 10);

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDays = (monthCursor: Date) => {
  const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const startOffset = (start.getDay() + 6) % 7;
  const days: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let i = startOffset; i > 0; i -= 1) {
    const date = new Date(start);
    date.setDate(start.getDate() - i);
    days.push({ key: toDateKey(date), date, inMonth: false });
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
    days.push({ key: toDateKey(date), date, inMonth: true });
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const date = new Date(last);
    date.setDate(last.getDate() + 1);
    days.push({ key: toDateKey(date), date, inMonth: false });
  }

  return days;
};

const normalizeSpecialty = (specialty: string | null | undefined, t: typeof fr.doctors) =>
  !specialty || specialty === 'General Practice' ? t.defaultSpecialty : specialty;

const normalizeBio = (bio: string | null | undefined, t: typeof fr.doctors) =>
  !bio || bio === 'Experienced healthcare professional dedicated to patient care.' ? t.defaultBio : bio;

const initials = (doctor?: Practitioner | null) =>
  `${doctor?.firstName?.[0] || ''}${doctor?.lastName?.[0] || ''}`.trim() ||
  doctor?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ||
  'DR';

export default function PatientDoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = usePatientLanguage();
  const t = language === 'fr' ? fr.doctors : en.doctors;
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Practitioner | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [mode, setMode] = useState<'in-person' | 'online'>('in-person');
  const [date, setDate] = useState(today());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [feedback, setFeedback] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [notes, setNotes] = useState('');
  const [reviewRating, setReviewRating] = useState(doctor?.patientReview?.rating || 5);
  const [reviewText, setReviewText] = useState(doctor?.patientReview?.reviewText || '');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    Promise.all([
      patientApi.getPractitioner(id, patientSession.getToken()),
      patientApi.getAppointmentTypes(id).catch(() => ({ data: [] })),
    ])
      .then(([doctorResponse, typesResponse]) => {
        if (!active) return;
        setDoctor(doctorResponse.data || null);
        setReviewRating(doctorResponse.data?.patientReview?.rating || 5);
        setReviewText(doctorResponse.data?.patientReview?.reviewText || '');
        const types = typesResponse.data || [];
        setAppointmentTypes(types);
        setSelectedTypeId(types[0]?.id || '');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const selectedType = useMemo(
    () => appointmentTypes.find((item) => item.id === selectedTypeId) || appointmentTypes[0],
    [appointmentTypes, selectedTypeId],
  );

  useEffect(() => {
    if (!doctor?.id) return;
    let active = true;
    setSlotsLoading(true);
    setSelectedSlot('');

    patientApi.getAvailableSlots({
      practitionerId: doctor.id,
      date,
      serviceId: selectedType?.id,
      consultationMode: mode,
    })
      .then((response) => {
        if (!active) return;
        const available = (response.data || []).filter((slot) => slot.available);
        setSlots(available);
        setSelectedSlot(available[0]?.time || '');
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctor?.id, date, selectedType?.id, mode]);

  const avatarUrl = getFileUrl(doctor?.avatarUrl);
  const rating = Number(doctor?.ratingAvg || 0);
  const reviews = Number(doctor?.reviewsCount || 0);
  const fee = selectedType?.price || doctor?.consultationFee || 50;
  const duration = selectedType?.durationMinutes || doctor?.calendar?.defaultDurationMinutes || 30;
  const canUseOnline = Boolean(doctor?.acceptsOnline);
  const calendarDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);
  const minDateKey = today();
  const monthLabel = calendarMonth.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleBooking = async () => {
    setFeedback('');
    setBookingDone(false);
    if (!doctor?.id || !selectedSlot) return;

    const token = patientSession.getToken();
    if (!token) {
      router.push({
        pathname: '/auth/patient-login',
        params: { redirect: `/patient/doctor/${doctor.id}` },
      } as never);
      return;
    }

    setBookingLoading(true);
    try {
      await patientApi.bookAppointment(
        {
          practitionerId: doctor.id,
          date,
          time: selectedSlot,
          appointmentType: selectedType?.name || 'Consultation',
          serviceId: selectedType?.id,
          consultationMode: mode,
          notes: notes.trim() || undefined,
        },
        token,
      );

      setFeedback(t.profile.bookingSuccess);
      setBookingDone(true);
      setSlots((current) => {
        const nextSlots = current.filter((slot) => slot.time !== selectedSlot);
        setSelectedSlot(nextSlots[0]?.time || '');
        return nextSlots;
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t.profile.bookingError);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    setReviewFeedback('');
    if (!doctor?.id) return;

    const token = patientSession.getToken();
    if (!token) {
      router.push({
        pathname: '/auth/patient-login',
        params: { redirect: `/patient/doctor/${doctor.id}` },
      } as never);
      return;
    }

    if (!doctor.canReview) {
      setReviewFeedback(t.profile.reviewNotEligible);
      return;
    }

    setReviewLoading(true);
    try {
      await patientApi.savePractitionerReview(
        doctor.id,
        { rating: reviewRating, reviewText: reviewText.trim() || undefined },
        token,
      );
      const response = await patientApi.getPractitioner(doctor.id, token);
      setDoctor(response.data || doctor);
      setReviewFeedback(t.profile.reviewSuccess);
    } catch (error) {
      setReviewFeedback(error instanceof Error ? error.message : t.profile.reviewError);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
        <Link href="/patient/doctors" asChild>
          <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>{t.profile.back}</Text></Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.localBackRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.accent}>
          <View style={styles.accentPrimary} />
          <View style={styles.accentMedical} />
        </View>
        <View style={styles.profileHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials(doctor)}</Text></View>
          )}
          <View style={styles.profileInfo}>
            <View style={styles.nameLine}>
              <Text style={styles.name}>{doctor.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.ratingText}>{reviews > 0 ? rating.toFixed(1) : t.notRated}</Text>
              </View>
            </View>
            <Text style={styles.specialty}>{normalizeSpecialty(doctor.specialty, t)}</Text>
            <Text style={styles.bio}>{normalizeBio(doctor.bio, t)}</Text>
            <View style={styles.tags}>
              <Text style={styles.tag}>{canUseOnline ? t.online : t.inPerson}</Text>
              <Text style={styles.tag}>€{fee}</Text>
              <Text style={styles.tag}>{duration} min</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bookingCard}>
        <Text style={styles.sectionTitle}>{t.profile.bookingTitle}</Text>
        <Text style={styles.sectionSubtitle}>{t.profile.bookingSubtitle}</Text>

        {appointmentTypes.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>{t.profile.appointmentType}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {appointmentTypes.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedTypeId(type.id)}
                  style={[styles.optionChip, selectedType?.id === type.id && styles.optionChipActive]}
                >
                  <Text style={[styles.optionText, selectedType?.id === type.id && styles.optionTextActive]}>
                    {type.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text style={styles.fieldLabel}>{t.profile.mode}</Text>
        <View style={styles.segment}>
          <Pressable onPress={() => setMode('in-person')} style={[styles.segmentItem, mode === 'in-person' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'in-person' && styles.segmentTextActive]}>{t.inPerson}</Text>
          </Pressable>
          <Pressable disabled={!canUseOnline} onPress={() => setMode('online')} style={[styles.segmentItem, mode === 'online' && styles.segmentActive, !canUseOnline && styles.disabled]}>
            <Text style={[styles.segmentText, mode === 'online' && styles.segmentTextActive]}>{t.online}</Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>{t.profile.date}</Text>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityLabel={t.calendar.previous}
              onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable
              accessibilityLabel={t.calendar.next}
              onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {t.calendar.days.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((item) => {
              const key = item.key;
              const disabled = !item.inMonth || key < minDateKey;
              const selected = date === key;
              return (
                <Pressable
                  key={key}
                  disabled={disabled}
                  onPress={() => setDate(key)}
                  style={[
                    styles.calendarDay,
                    !item.inMonth && styles.calendarDayMuted,
                    disabled && styles.calendarDayDisabled,
                    selected && styles.calendarDaySelected,
                  ]}
                >
                  <Text style={[
                    styles.calendarDayText,
                    !item.inMonth && styles.calendarDayTextMuted,
                    disabled && styles.calendarDayTextDisabled,
                    selected && styles.calendarDayTextSelected,
                  ]}>
                    {item.date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t.profile.price}</Text>
          <Text style={styles.summaryValue}>€{fee}</Text>
          <Text style={styles.summaryLabel}>{t.profile.duration}</Text>
          <Text style={styles.summaryValue}>{duration} min</Text>
        </View>

        <Text style={styles.fieldLabel}>{t.profile.slots}</Text>
        {slotsLoading ? (
          <ActivityIndicator color="#6366f1" style={styles.slotLoader} />
        ) : slots.length === 0 ? (
          <Text style={styles.noSlots}>{t.profile.noSlots}</Text>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.slice(0, 12).map((slot) => (
              <Pressable
                key={slot.time}
                onPress={() => setSelectedSlot(slot.time)}
                style={[styles.slotChip, selectedSlot === slot.time && styles.slotChipActive]}
              >
                <Text style={[styles.slotText, selectedSlot === slot.time && styles.slotTextActive]}>{slot.time}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.fieldLabel}>{t.profile.note}</Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder={t.profile.notePlaceholder}
          placeholderTextColor="#94a3b8"
          style={styles.noteInput}
          value={notes}
        />

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {bookingDone ? (
          <Pressable onPress={() => router.replace('/patient/home' as never)} style={styles.dashboardButton}>
            <Text style={styles.dashboardButtonText}>{t.profile.openDashboard}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleBooking}
          disabled={!selectedSlot || bookingLoading}
          style={[styles.primaryButton, (!selectedSlot || bookingLoading) && styles.disabled]}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t.book}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.infoGrid}>
        <InfoPanel
          title={t.profile.education}
          items={doctor.education && doctor.education.length > 0 ? doctor.education : ['Diplôme de médecine', normalizeSpecialty(doctor.specialty, t)]}
        />
        <InfoPanel
          title={t.profile.expertise}
          items={doctor.expertise && doctor.expertise.length > 0 ? doctor.expertise : ['Consultation', 'Suivi', 'Prévention']}
        />
      </View>

      <View style={styles.reviewsCard}>
        <Text style={styles.sectionTitle}>{t.profile.reviewsTitle}</Text>
        <Text style={styles.sectionSubtitle}>{reviews} {reviews === 1 ? t.review.replace('{{count}} ', '') : t.reviews.replace('{{count}} ', '')}</Text>
        <View style={styles.reviewComposer}>
          <Text style={styles.reviewComposerTitle}>{t.profile.reviewFormTitle}</Text>
          <Text style={styles.reviewComposerSubtitle}>{patientSession.getToken() ? t.profile.reviewFormSubtitle : t.profile.reviewLoginRequired}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setReviewRating(star)} style={styles.starButton}>
                <Text style={[styles.reviewStar, star <= reviewRating && styles.reviewStarActive]}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={setReviewText}
            placeholder={t.profile.reviewPlaceholder}
            placeholderTextColor="#94a3b8"
            style={styles.reviewInput}
            value={reviewText}
          />
          {reviewFeedback ? <Text style={styles.reviewFeedback}>{reviewFeedback}</Text> : null}
          <Pressable
            disabled={reviewLoading}
            onPress={handleReviewSubmit}
            style={[styles.reviewSubmitButton, reviewLoading && styles.disabled]}
          >
            {reviewLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.reviewSubmitText}>{t.profile.reviewSubmit}</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.reviewList}>
          {doctor.reviews && doctor.reviews.length > 0 ? (
            doctor.reviews.slice(0, 5).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewItemHeader}>
                  <Text style={styles.reviewPatient}>{review.patientName || 'Patient'}</Text>
                  <Text style={styles.reviewRating}>★ {review.rating}/5</Text>
                </View>
                {review.reviewText ? <Text style={styles.reviewText}>{review.reviewText}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>{t.profile.noReviews}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.infoPanel}>
      <Text style={styles.infoTitle}>{title}</Text>
      {items.slice(0, 4).map((item) => (
        <Text key={item} style={styles.infoItem}>• {item}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingBottom: 36,
    paddingTop: 8,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  localBackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backText: {
    color: '#4f46e5',
    fontSize: 30,
    lineHeight: 33,
  },
  languageButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
  },
  languageActive: {
    backgroundColor: '#6366f1',
    borderRadius: 999,
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  languageMuted: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    paddingRight: 7,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    padding: 16,
    paddingTop: 25,
  },
  accent: {
    flexDirection: 'row',
    height: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  accentPrimary: { backgroundColor: '#6366f1', flex: 1 },
  accentMedical: { backgroundColor: '#14b8a6', flex: 1 },
  profileHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    backgroundColor: '#eef2ff',
    borderRadius: 22,
    height: 96,
    width: 96,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    borderRadius: 22,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  profileInfo: { flex: 1 },
  nameLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    color: '#0f172a',
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
  },
  ratingBadge: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  star: { color: '#f59e0b', fontSize: 12 },
  ratingText: { color: '#312e81', fontSize: 12, fontWeight: '900' },
  specialty: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  bio: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#f0fdfa',
    borderRadius: 999,
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 9,
    marginTop: 17,
  },
  optionRow: {
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
  },
  optionTextActive: { color: '#fff' },
  segment: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    flexDirection: 'row',
    padding: 4,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 12,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#6366f1',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  segmentText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: { color: '#4f46e5' },
  disabled: { opacity: 0.45 },
  calendarCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 13,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthButtonText: {
    color: '#4f46e5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 29,
  },
  monthTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    color: '#94a3b8',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  calendarDay: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: '14.285%',
  },
  calendarDayMuted: {
    opacity: 0.45,
  },
  calendarDayDisabled: {
    opacity: 0.28,
  },
  calendarDaySelected: {
    backgroundColor: '#6366f1',
  },
  calendarDayText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },
  calendarDayTextMuted: {
    color: '#94a3b8',
  },
  calendarDayTextDisabled: {
    color: '#cbd5e1',
  },
  calendarDayTextSelected: {
    color: '#fff',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 14,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    marginRight: 8,
  },
  slotLoader: { marginVertical: 20 },
  noSlots: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    color: '#64748b',
    fontWeight: '700',
    padding: 14,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 74,
    paddingVertical: 11,
  },
  slotChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  slotText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  slotTextActive: { color: '#fff' },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 18,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 92,
    padding: 14,
    textAlignVertical: 'top',
  },
  feedback: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  dashboardButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  dashboardButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 54,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  infoTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  infoItem: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 22,
  },
  reviewsCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  reviewComposer: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  reviewComposerTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewComposerSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  starButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  reviewStar: {
    color: '#cbd5e1',
    fontSize: 22,
    fontWeight: '900',
  },
  reviewStarActive: {
    color: '#f59e0b',
  },
  reviewInput: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    minHeight: 86,
    padding: 12,
    textAlignVertical: 'top',
  },
  reviewFeedback: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  reviewSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  reviewSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  reviewList: {
    gap: 10,
    marginTop: 14,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  reviewItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewPatient: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  reviewRating: {
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    color: '#b45309',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  noReviews: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
