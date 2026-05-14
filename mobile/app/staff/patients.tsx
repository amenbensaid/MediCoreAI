import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { staffApi, type StaffPatient, type StaffPatientCreatePayload } from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';
import { getFileUrl } from '@/src/utils/getFileUrl';

const copy = {
  fr: {
    badge: 'Dossiers patients',
    title: 'Patients',
    subtitle: 'Recherchez, consultez et créez les dossiers patients du cabinet.',
    search: 'Rechercher un patient...',
    all: 'Tous',
    active: 'Actifs',
    inactive: 'Inactifs',
    totalPatients: 'Total',
    activePatients: 'Actifs',
    inactivePatients: 'Inactifs',
    newPatient: 'Nouveau patient',
    emptyTitle: 'Aucun patient',
    emptyText: 'Aucun dossier ne correspond à votre recherche.',
    loadError: 'Impossible de charger les patients.',
    createError: 'Impossible de créer le patient.',
    createSuccess: 'Patient créé.',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    city: 'Ville',
    dateOfBirth: 'Date naissance',
    gender: 'Genre',
    save: 'Créer le patient',
    cancel: 'Annuler',
    required: 'Prénom et nom sont obligatoires.',
    appointments: 'RDV',
    view: 'Ouvrir',
    next: 'Suivant',
    previous: 'Précédent',
    years: 'ans',
    listTitle: 'Liste patients',
    activeOne: 'Actif',
    inactiveOne: 'Inactif',
    patientNumber: 'Dossier',
    noPhone: 'Téléphone non renseigné',
  },
  en: {
    badge: 'Patient records',
    title: 'Patients',
    subtitle: 'Search, review and create clinic patient records.',
    search: 'Search a patient...',
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    totalPatients: 'Total',
    activePatients: 'Active',
    inactivePatients: 'Inactive',
    newPatient: 'New patient',
    emptyTitle: 'No patient',
    emptyText: 'No record matches your search.',
    loadError: 'Unable to load patients.',
    createError: 'Unable to create patient.',
    createSuccess: 'Patient created.',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    city: 'City',
    dateOfBirth: 'Birth date',
    gender: 'Gender',
    save: 'Create patient',
    cancel: 'Cancel',
    required: 'First name and last name are required.',
    appointments: 'Appts',
    view: 'Open',
    next: 'Next',
    previous: 'Previous',
    years: 'years',
    listTitle: 'Patient list',
    activeOne: 'Active',
    inactiveOne: 'Inactive',
    patientNumber: 'Record',
    noPhone: 'No phone',
  },
};

const getAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

const initials = (patient?: Partial<StaffPatient>) => (
  `${patient?.firstName?.[0] || ''}${patient?.lastName?.[0] || ''}`.trim().toUpperCase() ||
  patient?.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ||
  'P'
);

export default function StaffPatientsScreen() {
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 12 });
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const t = copy[language];

  const loadPatients = useCallback(async (nextPage = page, isRefresh = false) => {
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
      const response = await staffApi.getPatients(token, {
        search,
        page: nextPage,
        limit: 12,
        isActive: status,
      });
      setPatients(response.data.patients || []);
      setPagination(response.data.pagination);
      setPage(response.data.pagination.currentPage);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, status, t.loadError]);

  useEffect(() => {
    const token = staffSession.getToken();
    const timer = setTimeout(() => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      staffApi.getPatients(token, {
        search,
        page: 1,
        limit: 12,
        isActive: status,
      })
        .then((response) => {
          setPatients(response.data.patients || []);
          setPagination(response.data.pagination);
          setPage(response.data.pagination.currentPage);
        })
        .catch(() => setError(t.loadError))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, status, t.loadError]);

  const stats = useMemo(() => ({
    total: pagination.totalCount,
    active: patients.filter((patient) => patient.isActive).length,
    inactive: patients.filter((patient) => !patient.isActive).length,
  }), [patients, pagination.totalCount]);

  const handleCreated = () => {
    setModalVisible(false);
    loadPatients(1, true);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPatients(page, true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heroBadge, { color: colors.primary }]}>{t.badge}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{t.subtitle}</Text>
        <Pressable onPress={() => setModalVisible(true)} style={styles.primaryButton}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>{t.newPatient}</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t.totalPatients} value={stats.total} color="#2563eb" icon="people-outline" />
        <StatCard label={t.activePatients} value={stats.active} color="#10b981" icon="checkmark-circle-outline" />
        <StatCard label={t.inactivePatients} value={stats.inactive} color="#64748b" icon="pause-circle-outline" />
      </View>

      <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.search}
            placeholderTextColor="#94a3b8"
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <View style={styles.segment}>
          {[
            { key: 'all', label: t.all },
            { key: 'true', label: t.active },
            { key: 'false', label: t.inactive },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setStatus(item.key as 'all' | 'true' | 'false')}
              style={[styles.segmentButton, status === item.key && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, status === item.key && styles.segmentTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : patients.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t.emptyText}</Text>
        </View>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>{t.listTitle}</Text>
            <Text style={[styles.listCount, { color: colors.muted }]}>{patients.length}/{pagination.totalCount}</Text>
          </View>
          <View style={styles.list}>
            {patients.map((patient) => (
              <PatientCard key={patient.id} labels={t} patient={patient} />
            ))}
          </View>
        </>
      )}

      {pagination.totalPages > 1 ? (
        <View style={styles.pagination}>
          <Pressable
            disabled={page <= 1}
            onPress={() => loadPatients(page - 1)}
            style={[styles.pageButton, page <= 1 && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>{t.previous}</Text>
          </Pressable>
          <Text style={styles.pageText}>{page}/{pagination.totalPages}</Text>
          <Pressable
            disabled={page >= pagination.totalPages}
            onPress={() => loadPatients(page + 1)}
            style={[styles.pageButton, page >= pagination.totalPages && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>{t.next}</Text>
          </Pressable>
        </View>
      ) : null}

      <AddPatientModal
        labels={t}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={handleCreated}
      />
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
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function PatientCard({
  labels,
  patient,
}: {
  labels: typeof copy.fr;
  patient: StaffPatient;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const avatarUrl = getFileUrl(patient.avatarUrl);
  const age = getAge(patient.dateOfBirth);
  const statusColor = patient.isActive ? '#10b981' : '#64748b';

  return (
    <Link href={`/staff/patient/${patient.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.patientCard,
          { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
          pressed && styles.patientCardPressed,
        ]}
      >
        <View style={styles.patientMainRow}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials(patient)}</Text>
            )}
          </View>
          <View style={styles.patientTop}>
            <View style={styles.patientTitleBlock}>
              <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>{patient.fullName}</Text>
              <Text numberOfLines={1} style={[styles.patientMeta, { color: colors.muted }]}>
                {labels.patientNumber} · {patient.patientNumber || patient.email || '-'}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {patient.isActive ? labels.activeOne : labels.inactiveOne}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.patientInfoGrid}>
          <InfoChip colors={colors} icon="call-outline" label={patient.phone || patient.mobile || labels.noPhone} />
          {age !== null ? <InfoChip colors={colors} icon="calendar-outline" label={`${age} ${labels.years}`} /> : null}
          <InfoChip colors={colors} icon="clipboard-outline" label={`${patient.appointmentCount || 0} ${labels.appointments}`} />
        </View>
        <View style={styles.patientCardFooter}>
          <Text numberOfLines={1} style={[styles.practitionerText, { color: colors.muted }]}>
            {patient.practitionerName || patient.city || patient.email || ''}
          </Text>
          <View style={[styles.openButton, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.openButtonText, { color: colors.primary }]}>{labels.view}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function InfoChip({
  colors,
  icon,
  label,
}: {
  colors: typeof mobileTheme.light;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={[styles.infoChip, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text numberOfLines={1} style={[styles.infoChipText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function AddPatientModal({
  labels,
  onClose,
  onCreated,
  visible,
}: {
  labels: typeof copy.fr;
  onClose: () => void;
  onCreated: () => void;
  visible: boolean;
}) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const [form, setForm] = useState<StaffPatientCreatePayload>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    dateOfBirth: '',
    gender: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert(labels.newPatient, labels.required);
      return;
    }

    const token = staffSession.getToken();
    if (!token || saving) return;

    setSaving(true);
    try {
      await staffApi.createPatient(token, {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      Alert.alert(labels.newPatient, labels.createSuccess);
      setForm({ firstName: '', lastName: '', email: '', phone: '', city: '', dateOfBirth: '', gender: '' });
      onCreated();
    } catch {
      Alert.alert(labels.newPatient, labels.createError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{labels.newPatient}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          <View style={styles.modalFields}>
            <Input colors={colors} label={labels.firstName} value={form.firstName} onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))} />
            <Input colors={colors} label={labels.lastName} value={form.lastName} onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))} />
            <Input colors={colors} label={labels.email} value={form.email || ''} keyboardType="email-address" onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Input colors={colors} label={labels.phone} value={form.phone || ''} keyboardType="phone-pad" onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
            <Input colors={colors} label={labels.city} value={form.city || ''} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
            <Input colors={colors} label={labels.dateOfBirth} value={form.dateOfBirth || ''} placeholder="YYYY-MM-DD" onChangeText={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))} />
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{labels.cancel}</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={submit} style={[styles.modalPrimaryButton, saving && styles.disabledButton]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>{labels.save}</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Input({
  colors,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  value,
}: {
  colors: typeof mobileTheme.light;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, gap: 16, padding: 18, paddingBottom: 44 },
  heroCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 20 },
  heroBadge: { color: '#2563eb', fontSize: 12, fontWeight: '900', letterSpacing: 1.7, textTransform: 'uppercase' },
  title: { color: '#020617', fontSize: 34, fontWeight: '900', marginTop: 14 },
  description: { color: '#64748b', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  primaryButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#2563eb', borderRadius: 16, flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 15, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 20, borderWidth: 1, flex: 1, padding: 14 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  statValue: { color: '#020617', fontSize: 24, fontWeight: '900', marginTop: 12 },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 3 },
  filterCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, gap: 12, padding: 14 },
  searchBox: { alignItems: 'center', backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 13 },
  searchInput: { color: '#020617', flex: 1, fontSize: 15, fontWeight: '700', minHeight: 48 },
  segment: { backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 13, flex: 1, paddingVertical: 9 },
  segmentButtonActive: { backgroundColor: '#2563eb' },
  segmentText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  error: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderRadius: 16, borderWidth: 1, color: '#e11d48', fontSize: 13, fontWeight: '800', padding: 12 },
  loadingCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 18 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, padding: 28 },
  emptyTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  listTitle: { fontSize: 20, fontWeight: '900' },
  listCount: { fontSize: 13, fontWeight: '900' },
  list: { gap: 12 },
  patientCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 24, borderWidth: 1, gap: 13, padding: 14, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 18 },
  patientCardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  patientMainRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 20, height: 62, justifyContent: 'center', overflow: 'hidden', width: 62 },
  avatarImage: { height: '100%', width: '100%' },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  patientTop: { alignItems: 'flex-start', flex: 1, gap: 8 },
  patientTitleBlock: { minWidth: 0, width: '100%' },
  patientName: { color: '#020617', fontSize: 18, fontWeight: '900' },
  patientMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  patientInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 6, maxWidth: '100%', minHeight: 34, paddingHorizontal: 10, paddingVertical: 7 },
  infoChipText: { fontSize: 12, fontWeight: '900' },
  statusPill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 5 },
  statusDot: { borderRadius: 999, height: 7, width: 7 },
  statusText: { fontSize: 11, fontWeight: '900' },
  activePill: { backgroundColor: '#dcfce7', color: '#15803d' },
  inactivePill: { backgroundColor: '#f1f5f9', color: '#64748b' },
  patientCardFooter: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  practitionerText: { flex: 1, fontSize: 12, fontWeight: '800' },
  openButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 4, minHeight: 34, paddingHorizontal: 12 },
  openButtonText: { fontSize: 12, fontWeight: '900' },
  pagination: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  pageButton: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  pageButtonText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  pageText: { color: '#64748b', fontSize: 13, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  modalBackdrop: { backgroundColor: 'rgba(15,23,42,0.28)', flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', padding: 18 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: '#020617', fontSize: 22, fontWeight: '900' },
  closeButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  modalFields: { gap: 12, marginTop: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { color: '#334155', fontSize: 13, fontWeight: '900' },
  input: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 16, borderWidth: 1, color: '#020617', fontSize: 15, fontWeight: '700', minHeight: 48, paddingHorizontal: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, flex: 1, justifyContent: 'center', minHeight: 52 },
  secondaryButtonText: { color: '#475569', fontSize: 14, fontWeight: '900' },
  modalPrimaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 16, flex: 1, justifyContent: 'center', minHeight: 52 },
  modalPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
