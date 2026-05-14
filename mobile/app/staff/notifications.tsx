import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    badge: 'Centre de notifications',
    title: 'Notifications équipe',
    subtitle: 'Suivez les rendez-vous, demandes, documents et alertes du cabinet.',
    unread: 'Non lues',
    total: 'Total',
    appointments: 'Rendez-vous',
    documents: 'Documents',
    latest: 'Dernières notifications',
    all: 'Toutes',
    markAll: 'Tout lu',
    markRead: 'Marquer lu',
    open: 'Ouvrir',
    read: 'Lu',
    unreadBadge: 'Nouveau',
    emptyTitle: 'Aucune notification',
    emptyText: 'Les alertes importantes de l’équipe apparaîtront ici.',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour consulter les notifications équipe.',
    login: 'Se connecter',
    loadError: 'Impossible de charger les notifications.',
    markError: 'Impossible de marquer cette notification.',
    markAllError: 'Impossible de marquer toutes les notifications.',
  },
  en: {
    badge: 'Notification center',
    title: 'Team notifications',
    subtitle: 'Track appointments, requests, documents and clinic alerts.',
    unread: 'Unread',
    total: 'Total',
    appointments: 'Appointments',
    documents: 'Documents',
    latest: 'Latest notifications',
    all: 'All',
    markAll: 'Mark all',
    markRead: 'Mark read',
    open: 'Open',
    read: 'Read',
    unreadBadge: 'New',
    emptyTitle: 'No notifications',
    emptyText: 'Important team alerts will appear here.',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to view team notifications.',
    login: 'Sign in',
    loadError: 'Unable to load notifications.',
    markError: 'Unable to mark this notification.',
    markAllError: 'Unable to mark all notifications.',
  },
};

type FilterKey = 'all' | 'unread' | 'appointment' | 'document';

const getTone = (type: string, url?: string | null) => {
  if (type === 'appointment' || String(url || '').includes('appointment')) {
    return { color: '#2563eb', bg: '#dbeafe', icon: 'calendar-clear-outline' as const, label: 'RDV' };
  }
  if (type === 'warning') {
    return { color: '#d97706', bg: '#fef3c7', icon: 'warning-outline' as const, label: '!' };
  }
  if (type === 'success') {
    return { color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle-outline' as const, label: 'OK' };
  }
  if (type === 'document' || String(url || '').includes('document')) {
    return { color: '#7c3aed', bg: '#ede9fe', icon: 'document-text-outline' as const, label: 'DOC' };
  }
  if (type === 'waitlist' || String(url || '').includes('waitlist')) {
    return { color: '#f59e0b', bg: '#fef3c7', icon: 'hourglass-outline' as const, label: 'FILE' };
  }
  return { color: '#0ea5e9', bg: '#e0f2fe', icon: 'notifications-outline' as const, label: 'INFO' };
};

const formatDate = (value: string, language: PatientLanguage) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const resolveStaffRoute = (notification: PatientNotification) => {
  const url = String(notification.url || '').trim();
  const appointmentId = notification.metadata?.appointmentId;
  const patientId = notification.metadata?.patientId;

  if (typeof patientId === 'string' || typeof patientId === 'number') return `/staff/patient/${patientId}`;
  if (appointmentId) return '/staff/appointments';
  if (!url || url === '/') return '/staff/dashboard';
  if (url.includes('calendar')) return '/staff/calendar';
  if (url.includes('appointment')) return '/staff/appointments';
  if (url.includes('waitlist')) return '/staff/waitlist';
  if (url.includes('patient')) return '/staff/patients';
  if (url.includes('document')) return '/staff/patients';
  if (url.startsWith('/staff/')) return url;
  return null;
};

export default function StaffNotificationsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await notificationsApi.getStaffNotifications(token);
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
    appointments: notifications.filter((item) => item.type === 'appointment' || String(item.url || '').includes('appointment')).length,
    documents: notifications.filter((item) => item.type === 'document' || String(item.url || '').includes('document')).length,
  }), [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !item.read);
    if (filter === 'appointment') return notifications.filter((item) => item.type === 'appointment' || String(item.url || '').includes('appointment'));
    if (filter === 'document') return notifications.filter((item) => item.type === 'document' || String(item.url || '').includes('document'));
    return notifications;
  }, [filter, notifications]);

  const markRead = async (notification: PatientNotification) => {
    const token = staffSession.getToken();
    if (!token || notification.read) return;

    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, read: true, readAt: new Date().toISOString() } : item
    )));

    try {
      await notificationsApi.markStaffNotificationRead(notification.id, token);
    } catch {
      Alert.alert(t.title, t.markError);
      loadNotifications(true);
    }
  };

  const markAllRead = async () => {
    const token = staffSession.getToken();
    if (!token || stats.unread === 0) return;

    setNotifications((current) => current.map((item) => (
      item.read ? item : { ...item, read: true, readAt: new Date().toISOString() }
    )));

    try {
      await notificationsApi.markAllStaffNotificationsRead(token);
    } catch {
      Alert.alert(t.title, t.markAllError);
      loadNotifications(true);
    }
  };

  const openNotification = async (notification: PatientNotification) => {
    await markRead(notification);
    const route = resolveStaffRoute(notification);
    if (route) router.push(route as never);
  };

  if (!staffSession.getToken()) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.badge}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{t.loginText}</Text>
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="notifications-outline" size={28} color="#2563eb" />
        </View>
        <Text style={styles.heroBadge}>{t.badge}</Text>
        <Text style={styles.heroTitle}>{t.title}</Text>
        <Text style={styles.heroText}>{t.subtitle}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" icon="mail-unread-outline" label={t.unread} value={stats.unread} />
        <StatCard color="#14b8a6" icon="notifications-outline" label={t.total} value={stats.total} />
        <StatCard color="#f59e0b" icon="calendar-clear-outline" label={t.appointments} value={stats.appointments} />
        <StatCard color="#7c3aed" icon="document-text-outline" label={t.documents} value={stats.documents} />
      </View>

      <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: t.all },
            { key: 'unread', label: t.unread },
            { key: 'appointment', label: t.appointments },
            { key: 'document', label: t.documents },
          ] as { key: FilterKey; label: string }[]).map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, { color: colors.muted }, active && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.latest}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{filteredNotifications.length}/{notifications.length}</Text>
        </View>
        <View style={styles.sectionActions}>
          {loading ? <ActivityIndicator color="#2563eb" /> : null}
          <Pressable
            disabled={stats.unread === 0}
            onPress={markAllRead}
            style={[styles.markAllButton, { backgroundColor: colors.primarySoft }, stats.unread === 0 && styles.disabledButton]}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>{t.markAll}</Text>
          </Pressable>
        </View>
      </View>

      {!loading && filteredNotifications.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="notifications-off-outline" size={34} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              language={language}
              notification={notification}
              onMarkRead={() => markRead(notification)}
              onOpen={() => openNotification(notification)}
              t={t}
              targetRoute={resolveStaffRoute(notification)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
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

function NotificationCard({
  language,
  notification,
  onMarkRead,
  onOpen,
  targetRoute,
  t,
}: {
  language: PatientLanguage;
  notification: PatientNotification;
  onMarkRead: () => void;
  onOpen: () => void;
  targetRoute: string | null;
  t: typeof copy.fr;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const tone = getTone(notification.type, notification.url);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.notificationCard,
        { backgroundColor: colors.surface, borderColor: notification.read ? colors.border : tone.color, shadowColor: colors.shadow },
        !notification.read && styles.notificationUnread,
        pressed && styles.notificationPressed,
      ]}
    >
      <View style={[styles.typeIcon, { backgroundColor: tone.bg }]}>
        <Ionicons name={tone.icon} size={22} color={tone.color} />
      </View>
      <View style={styles.notificationBody}>
        <View style={styles.notificationTop}>
          <Text numberOfLines={1} style={[styles.notificationTitle, { color: colors.text }]}>{notification.title}</Text>
          <View style={[styles.readPill, { backgroundColor: notification.read ? colors.surfaceAlt : `${tone.color}18` }]}>
            <Text style={[styles.readPillText, { color: notification.read ? colors.muted : tone.color }]}>
              {notification.read ? t.read : t.unreadBadge}
            </Text>
          </View>
        </View>
        <Text numberOfLines={3} style={[styles.notificationMessage, { color: colors.muted }]}>{notification.message}</Text>
        <View style={styles.notificationFooter}>
          <Text style={[styles.notificationDate, { color: colors.subtle }]}>{formatDate(notification.createdAt, language)}</Text>
          <View style={styles.actionRow}>
            {!notification.read ? (
              <Pressable onPress={onMarkRead} style={[styles.markButton, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.markButtonText, { color: colors.primary }]}>{t.markRead}</Text>
              </Pressable>
            ) : null}
            {targetRoute ? (
              <View style={styles.openAction}>
                <Text style={[styles.openText, { color: colors.primary }]}>{t.open}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  heroCard: { backgroundColor: '#2563eb', borderRadius: 30, padding: 22 },
  heroIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, height: 58, justifyContent: 'center', marginBottom: 16, width: 58 },
  heroBadge: { color: '#bfdbfe', fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 33, fontWeight: '900', lineHeight: 38, marginTop: 12 },
  heroText: { color: '#dbeafe', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '900', marginTop: 16 },
  description: { fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { borderRadius: 22, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minHeight: 112, padding: 14 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  statValue: { fontSize: 25, fontWeight: '900', marginTop: 12 },
  statLabel: { fontSize: 12, fontWeight: '900', marginTop: 3 },
  filterCard: { borderRadius: 24, borderWidth: 1, padding: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { alignItems: 'center', borderRadius: 999, flexGrow: 1, paddingHorizontal: 12, paddingVertical: 10 },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterChipText: { fontSize: 12, fontWeight: '900' },
  filterChipTextActive: { color: '#fff' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, fontWeight: '900', marginTop: 3 },
  sectionActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  markAllButton: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  markAllText: { fontSize: 12, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  list: { gap: 12 },
  notificationCard: { borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 18 },
  notificationUnread: { borderWidth: 1.5 },
  notificationPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  typeIcon: { alignItems: 'center', borderRadius: 18, height: 54, justifyContent: 'center', width: 54 },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  notificationTitle: { flex: 1, fontSize: 16, fontWeight: '900' },
  readPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  readPillText: { fontSize: 10, fontWeight: '900' },
  notificationMessage: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  notificationFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  notificationDate: { fontSize: 11, fontWeight: '900' },
  actionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  markButton: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  markButtonText: { fontSize: 11, fontWeight: '900' },
  openAction: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  openText: { fontSize: 11, fontWeight: '900' },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, padding: 26 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 8, textAlign: 'center' },
});
