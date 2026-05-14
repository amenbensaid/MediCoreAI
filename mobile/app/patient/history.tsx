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
import { patientApi, type PatientAppointment } from '@/src/api/patient';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';

const copy = {
  fr: {
    badge: 'Historique médical',
    title: 'Historique',
    subtitle: 'Retrouvez vos consultations passées, rendez-vous annulés et informations de suivi.',
    appointments: 'Rendez-vous',
    completed: 'Terminés',
    cancelled: 'Annulés',
    online: 'En ligne',
    all: 'Tous',
    documents: 'Documents',
    upcoming: 'Rendez-vous',
    emptyTitle: 'Aucun historique',
    emptyText: 'Vos consultations passées apparaîtront ici après vos rendez-vous.',
    reason: 'Motif',
    preparation: 'Préparation',
    notes: 'Notes',
    payment: 'Paiement',
    loginTitle: 'Connexion requise',
    loginText: 'Connectez-vous pour consulter votre historique.',
    login: 'Se connecter',
    loadError: 'Impossible de charger l’historique.',
    statuses: {
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent',
      awaiting_approval: 'À valider',
      scheduled: 'Planifié',
      confirmed: 'Confirmé',
      in_progress: 'En cours',
    },
  },
  en: {
    badge: 'Medical history',
    title: 'History',
    subtitle: 'Review past consultations, cancelled appointments and follow-up information.',
    appointments: 'Appointments',
    completed: 'Completed',
    cancelled: 'Cancelled',
    online: 'Online',
    all: 'All',
    documents: 'Documents',
    upcoming: 'Appointments',
    emptyTitle: 'No history yet',
    emptyText: 'Past consultations will appear here after your appointments.',
    reason: 'Reason',
    preparation: 'Preparation',
    notes: 'Notes',
    payment: 'Payment',
    loginTitle: 'Login required',
    loginText: 'Sign in to view your history.',
    login: 'Sign in',
    loadError: 'Unable to load history.',
    statuses: {
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No-show',
      awaiting_approval: 'Pending',
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      in_progress: 'In progress',
    },
  },
};

const isHistory = (appointment: PatientAppointment) => {
  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) return true;
  const date = new Date(appointment.endTime || appointment.startTime);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

const formatDate = (value: string, language: 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusTone = (status: string) => {
  if (status === 'completed') return { bg: '#dcfce7', color: '#047857' };
  if (status === 'cancelled' || status === 'no_show') return { bg: '#ffe4e6', color: '#be123c' };
  return { bg: '#dbeafe', color: '#1d4ed8' };
};

export default function PatientHistoryScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const t = copy[language];
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled' | 'online'>('all');

  const loadHistory = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await patientApi.getMyAppointments(token);
      setAppointments(response.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const history = useMemo(() => appointments.filter(isHistory), [appointments]);
  const filteredHistory = useMemo(() => history.filter((appointment) => {
    if (filter === 'completed') return appointment.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'no_show'].includes(appointment.status);
    if (filter === 'online') return appointment.consultationMode === 'online';
    return true;
  }), [filter, history]);

  const stats = useMemo(() => ({
    total: history.length,
    completed: history.filter((item) => item.status === 'completed').length,
    cancelled: history.filter((item) => ['cancelled', 'no_show'].includes(item.status)).length,
    online: history.filter((item) => item.consultationMode === 'online').length,
  }), [history]);

  if (!patientSession.getToken()) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.loginCard}>
          <Text style={styles.heroBadge}>{t.badge}</Text>
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.description}>{t.loginText}</Text>
          <Pressable onPress={() => router.push('/auth/patient-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroBadge}>{t.badge}</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.description}>{t.subtitle}</Text>
        <View style={styles.heroActions}>
          <Link href="/patient/appointments" asChild>
            <Pressable style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonSmallText}>{t.upcoming}</Text>
            </Pressable>
          </Link>
          <Link href="/patient/documents" asChild>
            <Pressable style={styles.secondaryButtonSmall}>
              <Text style={styles.secondaryButtonText}>{t.documents}</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t.appointments} value={stats.total} color="#2563eb" />
        <StatCard label={t.completed} value={stats.completed} color="#10b981" />
        <StatCard label={t.cancelled} value={stats.cancelled} color="#f43f5e" />
        <StatCard label={t.online} value={stats.online} color="#06b6d4" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['all', 'completed', 'cancelled', 'online'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item === 'all' ? t.all : item === 'completed' ? t.completed : item === 'cancelled' ? t.cancelled : t.online}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.title}</Text>
        {loading ? <ActivityIndicator color="#2563eb" /> : null}
      </View>

      {!loading && filteredHistory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>□</Text>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredHistory.map((appointment) => (
            <HistoryCard key={appointment.id} appointment={appointment} language={language} t={t} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statLine, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HistoryCard({
  appointment,
  language,
  t,
}: {
  appointment: PatientAppointment;
  language: 'fr' | 'en';
  t: typeof copy.fr;
}) {
  const tone = statusTone(appointment.status);
  const status = t.statuses[appointment.status as keyof typeof t.statuses] || appointment.status;

  return (
    <View style={styles.historyCard}>
      <View style={styles.cardTop}>
        <View style={styles.timelineDot}>
          <Text style={styles.timelineText}>{appointment.consultationMode === 'online' ? 'ON' : 'IN'}</Text>
        </View>
        <View style={styles.cardMain}>
          <View style={styles.cardTitleRow}>
            <Text numberOfLines={1} style={styles.doctorName}>{appointment.practitioner || 'Dr.'}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: tone.bg, color: tone.color }]}>{status}</Text>
          </View>
          <Text style={styles.appointmentType}>{appointment.type}</Text>
          <Text style={styles.metaLine}>{formatDate(appointment.startTime, language)}</Text>
        </View>
      </View>

      <View style={styles.detailsBox}>
        {appointment.reasonDetail ? <InfoLine label={t.reason} value={appointment.reasonDetail} /> : null}
        {appointment.preparationNotes ? <InfoLine label={t.preparation} value={appointment.preparationNotes} /> : null}
        {appointment.notes ? <InfoLine label={t.notes} value={appointment.notes} /> : null}
        {appointment.paymentStatus ? <InfoLine label={t.payment} value={appointment.paymentStatus} /> : null}
      </View>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, gap: 16, padding: 20, paddingBottom: 42, paddingTop: 8 },
  centerScreen: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  heroCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 30, borderWidth: 1, padding: 22 },
  heroBadge: { color: '#2563eb', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#020617', fontSize: 32, fontWeight: '900', marginTop: 16 },
  description: { color: '#64748b', fontSize: 15, fontWeight: '600', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButtonSmall: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, flex: 1, padding: 14 },
  primaryButtonSmallText: { color: '#fff', fontWeight: '900' },
  secondaryButtonSmall: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 18, flex: 1, padding: 14 },
  secondaryButtonText: { color: '#2563eb', fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 22, borderWidth: 1, minHeight: 102, padding: 14, width: '48.4%' },
  statLine: { borderRadius: 999, height: 4, marginBottom: 14, width: 34 },
  statValue: { color: '#020617', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  filterRow: { gap: 8 },
  filterChip: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  filterChipTextActive: { color: '#fff' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  list: { gap: 12 },
  historyCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 13 },
  timelineDot: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 18, height: 62, justifyContent: 'center', width: 62 },
  timelineText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  doctorName: { color: '#020617', flex: 1, fontSize: 17, fontWeight: '900' },
  statusBadge: { borderRadius: 999, fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  appointmentType: { color: '#334155', fontSize: 14, fontWeight: '900', marginTop: 5 },
  metaLine: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 4 },
  detailsBox: { backgroundColor: '#f8fafc', borderRadius: 18, gap: 8, marginTop: 12, padding: 12 },
  infoLine: { gap: 2 },
  infoLabel: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#475569', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 26 },
  emptyIcon: { color: '#2563eb', fontSize: 38, fontWeight: '900' },
  emptyTitle: { color: '#020617', fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8, textAlign: 'center' },
});
