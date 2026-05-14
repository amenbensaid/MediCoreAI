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
import { staffApi, type StaffSecretary } from '@/src/api/staff';
import { patientUiStore, usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'Paramètres',
    title: 'Paramètres médecin',
    subtitle: 'Vue mobile du compte, de l’affichage et des comptes secrétaires.',
    account: 'Compte',
    display: 'Affichage',
    secretaries: 'Comptes secrétaires',
    secretarySubtitle: 'Comptes créés depuis le web, lecture seule sur mobile.',
    total: 'Total',
    active: 'Actifs',
    inactive: 'Inactifs',
    statusActive: 'Actif',
    statusInactive: 'Inactif',
    assignedDoctor: 'Médecin assigné',
    lastLogin: 'Dernière connexion',
    never: 'Jamais',
    permissions: 'Accès',
    noSecretary: 'Aucun compte secrétaire créé.',
    dashboard: 'Accueil',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    language: 'Langue',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour voir les paramètres.',
    login: 'Se connecter',
    loadError: 'Impossible de charger les comptes secrétaires.',
  },
  en: {
    eyebrow: 'Settings',
    title: 'Doctor settings',
    subtitle: 'Mobile view of account, display and secretary accounts.',
    account: 'Account',
    display: 'Display',
    secretaries: 'Secretary accounts',
    secretarySubtitle: 'Accounts created from the web, read-only on mobile.',
    total: 'Total',
    active: 'Active',
    inactive: 'Inactive',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    assignedDoctor: 'Assigned doctor',
    lastLogin: 'Last login',
    never: 'Never',
    permissions: 'Access',
    noSecretary: 'No secretary account created.',
    dashboard: 'Home',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    language: 'Language',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to view settings.',
    login: 'Sign in',
    loadError: 'Unable to load secretary accounts.',
  },
};

const permissionLabels: Record<string, { fr: string; en: string }> = {
  dashboard: { fr: 'Dashboard', en: 'Dashboard' },
  patients: { fr: 'Patients', en: 'Patients' },
  appointments: { fr: 'Rendez-vous', en: 'Appointments' },
  calendar: { fr: 'Calendrier', en: 'Calendar' },
  teleconsultations: { fr: 'Téléconsultations', en: 'Teleconsultations' },
  billing: { fr: 'Facturation', en: 'Billing' },
  analytics: { fr: 'Analytics', en: 'Analytics' },
  reviews: { fr: 'Avis', en: 'Reviews' },
  settings: { fr: 'Paramètres', en: 'Settings' },
};

const getName = (secretary: StaffSecretary) => (
  [secretary.firstName, secretary.lastName].filter(Boolean).join(' ') || secretary.email || 'Secretary'
);
const getInitials = (name: string) => (
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC'
);
const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function StaffSettingsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [session, setSession] = useState(staffSession.getSession());
  const [secretaries, setSecretaries] = useState<StaffSecretary[]>([]);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = staffSession.subscribe(setSession);
    return () => {
      unsubscribe();
    };
  }, []);

  const loadSecretaries = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await staffApi.getSecretaries(token);
      setSecretaries(response.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadSecretaries();
  }, [loadSecretaries]);

  const stats = useMemo(() => ({
    total: secretaries.length,
    active: secretaries.filter((item) => item.isActive).length,
    inactive: secretaries.filter((item) => !item.isActive).length,
  }), [secretaries]);

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSecretaries(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="settings-outline" size={25} color={colors.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.heroText, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.accountTop}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {getInitials(`${session.user?.firstName || ''} ${session.user?.lastName || ''}`.trim() || session.user?.email || 'DR')}
            </Text>
          </View>
          <View style={styles.accountBody}>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t.account}</Text>
            <Text numberOfLines={1} style={[styles.accountName, { color: colors.text }]}>
              {`${session.user?.firstName || ''} ${session.user?.lastName || ''}`.trim() || 'Staff'}
            </Text>
            <Text numberOfLines={1} style={[styles.accountEmail, { color: colors.muted }]}>{session.user?.email || ''}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.displayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t.display}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{theme === 'dark' ? t.darkMode : t.lightMode}</Text>
        </View>
        <View style={styles.displayActions}>
          <View style={[styles.languageSwitch, { backgroundColor: colors.surfaceAlt }]}>
            {(['fr', 'en'] as PatientLanguage[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => patientUiStore.setLanguage(item)}
                style={[styles.languageOption, language === item && styles.languageOptionActive]}
              >
                <Text style={[styles.languageText, { color: language === item ? '#fff' : colors.muted }]}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => patientUiStore.toggleTheme()} style={[styles.themeButton, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard color="#2563eb" label={t.total} value={stats.total} />
        <StatCard color="#10b981" label={t.active} value={stats.active} />
        <StatCard color="#64748b" label={t.inactive} value={stats.inactive} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.secretaries}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{t.secretarySubtitle}</Text>
        </View>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {!loading && secretaries.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={34} color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noSecretary}</Text>
          <Link href="/staff/dashboard" asChild>
            <Pressable style={[styles.secondaryButton, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t.dashboard}</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.secretaryList}>
          {secretaries.map((secretary) => (
            <SecretaryCard key={secretary.id} colors={colors} language={language} secretary={secretary} t={t} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statLine, { backgroundColor: color }]} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function SecretaryCard({
  colors,
  language,
  secretary,
  t,
}: {
  colors: typeof mobileTheme.light;
  language: PatientLanguage;
  secretary: StaffSecretary;
  t: typeof copy.fr;
}) {
  const name = getName(secretary);
  const permissionKeys = Object.entries(secretary.permissions || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .slice(0, 5);
  const lastLogin = formatDate(secretary.lastLogin, language);

  return (
    <View style={[styles.secretaryCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={styles.secretaryTop}>
        <View style={[styles.secretaryAvatar, { backgroundColor: secretary.isActive ? colors.primary : colors.surfaceAlt }]}>
          <Text style={[styles.secretaryAvatarText, { color: secretary.isActive ? '#fff' : colors.muted }]}>{getInitials(name)}</Text>
        </View>
        <View style={styles.secretaryBody}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.secretaryName, { color: colors.text }]}>{name}</Text>
            <Text style={[
              styles.statusPill,
              {
                backgroundColor: secretary.isActive ? '#dcfce7' : colors.surfaceAlt,
                color: secretary.isActive ? '#047857' : colors.muted,
              },
            ]}>
              {secretary.isActive ? t.statusActive : t.statusInactive}
            </Text>
          </View>
          <Text numberOfLines={1} style={[styles.secretaryEmail, { color: colors.muted }]}>{secretary.email}</Text>
          {secretary.phone ? <Text style={[styles.secretaryMeta, { color: colors.muted }]}>{secretary.phone}</Text> : null}
        </View>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
        <InfoLine colors={colors} icon="medkit-outline" label={t.assignedDoctor} value={secretary.practitionerName || '-'} />
        <InfoLine colors={colors} icon="time-outline" label={t.lastLogin} value={lastLogin || t.never} />
      </View>

      <View style={styles.permissionsBlock}>
        <Text style={[styles.permissionsTitle, { color: colors.text }]}>{t.permissions}</Text>
        <View style={styles.permissionRow}>
          {permissionKeys.length > 0 ? permissionKeys.map((key) => (
            <Text key={key} style={[styles.permissionChip, { backgroundColor: colors.primarySoft, color: colors.primary }]}>
              {permissionLabels[key]?.[language] || key}
            </Text>
          )) : (
            <Text style={[styles.secretaryMeta, { color: colors.muted }]}>-</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function InfoLine({ colors, icon, label, value }: { colors: typeof mobileTheme.light; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={[styles.infoLabel, { color: colors.primary }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
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
  accountCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  accountTop: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  accountAvatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 },
  accountAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  accountBody: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  accountEmail: { fontSize: 13, fontWeight: '800', marginTop: 3 },
  displayCard: { alignItems: 'center', borderRadius: 24, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16 },
  displayActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  languageSwitch: { borderRadius: 999, flexDirection: 'row', padding: 4 },
  languageOption: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  languageOptionActive: { backgroundColor: '#2563eb' },
  languageText: { fontSize: 12, fontWeight: '900' },
  themeButton: { alignItems: 'center', borderRadius: 16, height: 42, justifyContent: 'center', width: 42 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { borderRadius: 22, borderWidth: 1, flex: 1, minHeight: 100, padding: 13 },
  statLine: { borderRadius: 999, height: 4, marginBottom: 13, width: 32 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  sectionHeader: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  sectionTitle: { fontSize: 21, fontWeight: '900' },
  sectionEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionSubtitle: { fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 3 },
  secretaryList: { gap: 12 },
  secretaryCard: { borderRadius: 25, borderWidth: 1, gap: 12, padding: 15, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 16 },
  secretaryTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  secretaryAvatar: { alignItems: 'center', borderRadius: 17, height: 50, justifyContent: 'center', width: 50 },
  secretaryAvatarText: { fontSize: 15, fontWeight: '900' },
  secretaryBody: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  secretaryName: { flex: 1, fontSize: 16, fontWeight: '900' },
  statusPill: { borderRadius: 999, fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  secretaryEmail: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  secretaryMeta: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  infoBox: { borderRadius: 18, gap: 9, padding: 11 },
  infoLine: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  infoLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { flex: 1, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  permissionsBlock: { gap: 8 },
  permissionsTitle: { fontSize: 13, fontWeight: '900' },
  permissionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  permissionChip: { borderRadius: 999, fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 9, padding: 26 },
  emptyText: { fontSize: 14, fontWeight: '800', lineHeight: 21, textAlign: 'center' },
  secondaryButton: { alignItems: 'center', borderRadius: 18, justifyContent: 'center', minHeight: 42, paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 13, fontWeight: '900' },
});
