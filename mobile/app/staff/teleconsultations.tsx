import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { staffApi, type StaffAppointment, type StaffTeleconsultationsResponse } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'Téléconsultations',
    title: 'Sessions en ligne',
    subtitle: 'Suivez les rendez-vous Jitsi Meet, créez le lien et rejoignez la session médecin.',
    total: 'Total',
    ready: 'Jitsi prêt',
    today: 'Aujourd’hui',
    pending: 'À préparer',
    appointments: 'Rendez-vous',
    calendar: 'Calendrier',
    join: 'Rejoindre Jitsi',
    sync: 'Créer lien Jitsi',
    confirmAndSync: 'Valider & créer Jitsi',
    complete: 'Terminer',
    patient: 'Patient',
    online: 'En ligne',
    noSession: 'Aucune téléconsultation à afficher.',
    loadError: 'Impossible de charger les téléconsultations.',
    actionError: 'Impossible de synchroniser Jitsi Meet.',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour gérer les téléconsultations.',
    login: 'Se connecter',
    statuses: {
      scheduled: 'Planifié',
      awaiting_approval: 'À valider',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      in_progress: 'En cours',
    },
    meeting: {
      ready: 'Prêt',
      pending: 'En attente',
      awaiting_approval: 'À valider',
      cancelled: 'Annulé',
      completed: 'Terminé',
      not_required: 'Non requis',
    },
  },
  en: {
    eyebrow: 'Teleconsultations',
    title: 'Online sessions',
    subtitle: 'Track Jitsi Meet appointments, create links and join the doctor session.',
    total: 'Total',
    ready: 'Jitsi ready',
    today: 'Today',
    pending: 'To prepare',
    appointments: 'Appointments',
    calendar: 'Calendar',
    join: 'Join Jitsi',
    sync: 'Create Jitsi link',
    confirmAndSync: 'Approve & create Jitsi',
    complete: 'Complete',
    patient: 'Patient',
    online: 'Online',
    noSession: 'No teleconsultation to display.',
    loadError: 'Unable to load teleconsultations.',
    actionError: 'Unable to synchronize Jitsi Meet.',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to manage teleconsultations.',
    login: 'Sign in',
    statuses: {
      scheduled: 'Scheduled',
      awaiting_approval: 'To approve',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      in_progress: 'In progress',
    },
    meeting: {
      ready: 'Ready',
      pending: 'Pending',
      awaiting_approval: 'To approve',
      cancelled: 'Cancelled',
      completed: 'Completed',
      not_required: 'Not required',
    },
  },
};

const emptySummary: StaffTeleconsultationsResponse['summary'] = {
  total: 0,
  ready: 0,
  upcomingToday: 0,
  pending: 0,
};

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');
const getDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  const date = getDate(value);
  if (!date) return '-';
  return date.toLocaleDateString(getLocale(language), { weekday: 'short', day: '2-digit', month: 'short' });
};
const formatTime = (value: string | null | undefined, language: PatientLanguage) => {
  const date = getDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
};
const getPatientName = (appointment: StaffAppointment) => (
  appointment.patient?.fullName ||
  [appointment.patient?.firstName, appointment.patient?.lastName].filter(Boolean).join(' ') ||
  appointment.patientName ||
  appointment.title ||
  'Patient'
);
const getInitials = (name: string) => (
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
);
const getMeetingStatus = (appointment: StaffAppointment) => appointment.meeting?.status || (appointment.meetLink ? 'ready' : 'pending');
const getMeetingColor = (status?: string | null) => {
  if (status === 'ready') return '#10b981';
  if (status === 'cancelled') return '#e11d48';
  if (status === 'completed') return '#64748b';
  return '#f59e0b';
};

export default function StaffTeleconsultationsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const loadTeleconsultations = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await staffApi.getTeleconsultations(token, 'upcoming');
      setAppointments(response.data.appointments || []);
      setSummary(response.data.summary || emptySummary);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadTeleconsultations();
  }, [loadTeleconsultations]);

  const sortedAppointments = useMemo(() => (
    [...appointments].sort((a, b) => (getDate(a.start)?.getTime() || 0) - (getDate(b.start)?.getTime() || 0))
  ), [appointments]);

  const syncMeeting = async (appointment: StaffAppointment) => {
    const token = staffSession.getToken();
    if (!token || actionLoading) return;
    setActionLoading(appointment.id);
    try {
      if (appointment.status === 'scheduled' || appointment.status === 'awaiting_approval') {
        await staffApi.updateAppointment(token, appointment.id, { status: 'confirmed' });
      } else {
        await staffApi.syncAppointmentMeeting(token, appointment.id);
      }
      await loadTeleconsultations(true);
    } catch {
      Alert.alert(t.title, t.actionError);
    } finally {
      setActionLoading('');
    }
  };

  if (!staffSession.getToken()) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.loginText}</Text>
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTeleconsultations(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="videocam-outline" size={25} color="#2563eb" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" icon="layers-outline" label={t.total} value={summary.total} />
        <StatCard color="#10b981" icon="videocam-outline" label={t.ready} value={summary.ready} />
        <StatCard color="#0ea5e9" icon="today-outline" label={t.today} value={summary.upcomingToday} />
        <StatCard color="#f59e0b" icon="sync-outline" label={t.pending} value={summary.pending} />
      </View>

      <View style={styles.navRow}>
        <Link href="/staff/appointments" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="calendar-clear-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.appointments}</Text>
          </Pressable>
        </Link>
        <Link href="/staff/calendar" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="calendar-number-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.calendar}</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sortedAppointments.length > 0 ? (
        <View style={styles.list}>
          {sortedAppointments.map((appointment) => (
            <TeleconsultationCard
              key={appointment.id}
              actionLoading={actionLoading}
              appointment={appointment}
              colors={colors}
              labels={t}
              language={language}
              onSync={() => syncMeeting(appointment)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="videocam-off-outline" size={34} color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noSession}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ color, icon, label, value }: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}16` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function TeleconsultationCard({
  actionLoading,
  appointment,
  colors,
  labels,
  language,
  onSync,
}: {
  actionLoading: string;
  appointment: StaffAppointment;
  colors: typeof mobileTheme.light;
  labels: typeof copy.fr;
  language: PatientLanguage;
  onSync: () => void;
}) {
  const patientName = getPatientName(appointment);
  const meetingStatus = getMeetingStatus(appointment);
  const meetingColor = getMeetingColor(meetingStatus);
  const busy = actionLoading === appointment.id;
  const canJoin = Boolean(appointment.meetLink) && !['cancelled', 'completed'].includes(appointment.status || '');
  const needsApproval = appointment.status === 'scheduled' || appointment.status === 'awaiting_approval';

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: meetingColor }]}>
      <View style={styles.cardTop}>
        <View style={[styles.timeBox, { backgroundColor: `${meetingColor}16` }]}>
          <Text style={[styles.timeText, { color: meetingColor }]}>{formatTime(appointment.start, language)}</Text>
          <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(appointment.start, language)}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.patientLine}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(patientName)}</Text>
            </View>
            <View style={styles.patientTextBlock}>
              <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
              <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>{appointment.type || labels.online}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <Text style={[styles.statusChip, { backgroundColor: `${meetingColor}18`, color: meetingColor }]}>
              {labels.meeting[meetingStatus as keyof typeof labels.meeting] || meetingStatus}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: colors.surfaceAlt, color: colors.muted }]}>
              {labels.statuses[appointment.status as keyof typeof labels.statuses] || appointment.status}
            </Text>
          </View>
        </View>
      </View>

      {appointment.reasonDetail || appointment.reasonCategory ? (
        <Text style={[styles.detailText, { color: colors.text }]}>{appointment.reasonDetail || appointment.reasonCategory}</Text>
      ) : null}

      <View style={styles.actions}>
        {canJoin ? (
          <ActionButton color="#2563eb" disabled={busy} icon="videocam-outline" label={labels.join} onPress={() => Linking.openURL(appointment.meetLink || '')} />
        ) : null}
        {!canJoin && !['cancelled', 'completed'].includes(appointment.status || '') ? (
          <ActionButton
            color="#10b981"
            disabled={busy}
            icon={needsApproval ? 'checkmark-done-outline' : 'sync-outline'}
            label={needsApproval ? labels.confirmAndSync : labels.sync}
            onPress={onSync}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({ color, disabled, icon, label, onPress }: { color: string; disabled?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: `${color}16` }, disabled && styles.disabledButton]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 15, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  heroCard: { alignItems: 'center', borderRadius: 26, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  heroIcon: { alignItems: 'center', borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 4 },
  heroText: { fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 4 },
  loginTitle: { fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { borderRadius: 22, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minHeight: 106, padding: 13 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 10 },
  statLabel: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  navRow: { flexDirection: 'row', gap: 10 },
  navButton: { alignItems: 'center', borderRadius: 18, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  navButtonText: { fontSize: 13, fontWeight: '900' },
  loadingCard: { alignItems: 'center', borderRadius: 22, padding: 18 },
  list: { gap: 12 },
  sessionCard: { borderLeftWidth: 5, borderRadius: 24, borderWidth: 1, gap: 11, padding: 14 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  timeBox: { alignItems: 'center', borderRadius: 17, justifyContent: 'center', minHeight: 68, width: 76 },
  timeText: { fontSize: 16, fontWeight: '900' },
  dateText: { fontSize: 11, fontWeight: '900', marginTop: 5, textAlign: 'center', textTransform: 'capitalize' },
  identity: { flex: 1, gap: 8, minWidth: 0 },
  patientLine: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  patientTextBlock: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 16, fontWeight: '900' },
  appointmentType: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  modeChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  detailText: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  actionButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 34, paddingHorizontal: 11 },
  actionText: { fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 9, padding: 26 },
  emptyText: { fontSize: 14, fontWeight: '800', lineHeight: 21, textAlign: 'center' },
});
