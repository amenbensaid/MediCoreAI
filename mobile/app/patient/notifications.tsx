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
import { notificationsApi, type PatientNotification } from '@/src/api/notifications';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';

const copy = {
  fr: {
    badge: 'Centre de notifications',
    title: 'Notifications',
    subtitle: 'Suivez les rappels de rendez-vous, documents et décisions importantes.',
    unread: 'Non lues',
    total: 'Total',
    appointments: 'Rendez-vous',
    documents: 'Documents',
    latest: 'Dernières notifications',
    emptyTitle: 'Aucune notification',
    emptyText: 'Les rappels et alertes importantes apparaîtront ici.',
    markRead: 'Marquer lu',
    open: 'Ouvrir',
    read: 'Lu',
    unreadBadge: 'Nouveau',
    loginTitle: 'Connexion requise',
    loginText: 'Connectez-vous pour consulter vos notifications.',
    login: 'Se connecter',
    loadError: 'Impossible de charger les notifications.',
    markError: 'Impossible de marquer cette notification.',
  },
  en: {
    badge: 'Notification center',
    title: 'Notifications',
    subtitle: 'Track appointment reminders, documents and important decisions.',
    unread: 'Unread',
    total: 'Total',
    appointments: 'Appointments',
    documents: 'Documents',
    latest: 'Latest notifications',
    emptyTitle: 'No notifications',
    emptyText: 'Important reminders and alerts will appear here.',
    markRead: 'Mark read',
    open: 'Open',
    read: 'Read',
    unreadBadge: 'New',
    loginTitle: 'Login required',
    loginText: 'Sign in to view your notifications.',
    login: 'Sign in',
    loadError: 'Unable to load notifications.',
    markError: 'Unable to mark this notification.',
  },
};

const getTone = (type: string) => {
  if (type === 'appointment') return { color: '#2563eb', bg: '#dbeafe', label: 'RDV' };
  if (type === 'warning') return { color: '#d97706', bg: '#fef3c7', label: '!' };
  if (type === 'success') return { color: '#059669', bg: '#d1fae5', label: 'OK' };
  if (type === 'document') return { color: '#7c3aed', bg: '#ede9fe', label: 'DOC' };
  return { color: '#475569', bg: '#f1f5f9', label: 'INFO' };
};

const formatDate = (value: string, language: 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const resolveNotificationRoute = (notification: PatientNotification) => {
  const appointmentId = typeof notification.metadata?.appointmentId === 'string'
    ? notification.metadata.appointmentId
    : typeof notification.metadata?.appointmentId === 'number'
      ? String(notification.metadata.appointmentId)
      : '';
  const url = String(notification.url || '').trim();

  if (appointmentId) return `/patient/appointment/${appointmentId}`;
  if (!url || url === '/' || url === '/patient/portal') return '/patient/home';
  if (url === '/appointments' || url === '/patient/appointments') return '/patient/appointments';
  if (url.startsWith('/patient/appointments/')) {
    return url.replace('/patient/appointments/', '/patient/appointment/');
  }
  if (url.includes('documents')) return '/patient/documents';
  if (url.startsWith('/patient/')) return url;
  return null;
};

export default function PatientNotificationsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const t = copy[language];
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await notificationsApi.getPatientNotifications(token);
      setNotifications(response.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const stats = useMemo(() => ({
    unread: notifications.filter((item) => !item.read).length,
    total: notifications.length,
    appointments: notifications.filter((item) => item.type === 'appointment').length,
    documents: notifications.filter((item) => item.type === 'document' || String(item.url || '').includes('documents')).length,
  }), [notifications]);

  const markRead = async (notification: PatientNotification) => {
    const token = patientSession.getToken();
    if (!token || notification.read) return;

    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, read: true, readAt: new Date().toISOString() } : item
    )));

    try {
      await notificationsApi.markPatientNotificationRead(notification.id, token);
    } catch {
      Alert.alert(t.title, t.markError);
      loadNotifications(true);
    }
  };

  const openNotification = async (notification: PatientNotification) => {
    await markRead(notification);
    const route = resolveNotificationRoute(notification);
    if (route) {
      router.push(route as never);
    }
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroBadge}>{t.badge}</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.description}>{t.subtitle}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t.unread} value={stats.unread} color="#2563eb" />
        <StatCard label={t.total} value={stats.total} color="#14b8a6" />
        <StatCard label={t.appointments} value={stats.appointments} color="#f59e0b" />
        <StatCard label={t.documents} value={stats.documents} color="#7c3aed" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.latest}</Text>
        {loading ? <ActivityIndicator color="#2563eb" /> : null}
      </View>

      {!loading && notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>!</Text>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
          <Link href="/patient/home" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>←</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              language={language}
              notification={notification}
              onMarkRead={() => markRead(notification)}
              onOpen={() => openNotification(notification)}
              t={t}
              targetRoute={resolveNotificationRoute(notification)}
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

function NotificationCard({
  language,
  notification,
  onMarkRead,
  onOpen,
  targetRoute,
  t,
}: {
  language: 'fr' | 'en';
  notification: PatientNotification;
  onMarkRead: () => void;
  onOpen: () => void;
  targetRoute: string | null;
  t: typeof copy.fr;
}) {
  const tone = getTone(notification.type);

  return (
    <Pressable onPress={onOpen} style={[styles.notificationCard, !notification.read && styles.notificationUnread]}>
      <View style={[styles.typeIcon, { backgroundColor: tone.bg }]}>
        <Text style={[styles.typeIconText, { color: tone.color }]}>{tone.label}</Text>
      </View>
      <View style={styles.notificationBody}>
        <View style={styles.notificationTop}>
          <Text numberOfLines={1} style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={[styles.readPill, !notification.read && styles.unreadPill]}>
            {notification.read ? t.read : t.unreadBadge}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.notificationMessage}>{notification.message}</Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationDate}>{formatDate(notification.createdAt, language)}</Text>
          <View style={styles.actionRow}>
            {!notification.read ? (
              <Pressable onPress={onMarkRead} style={styles.markButton}>
                <Text style={styles.markButtonText}>{t.markRead}</Text>
              </Pressable>
            ) : null}
            {targetRoute ? <Text style={styles.openText}>{t.open}</Text> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingBottom: 42,
    paddingTop: 8,
  },
  centerScreen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    width: '100%',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
  },
  heroBadge: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { color: '#020617', fontSize: 32, fontWeight: '900', marginTop: 16 },
  description: { color: '#64748b', fontSize: 15, fontWeight: '600', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 102,
    padding: 14,
    width: '48.4%',
  },
  statLine: { borderRadius: 999, height: 4, marginBottom: 14, width: 34 },
  statValue: { color: '#020617', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  list: { gap: 12 },
  notificationCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  notificationUnread: { borderColor: '#bfdbfe', shadowColor: '#2563eb', shadowOpacity: 0.08, shadowRadius: 14 },
  typeIcon: { alignItems: 'center', borderRadius: 18, height: 54, justifyContent: 'center', width: 54 },
  typeIconText: { fontSize: 12, fontWeight: '900' },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationTop: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  notificationTitle: { color: '#020617', flex: 1, fontSize: 16, fontWeight: '900' },
  readPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadPill: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  notificationMessage: { color: '#64748b', fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 6 },
  notificationFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  notificationDate: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  actionRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  markButton: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  markButtonText: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  openText: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 26,
  },
  emptyIcon: { color: '#2563eb', fontSize: 38, fontWeight: '900' },
  emptyTitle: { color: '#020617', fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8, textAlign: 'center' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 18,
    width: 72,
  },
  secondaryButtonText: { color: '#2563eb', fontSize: 18, fontWeight: '900' },
});
