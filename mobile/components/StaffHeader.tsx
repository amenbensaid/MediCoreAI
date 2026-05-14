import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { notificationsApi } from '@/src/api/notifications';
import { staffSession } from '@/src/stores/staffAuthStore';
import { patientUiStore, usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';
import { getFileUrl } from '@/src/utils/getFileUrl';

const labels = {
  fr: {
    brandSubtitle: 'Espace staff',
    secretarySubtitle: 'Espace secrétaire',
    doctorSubtitle: 'Espace médecin',
    menuTitle: 'Compte staff',
    dashboard: 'Dashboard',
    calendar: 'Calendrier',
    patients: 'Patients',
    appointments: 'Rendez-vous',
    teleconsultations: 'Téléconsultations',
    notifications: 'Notifications',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    logoutConfirm: 'Voulez-vous vous déconnecter ?',
    cancel: 'Annuler',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
  },
  en: {
    brandSubtitle: 'Staff workspace',
    secretarySubtitle: 'Secretary workspace',
    doctorSubtitle: 'Doctor workspace',
    menuTitle: 'Staff account',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    patients: 'Patients',
    appointments: 'Appointments',
    teleconsultations: 'Teleconsultations',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Logout',
    logoutConfirm: 'Do you want to log out?',
    cancel: 'Cancel',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
  },
};

export default function StaffHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = labels[language];
  const [session, setSession] = useState(staffSession.getSession());
  const [menuVisible, setMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = session.user;
  const role = String(user?.role || '').toLowerCase();
  const isSecretary = role === 'secretary' || role === 'receptionist';
  const avatarUrl = getFileUrl(user?.avatarUrl || null);
  const initials = useMemo(() => (
    `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim().toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'DR'
  ), [user]);

  useEffect(() => {
    const unsubscribe = staffSession.subscribe(setSession);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const token = staffSession.getToken();
    if (!token) {
      setUnreadCount(0);
      return () => {
        active = false;
      };
    }

    notificationsApi.getStaffNotifications(token)
      .then((response) => {
        if (active) {
          setUnreadCount((response.data || []).filter((item) => !item.read).length);
        }
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const openRoute = (route: string) => {
    setMenuVisible(false);
    router.push(route as never);
  };

  const logout = () => {
    setMenuVisible(false);
    Alert.alert(t.logout, t.logoutConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: () => {
          staffSession.clear();
          router.replace('/auth/staff-login' as never);
        },
      },
    ]);
  };

  const setLanguage = (nextLanguage: PatientLanguage) => {
    patientUiStore.setLanguage(nextLanguage);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/staff/dashboard' as never)} style={styles.logoRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>+</Text>
          </View>
          <View style={styles.brandStack}>
            <Text numberOfLines={1} style={[styles.brand, { color: colors.text }]}>MediCore</Text>
            <Text numberOfLines={1} style={[styles.brandSub, { color: colors.muted }]}>
              {user?.clinicName || (isSecretary ? t.secretarySubtitle : role === 'practitioner' ? t.doctorSubtitle : t.brandSubtitle)}
            </Text>
          </View>
        </Pressable>

        {session.token ? (
          <View style={styles.rightActions}>
            <Pressable
              onPress={() => router.push('/staff/notifications' as never)}
              style={({ pressed }) => [styles.iconButton, styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={21} color={colors.primary} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              hitSlop={8}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
              <View style={styles.avatarDot} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {session.token ? (
        <View style={[styles.utilityBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.languageSwitch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {(['fr', 'en'] as PatientLanguage[]).map((item) => {
              const active = language === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setLanguage(item)}
                  style={[styles.languageOption, active && styles.languageOptionActive]}
                >
                  <Text style={[styles.languageText, { color: colors.muted }, active && styles.languageTextActive]}>{item.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityLabel={theme === 'dark' ? t.lightMode : t.darkMode}
            onPress={() => patientUiStore.toggleTheme()}
            style={({ pressed }) => [styles.utilityButton, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/staff/dashboard' as never)}
            style={({ pressed }) => [styles.utilityButton, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="home-outline" size={20} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/staff/calendar' as never)}
            style={({ pressed }) => [styles.utilityButton, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="calendar-number-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={[styles.accountMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.menuAvatarImage} />
                ) : (
                  <Text style={styles.menuAvatarInitials}>{initials}</Text>
                )}
              </View>
              <View style={styles.menuIdentity}>
                <Text style={[styles.menuTitle, { color: colors.primary }]}>{t.menuTitle}</Text>
                <Text style={[styles.menuName, { color: colors.text }]} numberOfLines={1}>
                  {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Staff'}
                </Text>
                <Text style={[styles.menuEmail, { color: colors.muted }]} numberOfLines={1}>{user?.email || ''}</Text>
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <MenuItem colors={colors} icon="home-outline" label={t.dashboard} onPress={() => openRoute('/staff/dashboard')} />
            <MenuItem colors={colors} icon="calendar-number-outline" label={t.calendar} onPress={() => openRoute('/staff/calendar')} />
            <MenuItem colors={colors} icon="calendar-outline" label={t.appointments} onPress={() => openRoute('/staff/appointments')} />
            <MenuItem colors={colors} icon="videocam-outline" label={t.teleconsultations} onPress={() => openRoute('/staff/teleconsultations')} />
            <MenuItem colors={colors} icon="people-outline" label={t.patients} onPress={() => openRoute('/staff/patients')} />
            <MenuItem colors={colors} icon="settings-outline" label={t.settings} onPress={() => openRoute('/staff/settings')} />
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <MenuItem colors={colors} danger icon="log-out-outline" label={t.logout} onPress={logout} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  colors,
  danger,
  icon,
  label,
  onPress,
}: {
  colors: typeof mobileTheme.light;
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, danger && { backgroundColor: colors.dangerSoft }, pressed && styles.pressed]}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text numberOfLines={1} style={[styles.menuItemText, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, zIndex: 20 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  logoRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10, minWidth: 0 },
  logo: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  brandStack: { flex: 1, minWidth: 0 },
  brand: { color: '#020617', fontSize: 20, fontWeight: '900' },
  brandSub: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 1 },
  rightActions: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 9 },
  utilityBar: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
  },
  utilityButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  languageSwitch: {
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  languageOption: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 7 },
  languageOptionActive: { backgroundColor: '#2563eb' },
  languageText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  languageTextActive: { color: '#fff' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    width: 42,
  },
  notificationButton: { position: 'relative' },
  badge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -4,
    top: -5,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  avatarButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderColor: '#dbeafe',
    borderRadius: 999,
    borderWidth: 3,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: 48,
  },
  avatarImage: { borderRadius: 999, height: '100%', width: '100%' },
  avatarInitials: { color: '#fff', fontSize: 15, fontWeight: '900' },
  avatarDot: {
    backgroundColor: '#22c55e',
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 2,
    bottom: 1,
    height: 13,
    position: 'absolute',
    right: 1,
    width: 13,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 86,
  },
  accountMenu: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 340,
    padding: 14,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    width: '92%',
  },
  menuHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 6 },
  menuAvatar: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  menuAvatarImage: { height: '100%', width: '100%' },
  menuAvatarInitials: { color: '#fff', fontSize: 19, fontWeight: '900' },
  menuIdentity: { flex: 1 },
  menuTitle: { color: '#2563eb', fontSize: 11, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  menuName: { color: '#020617', fontSize: 18, fontWeight: '900', marginTop: 4 },
  menuEmail: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 2 },
  menuDivider: { backgroundColor: '#e2e8f0', height: 1, marginVertical: 10 },
  menuItem: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuItemDanger: { backgroundColor: '#fff1f2' },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuIconDanger: { backgroundColor: '#ffe4e6' },
  menuItemText: { color: '#0f172a', flex: 1, fontSize: 15, fontWeight: '900' },
  menuItemDangerText: { color: '#e11d48' },
});
