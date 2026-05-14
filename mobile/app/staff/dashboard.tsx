import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  staffApi,
  type StaffChartRow,
  type StaffDashboardAlert,
  type StaffDashboardAppointment,
  type StaffDashboardData,
  type StaffWaitlistEntry,
} from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'Dashboard médecin',
    secretaryEyebrow: 'Dashboard secrétaire',
    goodMorning: 'Bonjour',
    goodEvening: 'Bonsoir',
    overview: 'Vue mobile des indicateurs, rendez-vous et priorités du cabinet.',
    secretaryOverview: 'Pilotage accueil, demandes patients, planning et encaissements du jour.',
    loginTitle: 'Connexion staff requise',
    loginText: 'Connectez-vous pour voir votre dashboard staff.',
    login: 'Se connecter',
    newAppointment: 'Rendez-vous',
    patients: 'Patients',
    calendar: 'Calendrier',
    waitlist: 'File',
    billing: 'Factures',
    appointmentsToday: 'Rendez-vous jour',
    secretaryAppointmentsToday: 'RDV aujourd’hui',
    completed: 'terminés',
    toHandle: 'à traiter',
    revenueToday: 'Recettes jour',
    secretaryRevenueToday: 'Encaissements jour',
    vsYesterday: 'vs hier',
    totalPatients: 'Patients',
    secretaryPatients: 'Dossiers patients',
    newThisMonth: 'nouveaux ce mois',
    outstanding: 'À encaisser',
    secretaryOutstanding: 'À relancer',
    invoices: 'factures',
    secretaryPriorities: 'Priorités accueil',
    approvalRequests: 'Demandes à valider',
    approvalHint: 'Confirmer ou proposer un créneau',
    patientFollowUp: 'Suivi patients',
    patientFollowUpHint: 'Dossiers et coordonnées à tenir à jour',
    billingFollowUp: 'Factures ouvertes',
    billingFollowUpHint: 'Paiements à enregistrer ou relancer',
    revenueSummary: 'Synthèse revenus',
    realRevenue: 'Encaissé réel',
    realRevenueHint: 'Calculé depuis les paiements enregistrés',
    monthRevenue: 'Mois encaissé',
    paymentsToday: 'paiement(s) aujourd’hui',
    openInvoices: 'Factures ouvertes',
    billingReady: 'Facturation des séances active',
    revenueChart: 'Revenus 7 jours',
    appointmentsChart: 'RDV 7 jours',
    upcoming: 'Rendez-vous à venir',
    viewAll: 'Voir tout',
    noAppointments: 'Aucun rendez-vous à venir.',
    waitlistTitle: 'File d’attente',
    waitlistSubtitle: 'Demandes actives à surveiller.',
    manage: 'Gérer',
    noWaitlist: 'Aucune demande active.',
    alerts: 'Alertes',
    noAlerts: 'Aucune alerte importante.',
    loadError: 'Impossible de charger le dashboard.',
    statuses: {
      confirmed: 'Confirmé',
      scheduled: 'Planifié',
      awaiting_approval: 'À valider',
      completed: 'Terminé',
      cancelled: 'Annulé',
    },
  },
  en: {
    eyebrow: 'Doctor dashboard',
    secretaryEyebrow: 'Secretary dashboard',
    goodMorning: 'Good morning',
    goodEvening: 'Good evening',
    overview: 'Mobile view of clinic metrics, appointments and priorities.',
    secretaryOverview: 'Front desk control for patient requests, schedule and daily collections.',
    loginTitle: 'Staff login required',
    loginText: 'Sign in to view your staff dashboard.',
    login: 'Sign in',
    newAppointment: 'Appointment',
    patients: 'Patients',
    calendar: 'Calendar',
    waitlist: 'Waitlist',
    billing: 'Invoices',
    appointmentsToday: 'Today appointments',
    secretaryAppointmentsToday: 'Today schedule',
    completed: 'completed',
    toHandle: 'to handle',
    revenueToday: 'Today revenue',
    secretaryRevenueToday: 'Today collections',
    vsYesterday: 'vs yesterday',
    totalPatients: 'Patients',
    secretaryPatients: 'Patient files',
    newThisMonth: 'new this month',
    outstanding: 'Outstanding',
    secretaryOutstanding: 'Follow up',
    invoices: 'invoices',
    secretaryPriorities: 'Front desk priorities',
    approvalRequests: 'Requests to approve',
    approvalHint: 'Confirm or offer a time slot',
    patientFollowUp: 'Patient follow-up',
    patientFollowUpHint: 'Keep records and contacts up to date',
    billingFollowUp: 'Open invoices',
    billingFollowUpHint: 'Record payments or follow up',
    revenueSummary: 'Revenue summary',
    realRevenue: 'Real collected',
    realRevenueHint: 'Calculated from recorded payments',
    monthRevenue: 'Month collected',
    paymentsToday: 'payment(s) today',
    openInvoices: 'Open invoices',
    billingReady: 'Session billing active',
    revenueChart: '7-day revenue',
    appointmentsChart: '7-day appointments',
    upcoming: 'Upcoming appointments',
    viewAll: 'View all',
    noAppointments: 'No upcoming appointment.',
    waitlistTitle: 'Waitlist',
    waitlistSubtitle: 'Active requests to monitor.',
    manage: 'Manage',
    noWaitlist: 'No active request.',
    alerts: 'Alerts',
    noAlerts: 'No important alert.',
    loadError: 'Unable to load dashboard.',
    statuses: {
      confirmed: 'Confirmed',
      scheduled: 'Scheduled',
      awaiting_approval: 'To approve',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  },
};

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');

const formatMoney = (value: number, language: PatientLanguage) =>
  new Intl.NumberFormat(getLocale(language), { maximumFractionDigits: 0 }).format(Number(value || 0));

const formatTime = (value: string | undefined, language: PatientLanguage) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(getLocale(language), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 5 ? 'goodEvening' : 'goodMorning';
};

const isSecretaryRole = (role?: string | null) => {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'secretary' || normalized === 'receptionist';
};

export default function StaffDashboardScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const [session, setSession] = useState(staffSession.getSession());
  const [dashboard, setDashboard] = useState<StaffDashboardData | null>(null);
  const [waitlist, setWaitlist] = useState<StaffWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const t = copy[language];

  useEffect(() => {
    const unsubscribe = staffSession.subscribe(setSession);
    return () => {
      unsubscribe();
    };
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [dashboardResponse, waitlistResponse] = await Promise.all([
        staffApi.getDashboard(token),
        staffApi.getActiveWaitlist(token).catch(() => ({ data: [] as StaffWaitlistEntry[] })),
      ]);
      setDashboard(dashboardResponse.data);
      setWaitlist(waitlistResponse.data || []);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, session.token]);

  const userName = useMemo(() => (
    `${session.user?.firstName || ''} ${session.user?.lastName || ''}`.trim() ||
    session.user?.email ||
    'Staff'
  ), [session.user]);

  if (!session.token) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.loginTitle}</Text>
          <Text style={[styles.loginText, { color: colors.muted }]}>{t.loginText}</Text>
          <Pressable onPress={() => router.replace('/auth/staff-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const stats = dashboard?.stats;
  const upcoming = dashboard?.upcomingAppointments || [];
  const alerts = dashboard?.alerts || [];
  const charts = dashboard?.charts || { revenue: [], appointments: [] };
  const isSecretary = isSecretaryRole(session.user?.role);
  const awaitingCount = upcoming.filter((appointment) => appointment.status === 'awaiting_approval' || appointment.status === 'scheduled').length;
  const heroColor = isSecretary ? '#0f766e' : '#2563eb';
  const heroSoft = isSecretary ? '#ccfbf1' : '#bfdbfe';

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: heroColor }]}>
        <View style={styles.heroTop}>
          <View style={styles.logo}>
            <Ionicons name={isSecretary ? 'desktop-outline' : 'medical-outline'} size={30} color={heroColor} />
          </View>
          <View style={styles.heroIdentity}>
            <Text style={[styles.heroBadge, { color: heroSoft }]}>{isSecretary ? t.secretaryEyebrow : t.eyebrow}</Text>
            <Text style={styles.heroRole}>{session.user?.clinicName || session.user?.role || 'MediCore'}</Text>
          </View>
        </View>
        <Text style={styles.title}>{t[getGreeting()]}, {userName}</Text>
        <Text style={styles.description}>{isSecretary ? t.secretaryOverview : t.overview}</Text>
      </View>

      <View style={[styles.quickGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <QuickAction color="#2563eb" icon="calendar-number-outline" label={t.calendar} href="/staff/calendar" />
        <QuickAction color="#0ea5e9" icon="calendar-clear-outline" label={t.newAppointment} href="/staff/appointments" />
        <QuickAction color="#14b8a6" icon="people-outline" label={t.patients} href="/staff/patients" />
        <QuickAction color="#f59e0b" icon="hourglass-outline" label={t.waitlist} href="/staff/waitlist" />
        <QuickAction color="#10b981" icon="receipt-outline" label={t.billing} href="/staff/invoices" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <StatCard
          color="#2563eb"
          icon="calendar-clear-outline"
          label={isSecretary ? t.secretaryAppointmentsToday : t.appointmentsToday}
          subtitle={isSecretary ? `${awaitingCount} ${t.toHandle}` : `${stats?.appointmentsCompleted || 0} ${t.completed}`}
          trend={stats?.appointmentsTrend}
          value={String(stats?.appointmentsToday || 0)}
        />
        <StatCard
          color="#10b981"
          icon="cash-outline"
          label={isSecretary ? t.secretaryRevenueToday : t.revenueToday}
          subtitle={t.vsYesterday}
          trend={stats?.revenueTrend}
          value={`${formatMoney(stats?.revenueToday || 0, language)} €`}
        />
        <StatCard
          color="#0ea5e9"
          icon="people-outline"
          label={isSecretary ? t.secretaryPatients : t.totalPatients}
          subtitle={`${stats?.newPatientsMonth || 0} ${t.newThisMonth}`}
          trend={stats?.patientsTrend}
          value={String(stats?.totalPatients || 0)}
        />
        <StatCard
          color="#f59e0b"
          icon="receipt-outline"
          label={isSecretary ? t.secretaryOutstanding : t.outstanding}
          subtitle={`${stats?.pendingInvoicesCount || 0} ${t.invoices}`}
          trend={stats?.pendingInvoicesTrend}
          value={`${formatMoney(stats?.pendingInvoicesAmount || 0, language)} €`}
        />
      </View>

      {isSecretary ? (
        <SecretaryPrioritiesCard stats={stats} awaitingCount={awaitingCount} language={language} labels={t} />
      ) : (
        <RevenueSummaryCard stats={stats} language={language} labels={t} />
      )}

      <View style={styles.chartGrid}>
        <ChartCard title={t.revenueChart} rows={charts.revenue || []} valueKey="revenue" color="#2563eb" suffix="€" language={language} />
        <ChartCard title={t.appointmentsChart} rows={charts.appointments || []} valueKey="appts" color="#14b8a6" language={language} />
      </View>

      <SectionHeader title={t.waitlistTitle} action={t.manage} href="/staff/waitlist" />
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.panelSubtitle, { color: colors.muted }]}>{t.waitlistSubtitle}</Text>
        {waitlist.slice(0, 3).length > 0 ? (
          waitlist.slice(0, 3).map((entry) => <WaitlistRow key={entry.id} entry={entry} language={language} />)
        ) : (
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noWaitlist}</Text>
        )}
      </View>

      <SectionHeader title={t.upcoming} action={t.viewAll} href="/staff/appointments" />
      <View style={styles.list}>
        {upcoming.length > 0 ? (
          upcoming.slice(0, 5).map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} language={language} statuses={t.statuses} />
          ))
        ) : (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noAppointments}</Text>
          </View>
        )}
      </View>

      <SectionHeader title={t.alerts} />
      <View style={styles.list}>
        {alerts.length > 0 ? (
          alerts.slice(0, 4).map((alert) => <AlertRow key={alert.id} alert={alert} />)
        ) : (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noAlerts}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function RevenueSummaryCard({
  labels,
  language,
  stats,
}: {
  labels: typeof copy.fr;
  language: PatientLanguage;
  stats: StaffDashboardData['stats'] | undefined;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const pendingAmount = Number(stats?.pendingInvoicesAmount || 0);
  const pendingCount = Number(stats?.pendingInvoicesCount || 0);

  return (
    <View style={[styles.revenuePanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.revenueHeader}>
        <View style={[styles.revenueIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="wallet-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.revenueTitle, { color: colors.text }]}>{labels.revenueSummary}</Text>
          <Text style={[styles.revenueHint, { color: colors.muted }]}>{labels.realRevenueHint}</Text>
        </View>
      </View>

      <View style={styles.revenueMetrics}>
        <View style={[styles.revenueMetric, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>{labels.realRevenue}</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{formatMoney(stats?.revenueToday || 0, language)} €</Text>
          <Text style={styles.metricSuccess}>{stats?.paymentsTodayCount || 0} {labels.paymentsToday}</Text>
        </View>
        <View style={[styles.revenueMetric, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>{labels.monthRevenue}</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{formatMoney(stats?.revenueMonth || 0, language)} €</Text>
          <Text style={styles.metricSuccess}>{labels.billingReady}</Text>
        </View>
      </View>

      <View style={[styles.outstandingStrip, { backgroundColor: pendingAmount > 0 ? '#fff7ed' : '#ecfdf5' }]}>
        <Ionicons name="receipt-outline" size={18} color={pendingAmount > 0 ? '#ea580c' : '#059669'} />
        <Text style={[styles.outstandingText, { color: pendingAmount > 0 ? '#9a3412' : '#047857' }]}>
          {labels.openInvoices}: {formatMoney(pendingAmount, language)} € · {pendingCount} {labels.invoices}
        </Text>
      </View>
    </View>
  );
}

function SecretaryPrioritiesCard({
  awaitingCount,
  labels,
  language,
  stats,
}: {
  awaitingCount: number;
  labels: typeof copy.fr;
  language: PatientLanguage;
  stats: StaffDashboardData['stats'] | undefined;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const pendingAmount = Number(stats?.pendingInvoicesAmount || 0);

  return (
    <View style={[styles.revenuePanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.revenueHeader}>
        <View style={[styles.revenueIcon, { backgroundColor: '#ccfbf1' }]}>
          <Ionicons name="clipboard-outline" size={22} color="#0f766e" />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.revenueTitle, { color: colors.text }]}>{labels.secretaryPriorities}</Text>
          <Text style={[styles.revenueHint, { color: colors.muted }]}>{labels.secretaryOverview}</Text>
        </View>
      </View>

      <View style={styles.priorityList}>
        <PriorityItem
          color="#2563eb"
          href="/staff/appointments"
          icon="calendar-clear-outline"
          label={labels.approvalRequests}
          subtitle={labels.approvalHint}
          value={String(awaitingCount)}
        />
        <PriorityItem
          color="#14b8a6"
          href="/staff/patients"
          icon="people-outline"
          label={labels.patientFollowUp}
          subtitle={labels.patientFollowUpHint}
          value={String(stats?.totalPatients || 0)}
        />
        <PriorityItem
          color="#f59e0b"
          href="/staff/invoices"
          icon="receipt-outline"
          label={labels.billingFollowUp}
          subtitle={`${formatMoney(pendingAmount, language)} € · ${stats?.pendingInvoicesCount || 0} ${labels.invoices}`}
          value={String(stats?.pendingInvoicesCount || 0)}
        />
      </View>
    </View>
  );
}

function PriorityItem({
  color,
  href,
  icon,
  label,
  subtitle,
  value,
}: {
  color: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  value: string;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <Link href={href as never} asChild>
      <Pressable style={({ pressed }) => [styles.priorityItem, { backgroundColor: colors.surfaceAlt }, pressed && styles.quickActionPressed]}>
        <View style={[styles.priorityIcon, { backgroundColor: `${color}16` }]}>
          <Ionicons name={icon} size={19} color={color} />
        </View>
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={[styles.priorityTitle, { color: colors.text }]}>{label}</Text>
          <Text numberOfLines={2} style={[styles.prioritySubtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <View style={[styles.priorityCount, { backgroundColor: `${color}14` }]}>
          <Text style={[styles.priorityCountText, { color }]}>{value}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

function QuickAction({
  color,
  href,
  icon,
  label,
}: {
  color: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <Link href={href as never} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.quickAction,
          { backgroundColor: colors.surfaceAlt },
          pressed && styles.quickActionPressed,
        ]}
      >
        <View style={[styles.quickIconWrap, { backgroundColor: `${color}14` }]}>
          <Ionicons name={icon} size={19} color={color} />
        </View>
        <Text numberOfLines={1} style={[styles.quickActionText, { color: colors.text }]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function StatCard({
  color,
  icon,
  label,
  subtitle,
  trend,
  value,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  trend?: string;
  value: string;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const positive = String(trend || '').startsWith('+');
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statLine, { backgroundColor: color }]} />
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend ? (
          <Text style={[styles.trend, positive ? styles.trendPositive : styles.trendMuted]}>{trend}</Text>
        ) : null}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.statSubtitle, { color: colors.muted }]}>{subtitle}</Text>
    </View>
  );
}

function ChartCard({
  color,
  language,
  rows,
  suffix = '',
  title,
  valueKey,
}: {
  color: string;
  language: PatientLanguage;
  rows: StaffChartRow[];
  suffix?: string;
  title: string;
  valueKey: 'revenue' | 'appts';
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const values = rows.map((row) => Number(row[valueKey] || 0));
  const max = Math.max(...values, 1);

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.chartBars}>
        {rows.map((row, index) => {
          const value = Number(row[valueKey] || 0);
          const height = Math.max(8, Math.round((value / max) * 92));
          return (
            <View key={`${row.name}-${index}`} style={styles.barColumn}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.barFill, { height, backgroundColor: color }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.muted }]}>{row.name}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.chartFooter, { color: colors.muted }]}>
        {formatMoney(values.reduce((sum, value) => sum + value, 0), language)}{suffix}
      </Text>
    </View>
  );
}

function SectionHeader({ action, href, title }: { action?: string; href?: string; title: string }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && href ? (
        <Link href={href as never} asChild>
          <Pressable>
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

function AppointmentRow({
  appointment,
  language,
  statuses,
}: {
  appointment: StaffDashboardAppointment;
  language: PatientLanguage;
  statuses: Record<string, string>;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.appointmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.datePill, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.datePillText, { color: colors.primary }]}>{formatTime(appointment.time, language).split(' ').slice(-1)[0] || '--:--'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{appointment.patientName}</Text>
        <Text numberOfLines={1} style={[styles.rowSubtitle, { color: colors.muted }]}>{appointment.type} · {formatTime(appointment.time, language)}</Text>
      </View>
      <Text style={styles.statusPill}>{statuses[appointment.status] || appointment.status}</Text>
    </View>
  );
}

function WaitlistRow({ entry, language }: { entry: StaffWaitlistEntry; language: PatientLanguage }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.waitlistRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.waitlistIcon}>
        <Ionicons name="hourglass-outline" size={18} color="#d97706" />
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{entry.patientName || 'Patient'}</Text>
        <Text numberOfLines={1} style={[styles.rowSubtitle, { color: colors.muted }]}>
          {entry.appointmentType || 'Consultation'} · {formatTime(entry.startTime, language)}
        </Text>
      </View>
      <Text style={styles.positionText}>#{entry.position || 1}</Text>
    </View>
  );
}

function AlertRow({ alert }: { alert: StaffDashboardAlert }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const warning = alert.type === 'warning';
  return (
    <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.alertIcon, warning ? styles.alertWarning : styles.alertInfo]}>
        <Ionicons name={warning ? 'warning-outline' : 'sparkles-outline'} size={18} color={warning ? '#d97706' : '#2563eb'} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{alert.title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{alert.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 16,
    padding: 18,
    paddingBottom: 44,
  },
  centerScreen: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 24, width: '100%' },
  heroCard: {
    backgroundColor: '#2563eb',
    borderRadius: 30,
    overflow: 'hidden',
    padding: 22,
  },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  logo: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, height: 54, justifyContent: 'center', width: 54 },
  logoText: { color: '#2563eb', fontSize: 34, fontWeight: '900', lineHeight: 36 },
  heroIdentity: { flex: 1 },
  heroBadge: { color: '#bfdbfe', fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  heroRole: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 3 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 20 },
  loginTitle: { color: '#020617', fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 20 },
  description: { color: '#dbeafe', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  loginText: { color: '#64748b', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 20, padding: 15 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  quickGrid: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  quickActionPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  quickIconWrap: { alignItems: 'center', borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  quickActionText: { color: '#0f172a', flex: 1, flexShrink: 1, fontSize: 13, fontWeight: '900', lineHeight: 16 },
  error: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 16,
    borderWidth: 1,
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '800',
    padding: 12,
  },
  loadingCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 150,
    padding: 16,
  },
  statLine: { borderRadius: 99, height: 5, marginBottom: 13, width: 54 },
  statTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  trend: { fontSize: 12, fontWeight: '900' },
  trendPositive: { color: '#16a34a' },
  trendMuted: { color: '#64748b' },
  statValue: { color: '#020617', fontSize: 25, fontWeight: '900', marginTop: 14 },
  statLabel: { color: '#334155', fontSize: 13, fontWeight: '900', marginTop: 4 },
  statSubtitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 4 },
  revenuePanel: {
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  revenueHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  revenueIcon: { alignItems: 'center', borderRadius: 16, height: 46, justifyContent: 'center', width: 46 },
  revenueTitle: { fontSize: 18, fontWeight: '900' },
  revenueHint: { fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 2 },
  revenueMetrics: { flexDirection: 'row', gap: 10 },
  revenueMetric: { borderRadius: 18, flex: 1, padding: 12 },
  metricLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  metricValue: { fontSize: 22, fontWeight: '900', marginTop: 7 },
  metricSuccess: { color: '#059669', fontSize: 11, fontWeight: '900', marginTop: 5 },
  outstandingStrip: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 8, padding: 12 },
  outstandingText: { flex: 1, fontSize: 12, fontWeight: '900', lineHeight: 18 },
  priorityList: { gap: 10 },
  priorityItem: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 11,
    minHeight: 72,
    padding: 12,
  },
  priorityIcon: { alignItems: 'center', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  priorityTitle: { fontSize: 14, fontWeight: '900' },
  prioritySubtitle: { fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 2 },
  priorityCount: { alignItems: 'center', borderRadius: 999, minWidth: 34, paddingHorizontal: 9, paddingVertical: 6 },
  priorityCountText: { fontSize: 13, fontWeight: '900' },
  chartGrid: { gap: 12 },
  chartCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  chartTitle: { color: '#020617', fontSize: 17, fontWeight: '900' },
  chartBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 9, height: 130, marginTop: 14 },
  barColumn: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 999, height: 100, justifyContent: 'flex-end', overflow: 'hidden', width: 18 },
  barFill: { borderRadius: 999, width: '100%' },
  barLabel: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  chartFooter: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 10, textAlign: 'right' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { color: '#020617', fontSize: 22, fontWeight: '900' },
  sectionAction: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  panel: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  panelSubtitle: { color: '#64748b', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  list: { gap: 10 },
  appointmentCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  datePill: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 16, minWidth: 58, paddingHorizontal: 10, paddingVertical: 12 },
  datePillText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  rowBody: { flex: 1 },
  rowTitle: { color: '#020617', fontSize: 15, fontWeight: '900' },
  rowSubtitle: { color: '#64748b', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 3 },
  statusPill: { backgroundColor: '#dcfce7', borderRadius: 999, color: '#15803d', fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  waitlistRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 9 },
  waitlistIcon: { alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  positionText: { color: '#d97706', fontSize: 13, fontWeight: '900' },
  alertCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  alertIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  alertWarning: { backgroundColor: '#fef3c7' },
  alertInfo: { backgroundColor: '#dbeafe' },
});
