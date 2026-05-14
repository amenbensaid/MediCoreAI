import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { staffApi, type StaffCalendarAppointment } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'Planning médecin',
    title: 'Calendrier',
    subtitle: 'Vue mobile des rendez-vous du cabinet, par mois et par journée.',
    today: 'Aujourd’hui',
    previous: 'Mois précédent',
    next: 'Mois suivant',
    appointments: 'Rendez-vous',
    confirmed: 'Confirmés',
    online: 'En ligne',
    pending: 'À valider',
    dayAgenda: 'Agenda du jour',
    noAppointment: 'Aucun rendez-vous pour cette journée.',
    create: 'Créer un rendez-vous',
    waitlist: 'File d’attente',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour voir le calendrier médecin.',
    login: 'Se connecter',
    loadError: 'Impossible de charger le calendrier.',
    consultation: 'Consultation',
    patient: 'Patient',
    inPerson: 'Présentiel',
    onlineMode: 'En ligne',
    notes: 'Notes',
    documents: 'Documents',
    selected: 'Sélection',
    legendConfirmed: 'Confirmé',
    legendPending: 'À valider',
    legendCancelled: 'Annulé',
    more: '+{count}',
    statuses: {
      confirmed: 'Confirmé',
      scheduled: 'Planifié',
      awaiting_approval: 'À valider',
      completed: 'Terminé',
      cancelled: 'Annulé',
    },
    weekdays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  },
  en: {
    eyebrow: 'Doctor schedule',
    title: 'Calendar',
    subtitle: 'Mobile view of clinic appointments by month and day.',
    today: 'Today',
    previous: 'Previous month',
    next: 'Next month',
    appointments: 'Appointments',
    confirmed: 'Confirmed',
    online: 'Online',
    pending: 'To approve',
    dayAgenda: 'Day agenda',
    noAppointment: 'No appointment for this day.',
    create: 'Create appointment',
    waitlist: 'Waitlist',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to view the doctor calendar.',
    login: 'Sign in',
    loadError: 'Unable to load calendar.',
    consultation: 'Consultation',
    patient: 'Patient',
    inPerson: 'In person',
    onlineMode: 'Online',
    notes: 'Notes',
    documents: 'Documents',
    selected: 'Selected',
    legendConfirmed: 'Confirmed',
    legendPending: 'To approve',
    legendCancelled: 'Cancelled',
    more: '+{count}',
    statuses: {
      confirmed: 'Confirmed',
      scheduled: 'Scheduled',
      awaiting_approval: 'To approve',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
};

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const parseAppointmentDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const sameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const isPastDay = (date: Date) => toDateKey(date) < toDateKey(new Date());
const getCalendarDays = (month: Date) => {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};
const formatMonth = (date: Date, language: PatientLanguage) => (
  date.toLocaleDateString(getLocale(language), { month: 'long', year: 'numeric' })
);
const formatDayTitle = (date: Date, language: PatientLanguage) => (
  date.toLocaleDateString(getLocale(language), { weekday: 'long', day: '2-digit', month: 'long' })
);
const formatTime = (value?: string | null, language: PatientLanguage = 'fr') => {
  const date = parseAppointmentDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
};

export default function StaffCalendarScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<StaffCalendarAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCalendar = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const visibleDays = getCalendarDays(month);
      const rangeStart = visibleDays[0].toISOString();
      const rangeEnd = new Date(visibleDays[visibleDays.length - 1].getFullYear(), visibleDays[visibleDays.length - 1].getMonth(), visibleDays[visibleDays.length - 1].getDate(), 23, 59, 59, 999).toISOString();
      const response = await staffApi.getCalendar(token, { start: rangeStart, end: rangeEnd });
      setAppointments(response.data || []);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, t.loadError]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<string, StaffCalendarAppointment[]>();
    appointments.forEach((appointment) => {
      const start = parseAppointmentDate(appointment.start);
      if (!start) return;
      const key = toDateKey(start);
      grouped.set(key, [...(grouped.get(key) || []), appointment]);
    });
    return grouped;
  }, [appointments]);

  const selectedAppointments = useMemo(() => (
    [...(appointmentsByDay.get(toDateKey(selectedDate)) || [])]
      .sort((a, b) => (parseAppointmentDate(a.start)?.getTime() || 0) - (parseAppointmentDate(b.start)?.getTime() || 0))
  ), [appointmentsByDay, selectedDate]);

  const selectedStats = useMemo(() => ({
    total: selectedAppointments.length,
    confirmed: selectedAppointments.filter((item) => item.status === 'confirmed').length,
    online: selectedAppointments.filter((item) => item.consultationMode === 'online').length,
    pending: selectedAppointments.filter((item) => item.status === 'awaiting_approval' || item.status === 'scheduled').length,
  }), [selectedAppointments]);
  const selectedDateIsPast = isPastDay(selectedDate);

  if (!staffSession.getToken()) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{t.loginText}</Text>
          <Pressable onPress={() => router.replace('/auth/staff-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCalendar(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={[styles.pageIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="calendar-number-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.pageCopy}>
          <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel={t.previous}
            onPress={() => {
              setMonth((current) => {
                const nextMonth = addMonths(current, -1);
                setSelectedDate(nextMonth);
                return nextMonth;
              });
            }}
            style={[styles.monthButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{formatMonth(month, language)}</Text>
          <Pressable
            accessibilityLabel={t.next}
            onPress={() => {
              setMonth((current) => {
                const nextMonth = addMonths(current, 1);
                setSelectedDate(nextMonth);
                return nextMonth;
              });
            }}
            style={[styles.monthButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.calendarSubHeader}>
          <Text numberOfLines={1} style={[styles.selectedDate, { color: colors.muted }]}>{formatDayTitle(selectedDate, language)}</Text>
          <Pressable onPress={() => {
            const today = new Date();
            setMonth(startOfMonth(today));
            setSelectedDate(today);
          }} style={[styles.todayButton, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="radio-button-on-outline" size={14} color="#2563eb" />
            <Text style={styles.todayButtonText}>{t.today}</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {t.weekdays.map((day, index) => (
            <Text key={`${day}-${index}`} style={[styles.weekText, { color: colors.muted }]}>{day}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {getCalendarDays(month).map((day) => {
            const key = toDateKey(day);
            const dayAppointments = appointmentsByDay.get(key) || [];
            const selected = sameDay(day, selectedDate);
            const today = sameDay(day, new Date());
            const muted = !sameMonth(day, month);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setSelectedDate(day);
                  if (!sameMonth(day, month)) {
                    setMonth(startOfMonth(day));
                  }
                  router.push(`/staff/calendar-day?date=${key}` as never);
                }}
                style={[
                  styles.dayCell,
                  { backgroundColor: selected ? colors.primary : colors.surfaceAlt, borderColor: selected ? colors.primary : colors.border },
                  muted && !selected && styles.mutedDay,
                ]}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: selected ? '#fff' : muted ? colors.subtle : colors.text },
                  today && !selected && { color: colors.primary },
                ]}>
                  {day.getDate()}
                </Text>
                {dayAppointments.length > 0 ? (
                  <View style={[
                    styles.dayCount,
                    { backgroundColor: selected ? 'rgba(255,255,255,0.24)' : `${getStatusColor(dayAppointments[0]?.status)}18` },
                  ]}>
                    <Text style={[
                      styles.dayCountText,
                      { color: selected ? '#fff' : getStatusColor(dayAppointments[0]?.status) },
                    ]}>
                      {dayAppointments.length}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <LegendDot color="#10b981" label={t.legendConfirmed} />
          <LegendDot color="#f59e0b" label={t.legendPending} />
          <LegendDot color="#e11d48" label={t.legendCancelled} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <SummaryPill color="#2563eb" label={t.appointments} value={selectedStats.total} />
        <SummaryPill color="#10b981" label={t.confirmed} value={selectedStats.confirmed} />
        <SummaryPill color="#0ea5e9" label={t.online} value={selectedStats.online} />
        <SummaryPill color="#f59e0b" label={t.pending} value={selectedStats.pending} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dayAgenda}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{formatDayTitle(selectedDate, language)}</Text>
        </View>
        <View style={styles.sectionActions}>
          {!selectedDateIsPast ? (
            <Link href="/staff/appointments" asChild>
              <Pressable style={[styles.smallAction, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="add" size={16} color={colors.primary} />
              </Pressable>
            </Link>
          ) : null}
          <Link href="/staff/waitlist" asChild>
            <Pressable style={[styles.smallAction, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.agendaList}>
        {selectedAppointments.length > 0 ? (
          selectedAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} language={language} labels={t} />
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noAppointment}</Text>
            {!selectedDateIsPast ? (
              <View style={styles.emptyActions}>
                <Link href="/staff/appointments" asChild>
                  <Pressable style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{t.create}</Text>
                  </Pressable>
                </Link>
                <Link href="/staff/waitlist" asChild>
                  <Pressable style={[styles.secondaryButton, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t.waitlist}</Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getStatusColor(status?: string | null) {
  if (status === 'confirmed') return '#10b981';
  if (status === 'awaiting_approval') return '#f59e0b';
  if (status === 'cancelled') return '#e11d48';
  if (status === 'completed') return '#64748b';
  return '#2563eb';
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function getDocumentText(appointment: StaffCalendarAppointment, labels: typeof copy.fr) {
  const requested = Array.isArray(appointment.requestedDocuments) ? appointment.requestedDocuments.length : 0;
  const received = Number(appointment.sharedDocumentsCount || 0);
  if (requested > 0) return `${received}/${requested} ${labels.documents}`;
  if (received > 0) return `${received} ${labels.documents}`;
  return '';
}

function SummaryPill({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.summaryPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function AppointmentCard({
  appointment,
  labels,
  language,
}: {
  appointment: StaffCalendarAppointment;
  labels: typeof copy.fr;
  language: PatientLanguage;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const status = appointment.status || 'scheduled';
  const modeOnline = appointment.consultationMode === 'online';
  const documentText = getDocumentText(appointment, labels);

  return (
    <View style={[styles.appointmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.timePill, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.timeText, { color: colors.primary }]}>{formatTime(appointment.start, language)}</Text>
        <Text style={[styles.timeEndText, { color: colors.muted }]}>{formatTime(appointment.end, language)}</Text>
      </View>
      <View style={styles.appointmentBody}>
        <View style={styles.appointmentTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(appointment.patientName || labels.patient)}</Text>
          </View>
          <View style={styles.appointmentIdentity}>
            <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>
              {appointment.patientName || labels.patient}
            </Text>
            <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>
              {appointment.type || labels.consultation}
            </Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          <Text style={[styles.statusChip, { backgroundColor: `${getStatusColor(status)}18`, color: getStatusColor(status) }]}>
            {labels.statuses[status as keyof typeof labels.statuses] || status}
          </Text>
          <Text style={[styles.modeChip, { backgroundColor: modeOnline ? '#dbeafe' : colors.surfaceAlt, color: modeOnline ? '#2563eb' : colors.muted }]}>
            {modeOnline ? labels.onlineMode : labels.inPerson}
          </Text>
        </View>

        {appointment.reasonDetail || appointment.reasonCategory ? (
          <Text style={[styles.detailText, { color: colors.text }]}>
            {appointment.reasonDetail || appointment.reasonCategory}
          </Text>
        ) : null}
        {appointment.notes ? (
          <Text style={[styles.mutedLine, { color: colors.muted }]}>
            {labels.notes}: {appointment.notes}
          </Text>
        ) : null}
        {documentText ? (
          <Text style={[styles.mutedLine, { color: colors.muted }]}>{documentText}</Text>
        ) : null}
      </View>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'P';
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 12, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 24, width: '100%' },
  loginTitle: { fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 16 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 2, paddingVertical: 4 },
  pageIcon: { alignItems: 'center', borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  pageCopy: { flex: 1, minWidth: 0 },
  heroBadge: { color: '#bfdbfe', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  todayButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  todayButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  heroText: { color: '#dbeafe', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 2 },
  description: { fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  calendarCard: { borderRadius: 24, borderWidth: 1, padding: 10 },
  monthHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  monthButton: { alignItems: 'center', borderRadius: 13, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  monthTitle: { flex: 1, fontSize: 18, fontWeight: '900', textAlign: 'center', textTransform: 'capitalize' },
  calendarSubHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginBottom: 10 },
  selectedDate: { flex: 1, fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekText: { flex: 1, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexBasis: '13.2%', flexGrow: 1, justifyContent: 'center', maxWidth: '13.8%', minHeight: 38, paddingVertical: 3 },
  mutedDay: { opacity: 0.5 },
  dayNumber: { fontSize: 13, fontWeight: '900' },
  dayCount: { alignItems: 'center', borderRadius: 999, height: 14, justifyContent: 'center', marginTop: 2, minWidth: 16, paddingHorizontal: 4 },
  dayCountText: { fontSize: 9, fontWeight: '900' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendDot: { borderRadius: 999, height: 8, width: 8 },
  legendText: { fontSize: 11, fontWeight: '800' },
  error: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderRadius: 16, borderWidth: 1, color: '#e11d48', fontSize: 13, fontWeight: '800', padding: 12 },
  loadingCard: { alignItems: 'center', borderRadius: 22, padding: 18 },
  summaryRow: { flexDirection: 'row', gap: 7 },
  summaryPill: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, minHeight: 36, paddingHorizontal: 8 },
  summaryDot: { borderRadius: 999, height: 7, width: 7 },
  summaryValue: { fontSize: 14, fontWeight: '900' },
  summaryLabel: { flex: 1, fontSize: 10, fontWeight: '900' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { fontSize: 22, fontWeight: '900' },
  sectionSubtitle: { fontSize: 13, fontWeight: '800', marginTop: 3, textTransform: 'capitalize' },
  sectionActions: { flexDirection: 'row', gap: 8 },
  smallAction: { alignItems: 'center', borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  agendaList: { gap: 10 },
  appointmentCard: { borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  timePill: { alignItems: 'center', borderRadius: 18, justifyContent: 'center', minHeight: 72, width: 70 },
  timeText: { fontSize: 15, fontWeight: '900' },
  timeEndText: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  appointmentBody: { flex: 1, gap: 8 },
  appointmentTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  appointmentIdentity: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '900' },
  appointmentType: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  modeChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  detailText: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  mutedLine: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 10, padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 16, justifyContent: 'center', minHeight: 46, paddingHorizontal: 14 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderRadius: 16, justifyContent: 'center', minHeight: 46, paddingHorizontal: 14 },
  secondaryButtonText: { fontSize: 13, fontWeight: '900' },
});
