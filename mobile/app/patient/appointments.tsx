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
import { patientApi, type PatientAppointment } from '@/src/api/patient';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';

const copy = {
  fr: {
    badge: 'Agenda patient',
    title: 'Mes rendez-vous',
    subtitle: 'Visualisez les rendez-vous à venir, leur validation et le mode de consultation.',
    book: 'Prendre rendez-vous',
    history: 'Historique',
    upcoming: 'À venir',
    pending: 'À valider',
    confirmed: 'Confirmés',
    online: 'En ligne',
    onlineSection: 'Rendez-vous en ligne',
    onlineSubtitle: 'Accès rapide aux téléconsultations Jitsi.',
    jitsiReady: 'Jitsi prêt',
    waitingJitsi: 'En attente validation médecin',
    inPerson: 'Présentiel',
    emptyTitle: 'Aucun rendez-vous à venir',
    emptyText: 'Réservez un nouveau créneau avec un praticien disponible.',
    cancel: 'Annuler',
    cancelConfirm: 'Voulez-vous annuler ce rendez-vous ?',
    join: 'Rejoindre',
    details: 'Détails',
    reason: 'Motif',
    preparation: 'Préparation',
    documents: 'Documents demandés',
    payment: 'Paiement',
    loginTitle: 'Connexion requise',
    loginText: 'Connectez-vous pour consulter vos rendez-vous.',
    login: 'Se connecter',
    loadError: 'Impossible de charger les rendez-vous.',
    cancelError: 'Impossible d’annuler ce rendez-vous.',
  },
  en: {
    badge: 'Patient schedule',
    title: 'My appointments',
    subtitle: 'View upcoming appointments, approval status and consultation mode.',
    book: 'Book appointment',
    history: 'History',
    upcoming: 'Upcoming',
    pending: 'Pending',
    confirmed: 'Confirmed',
    online: 'Online',
    onlineSection: 'Online appointments',
    onlineSubtitle: 'Quick access to Jitsi teleconsultations.',
    jitsiReady: 'Jitsi ready',
    waitingJitsi: 'Waiting doctor approval',
    inPerson: 'In person',
    emptyTitle: 'No upcoming appointment',
    emptyText: 'Book a new slot with an available practitioner.',
    cancel: 'Cancel',
    cancelConfirm: 'Do you want to cancel this appointment?',
    join: 'Join',
    details: 'Details',
    reason: 'Reason',
    preparation: 'Preparation',
    documents: 'Requested documents',
    payment: 'Payment',
    loginTitle: 'Login required',
    loginText: 'Sign in to view your appointments.',
    login: 'Sign in',
    loadError: 'Unable to load appointments.',
    cancelError: 'Unable to cancel this appointment.',
  },
};

const statusLabels = {
  fr: {
    awaiting_approval: 'À valider',
    scheduled: 'Planifié',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    no_show: 'Absent',
  },
  en: {
    awaiting_approval: 'Pending',
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  },
};

const statusTone = (status: string) => {
  if (status === 'confirmed') return { bg: '#dcfce7', color: '#047857' };
  if (status === 'awaiting_approval' || status === 'scheduled') return { bg: '#fef3c7', color: '#b45309' };
  if (status === 'cancelled' || status === 'no_show') return { bg: '#ffe4e6', color: '#be123c' };
  return { bg: '#dbeafe', color: '#1d4ed8' };
};

const isUpcoming = (appointment: PatientAppointment) => {
  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) return false;
  const date = new Date(appointment.endTime || appointment.startTime);
  return Number.isNaN(date.getTime()) || date.getTime() >= Date.now();
};

const formatDateParts = (value: string, language: 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: value, time: '' };
  return {
    day: date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
    }),
    time: date.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const t = copy[language];
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'online'>('all');

  const loadAppointments = useCallback(async (isRefresh = false) => {
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
    loadAppointments();
  }, [loadAppointments]);

  const upcomingAppointments = useMemo(
    () => appointments.filter(isUpcoming),
    [appointments],
  );

  const filteredAppointments = useMemo(() => upcomingAppointments.filter((appointment) => {
    if (filter === 'pending') return ['awaiting_approval', 'scheduled'].includes(appointment.status);
    if (filter === 'confirmed') return appointment.status === 'confirmed';
    if (filter === 'online') return appointment.consultationMode === 'online';
    return true;
  }), [filter, upcomingAppointments]);

  const stats = useMemo(() => ({
    upcoming: upcomingAppointments.length,
    pending: upcomingAppointments.filter((item) => ['awaiting_approval', 'scheduled'].includes(item.status)).length,
    confirmed: upcomingAppointments.filter((item) => item.status === 'confirmed').length,
    online: upcomingAppointments.filter((item) => item.consultationMode === 'online').length,
  }), [upcomingAppointments]);
  const onlineAppointments = useMemo(() => (
    upcomingAppointments
      .filter((item) => item.consultationMode === 'online')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 3)
  ), [upcomingAppointments]);

  const cancelAppointment = (appointment: PatientAppointment) => {
    const token = patientSession.getToken();
    if (!token) return;

    Alert.alert(t.cancel, t.cancelConfirm, [
      { text: t.details, style: 'cancel' },
      {
        text: t.cancel,
        style: 'destructive',
        onPress: async () => {
          try {
            await patientApi.cancelAppointment(appointment.id, token);
            loadAppointments(true);
          } catch {
            Alert.alert(t.title, t.cancelError);
          }
        },
      },
    ]);
  };

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAppointments(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroBadge}>{t.badge}</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.description}>{t.subtitle}</Text>
        <View style={styles.heroActions}>
          <Link href="/patient/doctors" asChild>
            <Pressable style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonText}>+ {t.book}</Text>
            </Pressable>
          </Link>
          <Link href="/patient/history" asChild>
            <Pressable style={styles.secondaryButtonSmall}>
              <Text style={styles.secondaryButtonText}>{t.history}</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t.upcoming} value={stats.upcoming} color="#2563eb" />
        <StatCard label={t.pending} value={stats.pending} color="#f59e0b" />
        <StatCard label={t.confirmed} value={stats.confirmed} color="#10b981" />
        <StatCard label={t.online} value={stats.online} color="#06b6d4" />
      </View>

      {onlineAppointments.length > 0 ? (
        <View style={styles.onlinePanel}>
          <View style={styles.onlinePanelHeader}>
            <View>
              <Text style={styles.onlinePanelTitle}>{t.onlineSection}</Text>
              <Text style={styles.onlinePanelText}>{t.onlineSubtitle}</Text>
            </View>
            <Pressable onPress={() => setFilter('online')} style={styles.onlineFilterButton}>
              <Text style={styles.onlineFilterText}>{t.online}</Text>
            </Pressable>
          </View>
          <View style={styles.onlineList}>
            {onlineAppointments.map((appointment) => (
              <OnlineSessionCard
                key={appointment.id}
                appointment={appointment}
                language={language}
                onOpen={() => router.push(`/patient/appointment/${appointment.id}` as never)}
                t={t}
              />
            ))}
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['all', 'pending', 'confirmed', 'online'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item === 'all' ? t.upcoming : item === 'pending' ? t.pending : item === 'confirmed' ? t.confirmed : t.online}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.upcoming}</Text>
        {loading ? <ActivityIndicator color="#2563eb" /> : null}
      </View>

      {!loading && filteredAppointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>□</Text>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
          <Link href="/patient/doctors" asChild>
            <Pressable style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonText}>+ {t.book}</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              language={language}
              onCancel={() => cancelAppointment(appointment)}
              onOpen={() => router.push(`/patient/appointment/${appointment.id}` as never)}
              t={t}
            />
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

function OnlineSessionCard({
  appointment,
  language,
  onOpen,
  t,
}: {
  appointment: PatientAppointment;
  language: 'fr' | 'en';
  onOpen: () => void;
  t: typeof copy.fr;
}) {
  const date = formatDateParts(appointment.startTime, language);
  const ready = Boolean(appointment.meetLink) && appointment.status === 'confirmed';

  return (
    <Pressable onPress={onOpen} style={styles.onlineCard}>
      <View style={styles.onlineIcon}>
        <Text style={styles.onlineIconText}>▶</Text>
      </View>
      <View style={styles.onlineCardBody}>
        <Text numberOfLines={1} style={styles.onlineDoctor}>{appointment.practitioner || 'Dr.'}</Text>
        <Text style={styles.onlineMeta}>{date.day} · {date.time}</Text>
        <Text style={[styles.onlineStatus, ready ? styles.onlineStatusReady : styles.onlineStatusPending]}>
          {ready ? t.jitsiReady : t.waitingJitsi}
        </Text>
      </View>
      {ready ? (
        <Pressable onPress={() => Linking.openURL(appointment.meetLink || '')} style={styles.onlineJoinButton}>
          <Text style={styles.onlineJoinText}>{t.join}</Text>
        </Pressable>
      ) : (
        <Text style={styles.onlineChevron}>›</Text>
      )}
    </Pressable>
  );
}

function AppointmentCard({
  appointment,
  language,
  onCancel,
  onOpen,
  t,
}: {
  appointment: PatientAppointment;
  language: 'fr' | 'en';
  onCancel: () => void;
  onOpen: () => void;
  t: typeof copy.fr;
}) {
  const date = formatDateParts(appointment.startTime, language);
  const tone = statusTone(appointment.status);
  const statusLabel = statusLabels[language][appointment.status as keyof typeof statusLabels.fr] || appointment.status;
  const requestedDocs = appointment.requestedDocuments || [];
  const canCancel = !['cancelled', 'completed', 'no_show'].includes(appointment.status);

  return (
    <Pressable onPress={onOpen} style={styles.appointmentCard}>
      <View style={styles.cardTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{date.day}</Text>
          <Text style={styles.dateTime}>{date.time}</Text>
        </View>
        <View style={styles.cardMain}>
          <View style={styles.cardTitleRow}>
            <Text numberOfLines={1} style={styles.doctorName}>{appointment.practitioner || 'Dr.'}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: tone.bg, color: tone.color }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.appointmentType}>{appointment.type}</Text>
          <Text style={styles.metaLine}>
            {appointment.consultationMode === 'online' ? t.online : t.inPerson}
            {appointment.specialty ? ` · ${appointment.specialty}` : ''}
          </Text>
        </View>
      </View>

      {(appointment.reasonDetail || appointment.preparationNotes || requestedDocs.length > 0) ? (
        <View style={styles.detailsBox}>
          {appointment.reasonDetail ? <InfoLine label={t.reason} value={appointment.reasonDetail} /> : null}
          {appointment.preparationNotes ? <InfoLine label={t.preparation} value={appointment.preparationNotes} /> : null}
          {requestedDocs.length > 0 ? <InfoLine label={t.documents} value={requestedDocs.join(', ')} /> : null}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.paymentText}>
          {appointment.paymentStatus ? `${t.payment}: ${appointment.paymentStatus}` : ''}
        </Text>
        <View style={styles.actionRow}>
          {appointment.meetLink ? (
            <Pressable onPress={() => Linking.openURL(appointment.meetLink || '')} style={styles.joinButton}>
              <Text style={styles.joinButtonText}>{t.join}</Text>
            </Pressable>
          ) : null}
          {canCancel ? (
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
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
  heroCard: { backgroundColor: '#2563eb', borderRadius: 30, overflow: 'hidden', padding: 22 },
  heroBadge: { color: '#dbeafe', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 16 },
  description: { color: '#dbeafe', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonSmall: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, flex: 1, padding: 14 },
  primaryButtonText: { color: '#2563eb', fontWeight: '900' },
  secondaryButtonSmall: { alignItems: 'center', borderColor: '#93c5fd', borderRadius: 18, borderWidth: 1, flex: 1, padding: 14 },
  secondaryButtonText: { color: '#fff', fontWeight: '900' },
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
  onlinePanel: { backgroundColor: '#0f172a', borderRadius: 28, gap: 12, padding: 16 },
  onlinePanelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  onlinePanelTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  onlinePanelText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 3 },
  onlineFilterButton: { backgroundColor: '#1d4ed8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  onlineFilterText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  onlineList: { gap: 9 },
  onlineCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, flexDirection: 'row', gap: 10, padding: 11 },
  onlineIcon: { alignItems: 'center', backgroundColor: '#dbeafe', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  onlineIconText: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
  onlineCardBody: { flex: 1, minWidth: 0 },
  onlineDoctor: { color: '#020617', fontSize: 14, fontWeight: '900' },
  onlineMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 2 },
  onlineStatus: { fontSize: 11, fontWeight: '900', marginTop: 4 },
  onlineStatusReady: { color: '#059669' },
  onlineStatusPending: { color: '#d97706' },
  onlineJoinButton: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  onlineJoinText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  onlineChevron: { color: '#94a3b8', fontSize: 26, fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  list: { gap: 12 },
  appointmentCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 13 },
  dateBox: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 18, justifyContent: 'center', minHeight: 72, width: 78 },
  dateDay: { color: '#2563eb', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  dateTime: { color: '#2563eb', fontSize: 13, fontWeight: '900', marginTop: 2 },
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
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  paymentText: { color: '#94a3b8', flex: 1, fontSize: 11, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8 },
  joinButton: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  joinButtonText: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  cancelButton: { backgroundColor: '#fff1f2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  cancelButtonText: { color: '#e11d48', fontSize: 11, fontWeight: '900' },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 26 },
  emptyIcon: { color: '#2563eb', fontSize: 38, fontWeight: '900' },
  emptyTitle: { color: '#020617', fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8, textAlign: 'center' },
});
