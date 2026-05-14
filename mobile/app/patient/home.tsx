import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { patientApi, type PatientAppointment } from '@/src/api/patient';
import en from '@/src/i18n/en';
import fr from '@/src/i18n/fr';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';

const isUpcomingAppointment = (appointment: PatientAppointment) => {
  const start = new Date(appointment.startTime);
  return Number.isNaN(start.getTime()) || start.getTime() >= Date.now();
};

const formatAppointmentDate = (value: string, language: 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PatientHomeScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const t = language === 'fr' ? fr.patientHome : en.patientHome;
  const auth = patientSession.getSession();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(auth.token));
  const [refreshing, setRefreshing] = useState(false);

  const loadAppointments = async (isRefresh = false) => {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const upcoming = useMemo(
    () => appointments.filter(isUpcomingAppointment).slice(0, 3),
    [appointments],
  );
  const pendingCount = appointments.filter((item) => item.status === 'awaiting_approval' || item.status === 'scheduled').length;
  const confirmedCount = appointments.filter((item) => item.status === 'confirmed').length;
  const onlineCount = appointments.filter((item) => item.consultationMode === 'online').length;
  const name = auth.user?.firstName || t.guest;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAppointments(true)} />}
      showsVerticalScrollIndicator={false}
    >
      {!auth.token ? (
        <View style={styles.loginCard}>
          <Text style={styles.badge}>{t.dashboard}</Text>
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.subtitle}>{t.loginSubtitle}</Text>
          <Pressable onPress={() => router.push('/auth/patient-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
          <Link href="/patient/doctors" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t.findDoctor}</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <Text style={styles.heroBadge}>{t.badge}</Text>
            <Text style={styles.heroTitle}>{t.welcome}, {name}</Text>
            <Text style={styles.heroSubtitle}>{t.subtitle}</Text>
            <View style={styles.heroActions}>
              <Link href="/patient/doctors" asChild>
                <Pressable style={styles.heroPrimary}>
                  <Text style={styles.heroPrimaryText}>+ {t.book}</Text>
                </Pressable>
              </Link>
              <Link href="/patient/appointments" asChild>
                <Pressable style={styles.heroSecondary}>
                  <Text style={styles.heroSecondaryText}>{t.appointments}</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label={t.total} value={appointments.length} tone="blue" />
            <StatCard label={t.pending} value={pendingCount} tone="amber" />
            <StatCard label={t.confirmed} value={confirmedCount} tone="green" />
            <StatCard label={t.online} value={onlineCount} tone="cyan" />
          </View>

          <View style={styles.quickGrid}>
            <QuickAction label={t.findDoctor} href="/patient/doctors" icon="⌕" />
            <QuickAction label={t.appointments} href="/patient/appointments" icon="▣" />
            <QuickAction label={t.documents} href="/patient/documents" icon="□" />
            <QuickAction label={t.waitlist} href="/patient/waitlist" icon="↥" />
            <QuickAction label={language === 'fr' ? 'Factures' : 'Invoices'} href="/patient/invoices" icon="€" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.upcoming}</Text>
            {loading ? <ActivityIndicator color="#2563eb" /> : null}
          </View>

          {upcoming.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t.noUpcoming}</Text>
              <Link href="/patient/doctors" asChild>
                <Pressable style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>{t.book}</Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View style={styles.appointmentList}>
              {upcoming.map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.datePill}>
                    <Text style={styles.datePillText}>{formatAppointmentDate(appointment.startTime, language)}</Text>
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentDoctor}>{appointment.practitioner || 'Dr.'}</Text>
                    <Text style={styles.appointmentMeta}>{appointment.type} · {appointment.consultationMode === 'online' ? t.online : t.inPerson}</Text>
                  </View>
                  <Text style={styles.statusBadge}>{appointment.status}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'green' | 'cyan' }) {
  const colors = {
    blue: '#2563eb',
    amber: '#f59e0b',
    green: '#10b981',
    cyan: '#06b6d4',
  };

  return (
    <View style={styles.statCard}>
      <View style={[styles.statLine, { backgroundColor: colors[tone] }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.quickAction}>
        <Text style={styles.quickIcon}>{icon}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Link>
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
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 29 },
  brand: { color: '#020617', fontSize: 20, fontWeight: '900' },
  brandSub: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  languageButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
  },
  languageActive: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  languageMuted: { color: '#64748b', fontSize: 12, fontWeight: '900', paddingRight: 7 },
  loginCard: {
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 30,
    borderWidth: 1,
    marginTop: 20,
    padding: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    textTransform: 'uppercase',
  },
  title: { color: '#020617', fontSize: 28, fontWeight: '900', marginTop: 18 },
  subtitle: { color: '#64748b', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 54,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 52,
  },
  secondaryButtonText: { color: '#2563eb', fontSize: 15, fontWeight: '900' },
  heroCard: {
    backgroundColor: '#2563eb',
    borderRadius: 30,
    marginTop: 10,
    overflow: 'hidden',
    padding: 24,
  },
  heroGlow: {
    backgroundColor: '#06b6d4',
    borderRadius: 100,
    height: 180,
    opacity: 0.42,
    position: 'absolute',
    right: -55,
    top: -55,
    width: 180,
  },
  heroBadge: { color: '#bfdbfe', fontSize: 11, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 24 },
  heroSubtitle: { color: '#dbeafe', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  heroPrimary: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  heroPrimaryText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  heroSecondary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  heroSecondaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '47%',
    overflow: 'hidden',
    padding: 15,
  },
  statLine: { borderRadius: 999, height: 5, marginBottom: 15, width: 36 },
  statValue: { color: '#020617', fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 3 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    width: '48%',
  },
  quickIcon: { color: '#2563eb', fontSize: 20, fontWeight: '900' },
  quickLabel: { color: '#0f172a', flex: 1, fontSize: 13, fontWeight: '900' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#020617',
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  appointmentList: { gap: 10 },
  appointmentCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 10,
    width: 82,
  },
  datePillText: { color: '#2563eb', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  appointmentInfo: { flex: 1 },
  appointmentDoctor: { color: '#020617', fontSize: 14, fontWeight: '900' },
  appointmentMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  statusBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    color: '#047857',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
