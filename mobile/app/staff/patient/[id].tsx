import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { staffApi, type StaffPatientDetail } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';
import { getFileUrl } from '@/src/utils/getFileUrl';

const copy = {
  fr: {
    badge: 'Dossier patient',
    contact: 'Coordonnées',
    medical: 'Informations médicales',
    appointments: 'Rendez-vous récents',
    records: 'Notes médicales',
    invoices: 'Factures à régler',
    back: 'Retour patients',
    loadError: 'Impossible de charger le dossier patient.',
    empty: 'Aucune donnée disponible.',
    phone: 'Téléphone',
    email: 'Email',
    city: 'Ville',
    address: 'Adresse',
    bloodType: 'Groupe sanguin',
    allergies: 'Allergies',
    chronicConditions: 'Maladies chroniques',
    currentMedications: 'Médicaments',
    active: 'Actif',
    inactive: 'Inactif',
  },
  en: {
    badge: 'Patient record',
    contact: 'Contact',
    medical: 'Medical information',
    appointments: 'Recent appointments',
    records: 'Medical notes',
    invoices: 'Outstanding invoices',
    back: 'Back to patients',
    loadError: 'Unable to load patient record.',
    empty: 'No data available.',
    phone: 'Phone',
    email: 'Email',
    city: 'City',
    address: 'Address',
    bloodType: 'Blood type',
    allergies: 'Allergies',
    chronicConditions: 'Chronic conditions',
    currentMedications: 'Medications',
    active: 'Active',
    inactive: 'Inactive',
  },
};

const initials = (patient?: StaffPatientDetail | null) => (
  `${patient?.firstName?.[0] || ''}${patient?.lastName?.[0] || ''}`.trim().toUpperCase() || 'P'
);

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');

const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(getLocale(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function StaffPatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const [patient, setPatient] = useState<StaffPatientDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const t = copy[language];

  const loadPatient = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token || !id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await staffApi.getPatient(token, id);
      setPatient(response.data);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t.loadError]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const avatarUrl = getFileUrl(patient?.avatarUrl);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPatient(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <Link href="/staff/patients" asChild>
        <Text style={[styles.backLink, { color: colors.primary }]}>← {t.back}</Text>
      </Link>

      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : patient ? (
        <>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.badge}</Text>
            <View style={styles.identityRow}>
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials(patient)}</Text>
                )}
              </View>
              <View style={styles.identityInfo}>
                <Text style={[styles.title, { color: colors.text }]}>{patient.fullName}</Text>
                <Text style={[styles.description, { color: colors.muted }]}>{patient.patientNumber || patient.email || '-'}</Text>
              </View>
            </View>
            <View style={styles.heroTags}>
              <Tag label={patient.isActive ? t.active : t.inactive} color={patient.isActive ? '#16a34a' : '#64748b'} />
              {patient.practitionerName ? <Tag label={patient.practitionerName} color="#2563eb" /> : null}
            </View>
          </View>

          <Section title={t.contact}>
            <InfoRow icon="call-outline" label={t.phone} value={patient.phone || patient.mobile || '-'} />
            <InfoRow icon="mail-outline" label={t.email} value={patient.email || '-'} />
            <InfoRow icon="location-outline" label={t.city} value={[patient.address, patient.city].filter(Boolean).join(', ') || '-'} />
          </Section>

          <Section title={t.medical}>
            <InfoRow icon="water-outline" label={t.bloodType} value={patient.bloodType || '-'} />
            <InfoRow icon="alert-circle-outline" label={t.allergies} value={(patient.allergies || []).join(', ') || '-'} />
            <InfoRow icon="pulse-outline" label={t.chronicConditions} value={(patient.chronicConditions || []).join(', ') || '-'} />
            <InfoRow icon="medical-outline" label={t.currentMedications} value={(patient.currentMedications || []).join(', ') || '-'} />
          </Section>

          <Section title={t.appointments}>
            {(patient.recentAppointments || []).length > 0 ? (
              patient.recentAppointments?.map((appointment) => (
                <TimelineRow
                  key={appointment.id}
                  icon="calendar-outline"
                  title={appointment.type}
                  subtitle={`${appointment.practitioner || ''} · ${formatDate(appointment.startTime, language)}`}
                  badge={appointment.status}
                />
              ))
            ) : <Text style={styles.emptyText}>{t.empty}</Text>}
          </Section>

          <Section title={t.records}>
            {(patient.recentRecords || []).length > 0 ? (
              patient.recentRecords?.map((record) => (
                <TimelineRow
                  key={record.id}
                  icon="document-text-outline"
                  title={record.diagnosis || record.complaint || record.type}
                  subtitle={formatDate(record.date, language)}
                />
              ))
            ) : <Text style={styles.emptyText}>{t.empty}</Text>}
          </Section>

          <Section title={t.invoices}>
            {(patient.pendingInvoices || []).length > 0 ? (
              patient.pendingInvoices?.map((invoice) => (
                <TimelineRow
                  key={invoice.id}
                  icon="receipt-outline"
                  title={`${invoice.number} · ${invoice.balance.toFixed(2)} €`}
                  subtitle={formatDate(invoice.date, language)}
                  badge={invoice.status}
                />
              ))
            ) : <Text style={styles.emptyText}>{t.empty}</Text>}
          </Section>
        </>
      ) : null}
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineRow({
  badge,
  icon,
  subtitle,
  title,
}: {
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  title: string;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={styles.timelineRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoBody}>
        <View style={styles.timelineTop}>
          <Text numberOfLines={1} style={[styles.timelineTitle, { color: colors.text }]}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={[styles.infoValue, { color: colors.text }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <Text style={[styles.tag, { backgroundColor: `${color}18`, color }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, gap: 16, padding: 18, paddingBottom: 44 },
  backLink: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
  loadingCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 18 },
  error: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderRadius: 16, borderWidth: 1, color: '#e11d48', fontSize: 13, fontWeight: '800', padding: 12 },
  heroCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 20 },
  heroBadge: { color: '#2563eb', fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  identityRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 16 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 24, height: 78, justifyContent: 'center', overflow: 'hidden', width: 78 },
  avatarImage: { height: '100%', width: '100%' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  identityInfo: { flex: 1 },
  title: { color: '#020617', fontSize: 28, fontWeight: '900' },
  description: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 4 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { borderRadius: 999, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  sectionCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, gap: 12, padding: 16 },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  timelineRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  infoIcon: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  infoBody: { flex: 1 },
  infoLabel: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '800', lineHeight: 20, marginTop: 2 },
  timelineTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  timelineTitle: { color: '#020617', flex: 1, fontSize: 15, fontWeight: '900' },
  badge: { backgroundColor: '#f1f5f9', borderRadius: 999, color: '#475569', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
});
