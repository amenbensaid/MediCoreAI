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
import { patientWaitlistApi } from '@/src/api/waitlist';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';
import type { PatientWaitlistEntry } from '@/src/types/waitlist';

const copy = {
  fr: {
    eyebrow: 'File patient',
    title: 'Mes demandes en attente',
    subtitle: 'Suivez vos demandes, votre position et les places libérées proposées par le cabinet.',
    all: 'Toutes',
    active: 'Actives',
    pending: 'En attente',
    offered: 'Proposées',
    accepted: 'Acceptées',
    findSlot: 'Chercher un créneau',
    appointments: 'Mes rendez-vous',
    position: 'Position',
    beforeYou: 'patient(s) avant vous',
    online: 'En ligne',
    inPerson: 'Présentiel',
    accept: 'Accepter',
    decline: 'Refuser',
    details: 'Détails',
    offerTitle: 'Place disponible',
    offerText: 'Une place est disponible pour cette demande.',
    offerExpires: 'Expire à',
    acceptConfirm: 'Accepter cette place et créer le rendez-vous ?',
    declineConfirm: 'Refuser cette place et laisser passer au patient suivant ?',
    yes: 'Oui',
    no: 'Non',
    emptyTitle: 'Aucune demande active',
    emptyAllTitle: 'Aucune demande trouvée',
    emptyText: 'Quand vous rejoignez une file d’attente, vos demandes apparaissent ici.',
    loginTitle: 'Connexion patient requise',
    loginText: 'Connectez-vous pour consulter vos demandes en attente.',
    login: 'Se connecter',
    loadError: 'Impossible de charger vos demandes.',
    actionError: 'Action impossible sur cette demande.',
    actionSuccess: 'Demande mise à jour.',
    statuses: {
      pending: 'En attente',
      offered: 'Place proposée',
      accepted: 'Acceptée',
      declined: 'Refusée',
      expired: 'Expirée',
      cancelled: 'Annulée',
    },
  },
  en: {
    eyebrow: 'Patient waitlist',
    title: 'My pending requests',
    subtitle: 'Track your requests, queue position, and available offers from the practice.',
    all: 'All',
    active: 'Active',
    pending: 'Pending',
    offered: 'Offered',
    accepted: 'Accepted',
    findSlot: 'Find a slot',
    appointments: 'My appointments',
    position: 'Position',
    beforeYou: 'patient(s) before you',
    online: 'Online',
    inPerson: 'In person',
    accept: 'Accept',
    decline: 'Decline',
    details: 'Details',
    offerTitle: 'Slot available',
    offerText: 'A slot is available for this request.',
    offerExpires: 'Expires at',
    acceptConfirm: 'Accept this offer and create the appointment?',
    declineConfirm: 'Decline this offer and let the next patient take it?',
    yes: 'Yes',
    no: 'No',
    emptyTitle: 'No active request',
    emptyAllTitle: 'No request found',
    emptyText: 'When you join a waitlist, your requests will appear here.',
    loginTitle: 'Patient login required',
    loginText: 'Sign in to view your pending requests.',
    login: 'Sign in',
    loadError: 'Unable to load your requests.',
    actionError: 'Unable to update this request.',
    actionSuccess: 'Request updated.',
    statuses: {
      pending: 'Pending',
      offered: 'Offered',
      accepted: 'Accepted',
      declined: 'Declined',
      expired: 'Expired',
      cancelled: 'Cancelled',
    },
  },
};

type Filter = 'active' | 'pending' | 'offered' | 'all';

const activeStatuses = ['pending', 'offered'];
const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');
const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString(getLocale(language), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};
const formatTime = (value: string | null | undefined, language: PatientLanguage) => {
  const date = parseDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString(getLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
  });
};
const getStatusColor = (status?: string | null) => {
  if (status === 'offered') return '#10b981';
  if (status === 'accepted') return '#2563eb';
  if (status === 'declined' || status === 'expired' || status === 'cancelled') return '#e11d48';
  return '#f59e0b';
};

export default function PatientWaitlistScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [entries, setEntries] = useState<PatientWaitlistEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const loadWaitlist = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await patientWaitlistApi.getMyWaitlist(token);
      setEntries(response.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (filter === 'active') return activeStatuses.includes(entry.status);
      if (filter === 'pending') return entry.status === 'pending';
      if (filter === 'offered') return entry.status === 'offered';
      return true;
    });

    return filtered.sort((a, b) => (
      (parseDate(a.startTime)?.getTime() || 0) - (parseDate(b.startTime)?.getTime() || 0)
    ));
  }, [entries, filter]);

  const stats = useMemo(() => ({
    active: entries.filter((entry) => activeStatuses.includes(entry.status)).length,
    pending: entries.filter((entry) => entry.status === 'pending').length,
    offered: entries.filter((entry) => entry.status === 'offered').length,
  }), [entries]);

  const runDecision = async (entry: PatientWaitlistEntry, action: 'accept' | 'decline') => {
    const token = patientSession.getToken();
    if (!token || actionLoading) return;

    setActionLoading(`${entry.id}:${action}`);
    try {
      if (action === 'accept') await patientWaitlistApi.acceptOffer(entry.id, token);
      else await patientWaitlistApi.declineOffer(entry.id, token);
      await loadWaitlist(true);
      Alert.alert(t.title, t.actionSuccess);
    } catch {
      Alert.alert(t.title, t.actionError);
    } finally {
      setActionLoading('');
    }
  };

  const confirmDecision = (entry: PatientWaitlistEntry, action: 'accept' | 'decline') => {
    Alert.alert(
      action === 'accept' ? t.accept : t.decline,
      action === 'accept' ? t.acceptConfirm : t.declineConfirm,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: () => runDecision(entry, action),
        },
      ],
    );
  };

  if (!patientSession.getToken()) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.loginText}</Text>
          <Pressable onPress={() => router.replace('/auth/patient-login' as never)} style={styles.primaryButton}>
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
        <View style={styles.heroIcon}>
          <Ionicons name="hourglass-outline" size={27} color="#f59e0b" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" icon="layers-outline" label={t.active} value={stats.active} />
        <StatCard color="#f59e0b" icon="time-outline" label={t.pending} value={stats.pending} />
        <StatCard color="#10b981" icon="checkmark-done-outline" label={t.offered} value={stats.offered} />
      </View>

      <View style={styles.navRow}>
        <Link href="/patient/doctors" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="search-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.findSlot}</Text>
          </Pressable>
        </Link>
        <Link href="/patient/appointments" asChild>
          <Pressable style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>{t.appointments}</Text>
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
      ) : filteredEntries.length > 0 ? (
        <View style={styles.list}>
          {filteredEntries.map((entry) => (
            <WaitlistCard
              key={entry.id}
              actionLoading={actionLoading}
              colors={colors}
              entry={entry}
              labels={t}
              language={language}
              onAccept={() => confirmDecision(entry, 'accept')}
              onDecline={() => confirmDecision(entry, 'decline')}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="hourglass-outline" size={38} color="#f59e0b" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{filter === 'all' ? t.emptyAllTitle : t.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.emptyText}</Text>
          <Link href="/patient/doctors" asChild>
            <Pressable style={styles.emptyButton}>
              <Text style={styles.primaryButtonText}>{t.findSlot}</Text>
            </Pressable>
          </Link>
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
  onAccept,
  onDecline,
}: {
  actionLoading: string;
  colors: typeof mobileTheme.light;
  entry: PatientWaitlistEntry;
  labels: typeof copy.fr;
  language: PatientLanguage;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const statusColor = getStatusColor(entry.status);
  const offered = entry.status === 'offered';
  const pending = entry.status === 'pending';
  const busy = actionLoading.startsWith(entry.id);
  const patientsBefore = Math.max((entry.position || 1) - 1, 0);

  return (
    <View style={[
      styles.waitlistCard,
      {
        backgroundColor: colors.surface,
        borderColor: offered ? '#bbf7d0' : colors.border,
        borderLeftColor: statusColor,
      },
      offered && styles.offeredCard,
    ]}>
      <View style={styles.cardTop}>
        <View style={[styles.dateBox, { backgroundColor: `${statusColor}16` }]}>
          <Text style={[styles.timeText, { color: statusColor }]}>{formatTime(entry.startTime, language)}</Text>
          <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(entry.startTime, language)}</Text>
        </View>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.practitioner, { color: colors.text }]}>
            {entry.practitioner || 'Praticien'}
          </Text>
          <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>
            {entry.appointmentType || 'Consultation'}{entry.specialty ? ` · ${entry.specialty}` : ''}
          </Text>
          <View style={styles.chipRow}>
            <Text style={[styles.statusChip, { backgroundColor: `${statusColor}18`, color: statusColor }]}>
              {labels.statuses[entry.status as keyof typeof labels.statuses] || entry.status}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: colors.surfaceAlt, color: colors.muted }]}>
              {entry.consultationMode === 'online' ? labels.online : labels.inPerson}
            </Text>
          </View>
        </View>
      </View>

      {offered ? (
        <View style={styles.offerBox}>
          <Ionicons name="sparkles-outline" size={17} color="#047857" />
          <View style={styles.offerCopy}>
            <Text style={styles.offerTitle}>{labels.offerTitle}</Text>
            <Text style={styles.offerText}>
              {labels.offerText}
              {entry.offerExpiresAt ? ` ${labels.offerExpires} ${formatTime(entry.offerExpiresAt, language)}.` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {pending ? (
        <View style={[styles.positionBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.positionValue, { color: colors.text }]}>{entry.position || 1}</Text>
          <Text style={[styles.positionText, { color: colors.muted }]}>
            {labels.position} · {patientsBefore} {labels.beforeYou}
          </Text>
        </View>
      ) : null}

      {entry.reasonDetail || entry.reasonCategory ? (
        <Text style={[styles.detailText, { color: colors.text }]}>{entry.reasonDetail || entry.reasonCategory}</Text>
      ) : null}
      {entry.notes ? <Text style={[styles.noteText, { color: colors.muted }]}>{entry.notes}</Text> : null}

      {offered ? (
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={onDecline} style={[styles.secondaryAction, busy && styles.disabledButton]}>
            <Text style={styles.secondaryActionText}>{labels.decline}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={onAccept} style={[styles.primaryAction, busy && styles.disabledButton]}>
            <Text style={styles.primaryActionText}>{labels.accept}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 15, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  heroCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  heroIcon: { alignItems: 'center', backgroundColor: '#fff7ed', borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  heroTitle: { fontSize: 27, fontWeight: '900', lineHeight: 33, marginTop: 4 },
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
  waitlistCard: { borderLeftWidth: 5, borderRadius: 24, borderWidth: 1, gap: 12, padding: 14 },
  offeredCard: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  dateBox: { alignItems: 'center', borderRadius: 17, justifyContent: 'center', minHeight: 68, width: 76 },
  timeText: { fontSize: 16, fontWeight: '900' },
  dateText: { fontSize: 11, fontWeight: '900', marginTop: 5, textAlign: 'center', textTransform: 'capitalize' },
  identity: { flex: 1, gap: 7, minWidth: 0 },
  practitioner: { fontSize: 16, fontWeight: '900' },
  appointmentType: { fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  modeChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  offerBox: { alignItems: 'flex-start', backgroundColor: '#ecfdf5', borderColor: '#bbf7d0', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  offerCopy: { flex: 1, minWidth: 0 },
  offerTitle: { color: '#047857', fontSize: 13, fontWeight: '900' },
  offerText: { color: '#047857', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 2 },
  positionBox: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 10, padding: 12 },
  positionValue: { fontSize: 20, fontWeight: '900' },
  positionText: { flex: 1, fontSize: 12, fontWeight: '800' },
  detailText: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  noteText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryAction: { alignItems: 'center', backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 46, justifyContent: 'center' },
  secondaryActionText: { color: '#475569', fontWeight: '900' },
  primaryAction: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 16, flex: 1, minHeight: 46, justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 9, padding: 26 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyText: { fontSize: 14, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
  emptyButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 16, marginTop: 8, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
});
