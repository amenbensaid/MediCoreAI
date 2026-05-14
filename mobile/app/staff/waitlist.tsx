import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { staffApi, type StaffWaitlistEntry } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'File d’attente',
    secretaryEyebrow: 'Accueil patient',
    title: 'Demandes en attente',
    secretaryTitle: 'File d’attente accueil',
    subtitle: 'Proposez une place, confirmez un rendez-vous ou annulez une demande.',
    secretarySubtitle: 'Suivez les demandes patient, appelez si besoin et confirmez les places libérées.',
    all: 'Toutes',
    active: 'Actives',
    offered: 'Proposées',
    pending: 'En attente',
    calendar: 'Calendrier',
    dashboard: 'Accueil',
    offer: 'Proposer',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    online: 'En ligne',
    inPerson: 'Présentiel',
    position: 'Position',
    before: 'avant',
    expires: 'Expire',
    emptyTitle: 'Aucune demande active',
    emptyAllTitle: 'Aucune demande trouvée',
    emptyText: 'Les demandes patient apparaîtront ici dès qu’une place est demandée.',
    secretaryEmptyText: 'Les demandes à traiter par l’accueil apparaîtront ici.',
    loadError: 'Impossible de charger la file d’attente.',
    actionError: 'Action impossible sur cette demande.',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour gérer la file d’attente.',
    login: 'Se connecter',
    offerTitle: 'Proposer cette place ?',
    confirmTitle: 'Créer le rendez-vous ?',
    cancelTitle: 'Annuler cette demande ?',
    yes: 'Oui',
    no: 'Non',
    statusLabels: {
      pending: 'En attente',
      offered: 'Place proposée',
      accepted: 'Acceptée',
      cancelled: 'Annulée',
    },
  },
  en: {
    eyebrow: 'Waitlist',
    secretaryEyebrow: 'Front desk',
    title: 'Pending requests',
    secretaryTitle: 'Front desk waitlist',
    subtitle: 'Offer a slot, confirm an appointment or cancel a request.',
    secretarySubtitle: 'Track patient requests, call when needed and confirm released slots.',
    all: 'All',
    active: 'Active',
    offered: 'Offered',
    pending: 'Pending',
    calendar: 'Calendar',
    dashboard: 'Home',
    offer: 'Offer',
    confirm: 'Confirm',
    cancel: 'Cancel',
    online: 'Online',
    inPerson: 'In person',
    position: 'Position',
    before: 'before',
    expires: 'Expires',
    emptyTitle: 'No active request',
    emptyAllTitle: 'No request found',
    emptyText: 'Patient requests will appear here as soon as a slot is requested.',
    secretaryEmptyText: 'Requests handled by the front desk will appear here.',
    loadError: 'Unable to load waitlist.',
    actionError: 'Unable to update this request.',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to manage the waitlist.',
    login: 'Sign in',
    offerTitle: 'Offer this slot?',
    confirmTitle: 'Create appointment?',
    cancelTitle: 'Cancel this request?',
    yes: 'Yes',
    no: 'No',
    statusLabels: {
      pending: 'Pending',
      offered: 'Offered',
      accepted: 'Accepted',
      cancelled: 'Cancelled',
    },
  },
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
const getInitials = (name?: string | null) => (
  (name || 'Patient').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
);
const getStatusColor = (status?: string | null) => {
  if (status === 'offered') return '#10b981';
  if (status === 'cancelled') return '#e11d48';
  if (status === 'accepted') return '#64748b';
  return '#f59e0b';
};
const isSecretaryRole = (role?: string | null) => {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'secretary' || normalized === 'receptionist';
};

export default function StaffWaitlistScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [entries, setEntries] = useState<StaffWaitlistEntry[]>([]);
  const [filter, setFilter] = useState<'active' | 'pending' | 'offered' | 'all'>('active');
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const loadWaitlist = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await staffApi.getWaitlist(token, { status: filter });
      setEntries(response.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, t.loadError, t.title]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const session = staffSession.getSession();
  const isSecretary = isSecretaryRole(session.user?.role);

  const stats = useMemo(() => ({
    active: entries.length,
    pending: entries.filter((entry) => entry.status === 'pending').length,
    offered: entries.filter((entry) => entry.status === 'offered').length,
  }), [entries]);

  const sortedEntries = useMemo(() => (
    [...entries].sort((a, b) => (getDate(a.startTime)?.getTime() || 0) - (getDate(b.startTime)?.getTime() || 0))
  ), [entries]);

  const runAction = async (entry: StaffWaitlistEntry, action: 'offer' | 'confirm' | 'cancel') => {
    const token = staffSession.getToken();
    if (!token || actionLoading) return;
    setActionLoading(`${entry.id}:${action}`);
    try {
      if (action === 'offer') await staffApi.offerWaitlist(token, entry.id);
      if (action === 'confirm') await staffApi.confirmWaitlist(token, entry.id);
      if (action === 'cancel') await staffApi.cancelWaitlist(token, entry.id);
      await loadWaitlist(true);
    } catch {
      Alert.alert(t.title, t.actionError);
    } finally {
      setActionLoading('');
    }
  };

  const confirmAction = (entry: StaffWaitlistEntry, action: 'offer' | 'confirm' | 'cancel') => {
    const title = action === 'offer' ? t.offerTitle : action === 'confirm' ? t.confirmTitle : t.cancelTitle;
    Alert.alert(title, entry.patientName || 'Patient', [
      { text: t.no, style: 'cancel' },
      { text: t.yes, style: action === 'cancel' ? 'destructive' : 'default', onPress: () => runAction(entry, action) },
    ]);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWaitlist(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: isSecretary ? '#ccfbf1' : '#fff7ed' }]}>
          <Ionicons name={isSecretary ? 'headset-outline' : 'hourglass-outline'} size={25} color={isSecretary ? '#0f766e' : '#f59e0b'} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{isSecretary ? t.secretaryEyebrow : t.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{isSecretary ? t.secretaryTitle : t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{isSecretary ? t.secretarySubtitle : t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" icon="layers-outline" label={t.active} value={stats.active} />
        <StatCard color="#f59e0b" icon="time-outline" label={t.pending} value={stats.pending} />
        <StatCard color="#10b981" icon="checkmark-done-outline" label={t.offered} value={stats.offered} />
      </View>

      <View style={styles.navRow}>
        <Link href="/staff/calendar" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="calendar-number-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.calendar}</Text>
          </Pressable>
        </Link>
        <Link href="/staff/dashboard" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="home-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.dashboard}</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {([
          ['active', t.active],
          ['pending', t.pending],
          ['offered', t.offered],
          ['all', t.all],
        ] as const).map(([key, label]) => {
          const selected = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterButton, selected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.filterText, { color: selected ? '#fff' : colors.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sortedEntries.length > 0 ? (
        <View style={styles.list}>
          {sortedEntries.map((entry) => (
            <WaitlistCard
              key={entry.id}
              actionLoading={actionLoading}
              colors={colors}
              entry={entry}
              labels={t}
              language={language}
              onCancel={() => confirmAction(entry, 'cancel')}
              onConfirm={() => confirmAction(entry, 'confirm')}
              onOffer={() => confirmAction(entry, 'offer')}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="hourglass-outline" size={34} color="#f59e0b" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{filter === 'all' ? t.emptyAllTitle : t.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{isSecretary ? t.secretaryEmptyText : t.emptyText}</Text>
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
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function WaitlistCard({
  actionLoading,
  colors,
  entry,
  labels,
  language,
  onCancel,
  onConfirm,
  onOffer,
}: {
  actionLoading: string;
  colors: typeof mobileTheme.light;
  entry: StaffWaitlistEntry;
  labels: typeof copy.fr;
  language: PatientLanguage;
  onCancel: () => void;
  onConfirm: () => void;
  onOffer: () => void;
}) {
  const statusColor = getStatusColor(entry.status);
  const offered = entry.status === 'offered';
  const busy = actionLoading.startsWith(entry.id);
  const patientsBefore = Math.max((entry.position || 1) - 1, 0);

  return (
    <View style={[styles.waitlistCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: statusColor }]}>
      <View style={styles.cardTop}>
        <View style={[styles.dateBox, { backgroundColor: `${statusColor}16` }]}>
          <Text style={[styles.timeText, { color: statusColor }]}>{formatTime(entry.startTime, language)}</Text>
          <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(entry.startTime, language)}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.patientLine}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(entry.patientName)}</Text>
            </View>
            <View style={styles.patientText}>
              <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>{entry.patientName || 'Patient'}</Text>
              <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>{entry.appointmentType || 'Consultation'}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <Text style={[styles.statusChip, { backgroundColor: `${statusColor}18`, color: statusColor }]}>
              {labels.statusLabels[entry.status as keyof typeof labels.statusLabels] || entry.status || labels.pending}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: colors.surfaceAlt, color: colors.muted }]}>
              {entry.consultationMode === 'online' ? labels.online : labels.inPerson}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: colors.surfaceAlt, color: colors.muted }]}>
              {labels.position} {entry.position || 1}
            </Text>
          </View>
        </View>
      </View>

      {entry.reasonDetail || entry.reasonCategory ? (
        <Text style={[styles.detailText, { color: colors.text }]}>{entry.reasonDetail || entry.reasonCategory}</Text>
      ) : null}
      {entry.notes ? <Text style={[styles.noteText, { color: colors.muted }]}>{entry.notes}</Text> : null}
      {offered && entry.offerExpiresAt ? (
        <Text style={[styles.noteText, { color: statusColor }]}>{labels.expires}: {formatTime(entry.offerExpiresAt, language)}</Text>
      ) : null}
      <Text style={[styles.noteText, { color: colors.muted }]}>{patientsBefore} {labels.before}</Text>

      <View style={styles.actions}>
        <ActionButton color="#2563eb" disabled={busy || offered} icon="send-outline" label={labels.offer} onPress={onOffer} />
        <ActionButton color="#10b981" disabled={busy} icon="checkmark-outline" label={labels.confirm} onPress={onConfirm} />
        <ActionButton color="#e11d48" disabled={busy} icon="close-outline" label={labels.cancel} onPress={onCancel} />
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
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { borderRadius: 22, borderWidth: 1, flex: 1, minHeight: 108, padding: 13 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 11 },
  statLabel: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  navRow: { flexDirection: 'row', gap: 10 },
  navButton: { alignItems: 'center', borderRadius: 18, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  navButtonText: { fontSize: 13, fontWeight: '900' },
  filterBar: { borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 6, padding: 6 },
  filterButton: { alignItems: 'center', borderRadius: 15, flex: 1, minHeight: 38, justifyContent: 'center', paddingHorizontal: 6 },
  filterText: { fontSize: 11, fontWeight: '900' },
  loadingCard: { alignItems: 'center', borderRadius: 22, padding: 18 },
  list: { gap: 12 },
  waitlistCard: { borderLeftWidth: 5, borderRadius: 24, borderWidth: 1, gap: 11, padding: 14 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  dateBox: { alignItems: 'center', borderRadius: 17, justifyContent: 'center', minHeight: 68, width: 76 },
  timeText: { fontSize: 16, fontWeight: '900' },
  dateText: { fontSize: 11, fontWeight: '900', marginTop: 5, textAlign: 'center', textTransform: 'capitalize' },
  identity: { flex: 1, gap: 8, minWidth: 0 },
  patientLine: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  patientText: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 16, fontWeight: '900' },
  appointmentType: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  modeChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  detailText: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  noteText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  actionButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 34, paddingHorizontal: 11 },
  actionText: { fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 9, padding: 26 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyText: { fontSize: 14, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
});
