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
  TextInput,
  View,
} from 'react-native';
import { staffApi, type StaffAppointment } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

type StatusFilter = 'all' | 'scheduled' | 'awaiting_approval' | 'confirmed' | 'completed' | 'cancelled';

const copy = {
  fr: {
    eyebrow: 'Cabinet',
    title: 'Rendez-vous',
    subtitle: 'Suivez, confirmez et gérez les rendez-vous du cabinet.',
    search: 'Rechercher patient, type, statut...',
    all: 'Tous',
    scheduled: 'Planifiés',
    awaiting_approval: 'À valider',
    confirmed: 'Confirmés',
    completed: 'Terminés',
    cancelled: 'Annulés',
    today: 'Aujourd’hui',
    total: 'Total',
    online: 'En ligne',
    pending: 'À traiter',
    listTitle: 'Liste des rendez-vous',
    emptyTitle: 'Aucun rendez-vous',
    emptyText: 'Aucun rendez-vous ne correspond à ce filtre.',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour gérer les rendez-vous.',
    login: 'Se connecter',
    loadError: 'Impossible de charger les rendez-vous.',
    actionError: 'Action impossible pour ce rendez-vous.',
    confirm: 'Confirmer',
    complete: 'Terminer',
    cancel: 'Annuler',
    sync: 'Lien visio',
    join: 'Rejoindre',
    followUp: 'Suivi',
    openPatient: 'Patient',
    inPerson: 'Présentiel',
    onlineMode: 'En ligne',
    consultation: 'Consultation',
    notes: 'Notes',
    reason: 'Motif',
    documents: 'Documents',
    statuses: {
      scheduled: 'Planifié',
      awaiting_approval: 'À valider',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      in_progress: 'En cours',
    },
    confirmTitle: 'Confirmer le rendez-vous ?',
    completeTitle: 'Terminer le rendez-vous ?',
    cancelTitle: 'Annuler le rendez-vous ?',
    yes: 'Oui',
    no: 'Non',
  },
  en: {
    eyebrow: 'Clinic',
    title: 'Appointments',
    subtitle: 'Track, confirm and manage clinic appointments.',
    search: 'Search patient, type, status...',
    all: 'All',
    scheduled: 'Scheduled',
    awaiting_approval: 'To approve',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    today: 'Today',
    total: 'Total',
    online: 'Online',
    pending: 'To handle',
    listTitle: 'Appointment list',
    emptyTitle: 'No appointments',
    emptyText: 'No appointment matches this filter.',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to manage appointments.',
    login: 'Sign in',
    loadError: 'Unable to load appointments.',
    actionError: 'Unable to update this appointment.',
    confirm: 'Confirm',
    complete: 'Complete',
    cancel: 'Cancel',
    sync: 'Video link',
    join: 'Join',
    followUp: 'Follow-up',
    openPatient: 'Patient',
    inPerson: 'In person',
    onlineMode: 'Online',
    consultation: 'Consultation',
    notes: 'Notes',
    reason: 'Reason',
    documents: 'Documents',
    statuses: {
      scheduled: 'Scheduled',
      awaiting_approval: 'To approve',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      in_progress: 'In progress',
    },
    confirmTitle: 'Confirm appointment?',
    completeTitle: 'Complete appointment?',
    cancelTitle: 'Cancel appointment?',
    yes: 'Yes',
    no: 'No',
  },
};

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');
const getDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatTime = (value: string | null | undefined, language: PatientLanguage) => {
  const date = getDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  const date = getDate(value);
  if (!date) return '-';
  return date.toLocaleDateString(getLocale(language), { weekday: 'short', day: '2-digit', month: 'short' });
};
const isToday = (value?: string | null) => {
  const date = getDate(value);
  if (!date) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
};
const getPatientName = (appointment: StaffAppointment) => (
  appointment.patient?.fullName ||
  [appointment.patient?.firstName, appointment.patient?.lastName].filter(Boolean).join(' ') ||
  appointment.patientName ||
  appointment.title ||
  'Patient'
);

export default function StaffAppointmentsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const loadAppointments = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await staffApi.getAppointments(token, {
        search,
        status: status === 'all' ? '' : status,
        limit: 100,
      });
      setAppointments(response.data.appointments || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, t.loadError, t.title]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  const stats = useMemo(() => ({
    total: appointments.length,
    today: appointments.filter((item) => isToday(item.start)).length,
    online: appointments.filter((item) => item.consultationMode === 'online').length,
    pending: appointments.filter((item) => item.status === 'scheduled' || item.status === 'awaiting_approval').length,
  }), [appointments]);

  const sortedAppointments = useMemo(() => (
    [...appointments].sort((a, b) => (getDate(a.start)?.getTime() || 0) - (getDate(b.start)?.getTime() || 0))
  ), [appointments]);

  const updateStatus = async (appointment: StaffAppointment, nextStatus: string) => {
    const token = staffSession.getToken();
    if (!token || actionLoading) return;

    setActionLoading(`${appointment.id}:${nextStatus}`);
    try {
      await staffApi.updateAppointment(token, appointment.id, { status: nextStatus });
      await loadAppointments(true);
    } catch {
      Alert.alert(t.title, t.actionError);
    } finally {
      setActionLoading('');
    }
  };

  const confirmAction = (appointment: StaffAppointment, nextStatus: string) => {
    const title = nextStatus === 'confirmed' ? t.confirmTitle : nextStatus === 'completed' ? t.completeTitle : t.cancelTitle;
    Alert.alert(title, getPatientName(appointment), [
      { text: t.no, style: 'cancel' },
      { text: t.yes, style: nextStatus === 'cancelled' ? 'destructive' : 'default', onPress: () => updateStatus(appointment, nextStatus) },
    ]);
  };

  const planFollowUp = (appointment: StaffAppointment) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    router.push({
      pathname: '/staff/calendar-day',
      params: {
        date,
        new: '1',
        patientId: appointment.patientId || '',
      },
    } as never);
  };

  const syncMeeting = async (appointment: StaffAppointment) => {
    const token = staffSession.getToken();
    if (!token || actionLoading) return;

    setActionLoading(`${appointment.id}:sync`);
    try {
      await staffApi.syncAppointmentMeeting(token, appointment.id);
      await loadAppointments(true);
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
          <Text style={[styles.heroBadgeLight, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.descriptionLight, { color: colors.muted }]}>{t.loginText}</Text>
          <Pressable onPress={() => router.push('/auth/staff-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAppointments(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="calendar-clear-outline" size={25} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" icon="calendar-clear-outline" label={t.total} value={stats.total} />
        <StatCard color="#14b8a6" icon="today-outline" label={t.today} value={stats.today} />
        <StatCard color="#0ea5e9" icon="videocam-outline" label={t.online} value={stats.online} />
        <StatCard color="#f59e0b" icon="time-outline" label={t.pending} value={stats.pending} />
      </View>

      <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={19} color={colors.subtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.search}
            placeholderTextColor={colors.subtle}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {([
            'all',
            'awaiting_approval',
            'scheduled',
            'confirmed',
            'completed',
            'cancelled',
          ] as StatusFilter[]).map((item) => {
            const active = status === item;
            return (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
                style={[styles.statusFilter, { backgroundColor: colors.surfaceAlt }, active && styles.statusFilterActive]}
              >
                <Text style={[styles.statusFilterText, { color: colors.muted }, active && styles.statusFilterTextActive]}>
                  {item === 'all' ? t.all : t[item]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.listTitle}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{sortedAppointments.length} {t.title.toLowerCase()}</Text>
        </View>
        {loading ? <ActivityIndicator color="#2563eb" /> : null}
      </View>

      {!loading && sortedAppointments.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={34} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sortedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              actionLoading={actionLoading}
              appointment={appointment}
              language={language}
              labels={t}
              onCancel={() => confirmAction(appointment, 'cancelled')}
              onComplete={() => confirmAction(appointment, 'completed')}
              onConfirm={() => confirmAction(appointment, 'confirmed')}
              onFollowUp={() => planFollowUp(appointment)}
              onSync={() => syncMeeting(appointment)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getStatusColor(status?: string | null) {
  if (status === 'confirmed') return '#10b981';
  if (status === 'awaiting_approval') return '#f59e0b';
  if (status === 'cancelled') return '#e11d48';
  if (status === 'completed') return '#64748b';
  if (status === 'in_progress') return '#0ea5e9';
  return '#2563eb';
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P';
}

function getDocumentText(appointment: StaffAppointment, labels: typeof copy.fr) {
  const requested = Array.isArray(appointment.requestedDocuments) ? appointment.requestedDocuments.length : 0;
  const received = Number(appointment.sharedDocumentsCount || 0);
  if (requested > 0) return `${received}/${requested} ${labels.documents}`;
  if (received > 0) return `${received} ${labels.documents}`;
  return '';
}

function StatCard({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function AppointmentCard({
  actionLoading,
  appointment,
  labels,
  language,
  onCancel,
  onComplete,
  onConfirm,
  onFollowUp,
  onSync,
}: {
  actionLoading: string;
  appointment: StaffAppointment;
  labels: typeof copy.fr;
  language: PatientLanguage;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: () => void;
  onFollowUp: () => void;
  onSync: () => void;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const patientName = getPatientName(appointment);
  const status = appointment.status || 'scheduled';
  const statusColor = getStatusColor(status);
  const isOnline = appointment.consultationMode === 'online';
  const documentText = getDocumentText(appointment, labels);
  const isBusy = actionLoading.startsWith(appointment.id);

  return (
    <View style={[styles.appointmentCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: statusColor, shadowColor: colors.shadow }]}>
      <View style={styles.cardTop}>
        <View style={[styles.timeBox, { backgroundColor: `${statusColor}14` }]}>
          <Text style={[styles.timeText, { color: statusColor }]}>{formatTime(appointment.start, language)}</Text>
          <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(appointment.start, language)}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.patientLine}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(patientName)}</Text>
            </View>
            <View style={styles.patientTextBlock}>
              <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
              <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>{appointment.type || labels.consultation}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <Text style={[styles.statusChip, { backgroundColor: `${statusColor}18`, color: statusColor }]}>
              {labels.statuses[status as keyof typeof labels.statuses] || status}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: isOnline ? '#dbeafe' : colors.surfaceAlt, color: isOnline ? '#2563eb' : colors.muted }]}>
              {isOnline ? labels.onlineMode : labels.inPerson}
            </Text>
          </View>
        </View>
      </View>

      {appointment.reasonDetail || appointment.reasonCategory ? (
        <InfoLine colors={colors} icon="medical-outline" label={labels.reason} value={appointment.reasonDetail || appointment.reasonCategory || ''} />
      ) : null}
      {appointment.notes ? (
        <InfoLine colors={colors} icon="reader-outline" label={labels.notes} value={appointment.notes} />
      ) : null}
      {documentText ? (
        <InfoLine colors={colors} icon="document-text-outline" label={labels.documents} value={documentText} />
      ) : null}

      <View style={styles.actions}>
        {(status === 'scheduled' || status === 'awaiting_approval') ? (
          <ActionButton color="#10b981" disabled={isBusy} icon="checkmark-outline" label={labels.confirm} onPress={onConfirm} />
        ) : null}
        {status === 'confirmed' ? (
          <>
            <ActionButton color="#64748b" disabled={isBusy} icon="flag-outline" label={labels.complete} onPress={onComplete} />
            {isOnline && appointment.meetLink ? (
              <ActionButton color="#0ea5e9" disabled={isBusy} icon="videocam-outline" label={labels.join} onPress={() => Linking.openURL(appointment.meetLink || '')} />
            ) : null}
            {isOnline && !appointment.meetLink ? <ActionButton color="#0ea5e9" disabled={isBusy} icon="sync-outline" label={labels.sync} onPress={onSync} /> : null}
          </>
        ) : null}
        {status === 'completed' && appointment.patientId ? (
          <ActionButton color="#2563eb" disabled={isBusy} icon="calendar-number-outline" label={labels.followUp} onPress={onFollowUp} />
        ) : null}
        {!['cancelled', 'completed'].includes(status) ? (
          <ActionButton color="#e11d48" disabled={isBusy} icon="close-outline" label={labels.cancel} onPress={onCancel} />
        ) : null}
        {appointment.patientId ? (
          <Link href={`/staff/patient/${appointment.patientId}`} asChild>
            <Pressable style={[styles.patientButton, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.patientButtonText, { color: colors.primary }]}>{labels.openPatient}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function InfoLine({
  colors,
  icon,
  label,
  value,
}: {
  colors: typeof mobileTheme.light;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.infoLine, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={[styles.infoLabel, { color: colors.primary }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  color,
  disabled,
  icon,
  label,
  onPress,
}: {
  color: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: `${color}16` }, disabled && styles.disabledButton]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  heroCard: { alignItems: 'center', borderRadius: 26, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  heroIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroBadge: { color: '#bfdbfe', fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  heroBadgeLight: { fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '900', lineHeight: 34, marginTop: 4 },
  heroText: { color: '#dbeafe', fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 4 },
  loginTitle: { fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 16 },
  descriptionLight: { fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { borderRadius: 22, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minHeight: 112, padding: 14 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 12 },
  statLabel: { fontSize: 12, fontWeight: '900', marginTop: 3 },
  filterCard: { borderRadius: 24, borderWidth: 1, gap: 12, padding: 12 },
  searchBox: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '800', minHeight: 46 },
  statusRow: { gap: 8, paddingRight: 4 },
  statusFilter: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  statusFilterActive: { backgroundColor: '#2563eb' },
  statusFilterText: { fontSize: 12, fontWeight: '900' },
  statusFilterTextActive: { color: '#fff' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, fontWeight: '900', marginTop: 3 },
  list: { gap: 12 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, padding: 26 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 8, textAlign: 'center' },
  appointmentCard: { borderLeftWidth: 5, borderRadius: 24, borderWidth: 1, gap: 12, padding: 14, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 18 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  timeBox: { alignItems: 'center', borderRadius: 17, minHeight: 68, justifyContent: 'center', width: 74 },
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
  infoLine: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingVertical: 9 },
  infoLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  actionButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 34, paddingHorizontal: 11 },
  actionButtonText: { fontSize: 11, fontWeight: '900' },
  patientButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 3, minHeight: 34, paddingHorizontal: 11 },
  patientButtonText: { fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
});
