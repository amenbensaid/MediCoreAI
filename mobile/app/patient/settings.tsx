import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { patientSession } from '@/src/stores/patientAuthStore';
import { patientUiStore, usePatientLanguage, usePatientTheme, type PatientTheme } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

type Language = 'fr' | 'en';

const copy = {
  fr: {
    subtitle: 'Paramètres patient',
    badge: 'Préférences',
    title: 'Paramètres',
    description: 'Gérez votre langue, vos notifications et les raccourcis du compte patient.',
    language: 'Langue',
    french: 'Français',
    english: 'Anglais',
    appearance: 'Apparence',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    notifications: 'Notifications',
    appointments: 'Rappels rendez-vous',
    documents: 'Documents médicaux',
    security: 'Sécurité',
    privacy: 'Dossier privé par défaut',
    account: 'Compte',
    editProfile: 'Modifier mon profil',
    dashboard: 'Retour tableau de bord',
    help: 'Aide',
    helpText: 'Contactez votre clinique pour toute modification médicale sensible.',
    connectedAs: 'Connecté comme',
    saved: 'Préférence enregistrée localement.',
  },
  en: {
    subtitle: 'Patient settings',
    badge: 'Preferences',
    title: 'Settings',
    description: 'Manage language, notifications and patient account shortcuts.',
    language: 'Language',
    french: 'French',
    english: 'English',
    appearance: 'Appearance',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    notifications: 'Notifications',
    appointments: 'Appointment reminders',
    documents: 'Medical documents',
    security: 'Security',
    privacy: 'Private record by default',
    account: 'Account',
    editProfile: 'Edit my profile',
    dashboard: 'Back to dashboard',
    help: 'Help',
    helpText: 'Contact your clinic for sensitive medical record changes.',
    connectedAs: 'Signed in as',
    saved: 'Preference saved locally.',
  },
};

export default function PatientSettingsScreen() {
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const [appointmentNotifications, setAppointmentNotifications] = useState(true);
  const [documentNotifications, setDocumentNotifications] = useState(true);
  const [privateRecord, setPrivateRecord] = useState(true);
  const t = copy[language];
  const user = patientSession.getUser();

  const updateLanguage = (nextLanguage: Language) => {
    patientUiStore.setLanguage(nextLanguage);
    Alert.alert(copy[nextLanguage].language, copy[nextLanguage].saved);
  };

  const updateTheme = (nextTheme: PatientTheme) => {
    patientUiStore.setTheme(nextTheme);
    Alert.alert(t.appearance, t.saved);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.badge}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{t.description}</Text>
        <View style={[styles.accountPill, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.accountPillLabel, { color: colors.primary }]}>{t.connectedAs}</Text>
          <Text style={[styles.accountPillValue, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.language}</Text>
        <View style={styles.languageGrid}>
          <Pressable
            onPress={() => updateLanguage('fr')}
            style={[
              styles.languageCard,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              language === 'fr' && styles.languageCardActive,
            ]}
          >
            <Text style={[styles.languageTitle, { color: colors.primary }, language === 'fr' && styles.languageTitleActive]}>FR</Text>
            <Text style={[styles.languageLabel, { color: colors.muted }, language === 'fr' && styles.languageLabelActive]}>{t.french}</Text>
          </Pressable>
          <Pressable
            onPress={() => updateLanguage('en')}
            style={[
              styles.languageCard,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              language === 'en' && styles.languageCardActive,
            ]}
          >
            <Text style={[styles.languageTitle, { color: colors.primary }, language === 'en' && styles.languageTitleActive]}>EN</Text>
            <Text style={[styles.languageLabel, { color: colors.muted }, language === 'en' && styles.languageLabelActive]}>{t.english}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.appearance}</Text>
        <View style={styles.languageGrid}>
          <Pressable
            onPress={() => updateTheme('light')}
            style={[
              styles.languageCard,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              theme === 'light' && styles.languageCardActive,
            ]}
          >
            <Text style={[styles.languageTitle, { color: colors.primary }, theme === 'light' && styles.languageTitleActive]}>☀</Text>
            <Text style={[styles.languageLabel, { color: colors.muted }, theme === 'light' && styles.languageLabelActive]}>{t.lightMode}</Text>
          </Pressable>
          <Pressable
            onPress={() => updateTheme('dark')}
            style={[
              styles.languageCard,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              theme === 'dark' && styles.languageCardActive,
            ]}
          >
            <Text style={[styles.languageTitle, { color: colors.primary }, theme === 'dark' && styles.languageTitleActive]}>☾</Text>
            <Text style={[styles.languageLabel, { color: colors.muted }, theme === 'dark' && styles.languageLabelActive]}>{t.darkMode}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.notifications}</Text>
        <SettingSwitch colors={colors} label={t.appointments} value={appointmentNotifications} onValueChange={setAppointmentNotifications} />
        <SettingSwitch colors={colors} label={t.documents} value={documentNotifications} onValueChange={setDocumentNotifications} />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.security}</Text>
        <SettingSwitch colors={colors} label={t.privacy} value={privateRecord} onValueChange={setPrivateRecord} />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.account}</Text>
        <Link href="/patient/profile" asChild>
          <Pressable style={[styles.linkButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.linkIcon, { color: colors.primary }]}>○</Text>
            <Text style={[styles.linkText, { color: colors.text }]}>{t.editProfile}</Text>
          </Pressable>
        </Link>
        <Link href="/patient/home" asChild>
          <Pressable style={[styles.linkButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.linkIcon, { color: colors.primary }]}>⌂</Text>
            <Text style={[styles.linkText, { color: colors.text }]}>{t.dashboard}</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.helpCard, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
        <Text style={[styles.helpTitle, { color: colors.primary }]}>{t.help}</Text>
        <Text style={[styles.helpText, { color: colors.muted }]}>{t.helpText}</Text>
      </View>
    </ScrollView>
  );
}

function SettingSwitch({
  colors,
  label,
  onValueChange,
  value,
}: {
  colors: typeof mobileTheme.light;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={[styles.switchRow, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.switchLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? '#fff' : colors.surfaceAlt}
        trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
        value={value}
      />
    </View>
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
  heroCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
  },
  heroBadge: { color: '#2563eb', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#020617', fontSize: 32, fontWeight: '900', marginTop: 16 },
  description: { color: '#64748b', fontSize: 15, fontWeight: '600', lineHeight: 23, marginTop: 8 },
  accountPill: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    marginTop: 18,
    padding: 14,
  },
  accountPillLabel: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  accountPillValue: { color: '#020617', fontSize: 16, fontWeight: '900', marginTop: 3 },
  sectionCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionTitle: { color: '#020617', fontSize: 19, fontWeight: '900' },
  languageGrid: { flexDirection: 'row', gap: 10 },
  languageCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  languageCardActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  languageTitle: { color: '#2563eb', fontSize: 18, fontWeight: '900' },
  languageTitleActive: { color: '#fff' },
  languageLabel: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 5 },
  languageLabelActive: { color: '#dbeafe' },
  switchRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchLabel: { color: '#334155', flex: 1, fontSize: 14, fontWeight: '900' },
  linkButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  linkIcon: { color: '#2563eb', fontSize: 18, fontWeight: '900' },
  linkText: { color: '#0f172a', fontSize: 14, fontWeight: '900' },
  helpCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  helpTitle: { color: '#1d4ed8', fontSize: 17, fontWeight: '900' },
  helpText: { color: '#475569', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 6 },
});
