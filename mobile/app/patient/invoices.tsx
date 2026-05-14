import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildApiUrl } from '@/src/api/client';
import { patientApi, type PatientInvoice } from '@/src/api/patient';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

const copy = {
  fr: {
    eyebrow: 'Facturation',
    title: 'Mes factures',
    subtitle: 'Factures de séances, paiements et PDF à conserver.',
    total: 'Total',
    paid: 'Payé',
    outstanding: 'À régler',
    empty: 'Aucune facture disponible.',
    pdf: 'Ouvrir PDF',
    loadError: 'Impossible de charger les factures.',
  },
  en: {
    eyebrow: 'Billing',
    title: 'My invoices',
    subtitle: 'Session invoices, payments and PDF receipts.',
    total: 'Total',
    paid: 'Paid',
    outstanding: 'Outstanding',
    empty: 'No invoice available.',
    pdf: 'Open PDF',
    loadError: 'Unable to load invoices.',
  },
};

const locale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');
const money = (value: number, language: PatientLanguage) => `${Number(value || 0).toLocaleString(locale(language), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const formatDate = (value: string | null | undefined, language: PatientLanguage) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale(language), { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PatientInvoicesScreen() {
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const [invoices, setInvoices] = useState<PatientInvoice[]>([]);
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadInvoices = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await patientApi.getMyInvoices(token);
      setInvoices(response.data || []);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const stats = useMemo(() => ({
    total: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
    paid: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0),
    outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0),
  }), [invoices]);

  const openPdf = async (invoice: PatientInvoice) => {
    const token = patientSession.getToken();
    if (!token) return;
    await WebBrowser.openBrowserAsync(buildApiUrl(`/public/my-invoices/${invoice.id}/pdf`, { token }));
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInvoices(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="receipt-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Metric label={t.total} value={money(stats.total, language)} color="#2563eb" />
        <Metric label={t.paid} value={money(stats.paid, language)} color="#10b981" />
        <Metric label={t.outstanding} value={money(stats.outstanding, language)} color="#f59e0b" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color="#2563eb" /> : null}
      {!loading && invoices.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.empty}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {invoices.map((invoice) => (
            <View key={invoice.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardBody}>
                  <Text style={[styles.invoiceNo, { color: colors.text }]}>{invoice.invoiceNumber}</Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>{invoice.appointmentType || 'Séance'} · {formatDate(invoice.appointmentStart || invoice.createdAt, language)}</Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>{invoice.practitionerName || 'MediCore'}</Text>
                </View>
                <Text style={[styles.status, invoice.status === 'paid' ? styles.paid : styles.pending]}>{invoice.status}</Text>
              </View>
              <View style={styles.amountRow}>
                <Amount label={t.total} value={money(invoice.totalAmount, language)} />
                <Amount label={t.outstanding} value={money(invoice.balance, language)} warning />
              </View>
              <Pressable onPress={() => openPdf(invoice)} style={styles.pdfButton}>
                <Ionicons name="download-outline" size={17} color="#fff" />
                <Text style={styles.pdfText}>{t.pdf}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Metric({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricLine, { backgroundColor: color }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Amount({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <View style={styles.amountBox}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, warning && styles.amountWarning]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16, padding: 18, paddingBottom: 44 },
  hero: { alignItems: 'center', borderRadius: 26, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  heroIcon: { alignItems: 'center', borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  heroText: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', marginTop: 3 },
  subtitle: { fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10 },
  metric: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, flex: 1, padding: 12 },
  metricLine: { borderRadius: 99, height: 4, width: 34 },
  metricValue: { color: '#020617', fontSize: 16, fontWeight: '900', marginTop: 10 },
  metricLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 3 },
  error: { color: '#e11d48', fontWeight: '800' },
  empty: { borderRadius: 24, borderWidth: 1, padding: 24 },
  emptyText: { fontWeight: '800', textAlign: 'center' },
  list: { gap: 12 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  cardBody: { flex: 1 },
  invoiceNo: { fontSize: 18, fontWeight: '900' },
  meta: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  status: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  paid: { backgroundColor: '#dcfce7', color: '#047857' },
  pending: { backgroundColor: '#ffedd5', color: '#c2410c' },
  amountRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  amountBox: { backgroundColor: '#f8fafc', borderRadius: 16, flex: 1, padding: 11 },
  amountLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  amountValue: { color: '#020617', fontSize: 15, fontWeight: '900', marginTop: 4 },
  amountWarning: { color: '#ea580c' },
  pdfButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 14, padding: 12 },
  pdfText: { color: '#fff', fontWeight: '900' },
});
