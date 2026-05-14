import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  staffApi,
  type StaffAppointmentCreatePayload,
  type StaffCalendarAppointment,
  type StaffPatient,
  type StaffWaitlistEntry,
} from '@/src/api/staff';
import { usePatientLanguage, usePatientTheme, type PatientLanguage } from '@/src/stores/patientUiStore';
import { staffSession } from '@/src/stores/staffAuthStore';
import { mobileTheme } from '@/src/theme/mobileTheme';
import type { AvailableSlot } from '@/src/types/doctor';

type AppointmentForm = {
  patientId: string;
  appointmentType: string;
  startTime: string;
  duration: string;
  consultationMode: 'in-person' | 'online';
  notes: string;
  reasonDetail: string;
};

const copy = {
  fr: {
    eyebrow: 'Planning',
    title: 'Journée',
    subtitle: 'Rendez-vous, modifications et actions rapides pour cette journée.',
    back: 'Retour',
    add: 'Ajouter',
    edit: 'Modifier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    confirm: 'Confirmer',
    complete: 'Terminer',
    createTitle: 'Nouveau rendez-vous',
    editTitle: 'Modifier le rendez-vous',
    patient: 'Patient',
    searchPatient: 'Chercher un patient...',
    type: 'Type',
    time: 'Heure',
    duration: 'Durée',
    slot: 'Séance',
    chooseSlot: 'Choisir une séance disponible',
    noSlot: 'Aucune séance disponible pour ce mode.',
    loadingSlots: 'Chargement des séances...',
    practitionerRequired: 'Aucun praticien assigné à ce compte. Connectez-vous comme médecin ou assignez un praticien.',
    mode: 'Mode',
    inPerson: 'Présentiel',
    online: 'En ligne',
    reason: 'Motif',
    notes: 'Notes',
    appointments: 'Rendez-vous',
    waitlist: 'File',
    emptyTitle: 'Aucun rendez-vous',
    emptyText: 'Ajoutez un rendez-vous pour cette date ou consultez la file d’attente.',
    pastEmptyText: 'Aucun ancien rendez-vous pour cette date.',
    readOnly: 'Historique',
    loadError: 'Impossible de charger la journée.',
    saveError: 'Impossible d’enregistrer ce rendez-vous.',
    patientRequired: 'Choisissez un patient pour créer le rendez-vous.',
    timeInvalid: 'Utilisez une heure valide, par exemple 09:30.',
    cancelTitle: 'Annuler le rendez-vous ?',
    confirmTitle: 'Confirmer le rendez-vous ?',
    completeTitle: 'Terminer le rendez-vous ?',
    yes: 'Oui',
    no: 'Non',
    statuses: {
      scheduled: 'Planifié',
      awaiting_approval: 'À valider',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      in_progress: 'En cours',
    },
  },
  en: {
    eyebrow: 'Schedule',
    title: 'Day',
    subtitle: 'Appointments, edits and quick actions for this day.',
    back: 'Back',
    add: 'Add',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    complete: 'Complete',
    createTitle: 'New appointment',
    editTitle: 'Edit appointment',
    patient: 'Patient',
    searchPatient: 'Search patient...',
    type: 'Type',
    time: 'Time',
    duration: 'Duration',
    slot: 'Slot',
    chooseSlot: 'Choose an available slot',
    noSlot: 'No available slot for this mode.',
    loadingSlots: 'Loading slots...',
    practitionerRequired: 'No practitioner assigned to this account. Sign in as a doctor or assign a practitioner.',
    mode: 'Mode',
    inPerson: 'In person',
    online: 'Online',
    reason: 'Reason',
    notes: 'Notes',
    appointments: 'Appointments',
    waitlist: 'Waitlist',
    emptyTitle: 'No appointments',
    emptyText: 'Add an appointment for this date or check the waitlist.',
    pastEmptyText: 'No past appointment for this date.',
    readOnly: 'History',
    loadError: 'Unable to load this day.',
    saveError: 'Unable to save this appointment.',
    patientRequired: 'Choose a patient to create the appointment.',
    timeInvalid: 'Use a valid time, for example 09:30.',
    cancelTitle: 'Cancel appointment?',
    confirmTitle: 'Confirm appointment?',
    completeTitle: 'Complete appointment?',
    yes: 'Yes',
    no: 'No',
    statuses: {
      scheduled: 'Scheduled',
      awaiting_approval: 'To approve',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      in_progress: 'In progress',
    },
  },
};

type StaffAvailableSlot = AvailableSlot & {
  session?: string;
};

const getLocale = (language: PatientLanguage) => (language === 'en' ? 'en-US' : 'fr-FR');
const parseDateKey = (date?: string | string[]) => {
  const value = Array.isArray(date) ? date[0] : date;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const toLocalDateTimePayload = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${toDateKey(date)}T${hours}:${minutes}:${seconds}`;
};
const isPastDay = (date: Date) => toDateKey(date) < toDateKey(new Date());
const parseAppointmentDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDateTitle = (date: Date, language: PatientLanguage) => (
  date.toLocaleDateString(getLocale(language), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
);
const formatTime = (value?: string | null, language: PatientLanguage = 'fr') => {
  const date = parseAppointmentDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
};
const getStatusColor = (status?: string | null) => {
  if (status === 'confirmed') return '#10b981';
  if (status === 'awaiting_approval') return '#f59e0b';
  if (status === 'cancelled') return '#e11d48';
  if (status === 'completed') return '#64748b';
  return '#2563eb';
};
const getInitials = (name?: string | null) => (
  (name || 'Patient').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
);
const getPatientName = (patient: StaffPatient) => (
  patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.email || patient.phone || 'Patient'
);
const defaultForm = (): AppointmentForm => ({
  patientId: '',
  appointmentType: 'Consultation',
  startTime: '09:00',
  duration: '30',
  consultationMode: 'in-person',
  notes: '',
  reasonDetail: '',
});
const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
const buildRange = (date: Date, time: string, duration: string) => {
  const [hours, minutes] = time.trim().split(':').map(Number);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  const durationMinutes = Math.max(5, Number(duration) || 30);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end, durationMinutes };
};

export default function StaffCalendarDayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; new?: string; patientId?: string }>();
  const language = usePatientLanguage();
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  const t = copy[language];
  const selectedDate = useMemo(() => parseDateKey(params.date), [params.date]);
  const selectedDateIsPast = useMemo(() => isPastDay(selectedDate), [selectedDate]);
  const dateKey = toDateKey(selectedDate);
  const [appointments, setAppointments] = useState<StaffCalendarAppointment[]>([]);
  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [waitlist, setWaitlist] = useState<StaffWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(staffSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [availableSlots, setAvailableSlots] = useState<StaffAvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<StaffCalendarAppointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(defaultForm());
  const [patientSearch, setPatientSearch] = useState('');
  const [autoOpened, setAutoOpened] = useState(false);
  const practitionerId = useMemo(() => {
    const sessionUser = staffSession.getUser();
    if (sessionUser?.role === 'practitioner') return sessionUser.id;
    return sessionUser?.assignedPractitionerId || '';
  }, []);

  const loadDay = useCallback(async (isRefresh = false) => {
    const token = staffSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0).toISOString();
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).toISOString();
      const [appointmentsResponse, patientsResponse, waitlistResponse] = await Promise.all([
        staffApi.getCalendar(token, { start, end }),
        staffApi.getPatients(token, { limit: 30, isActive: 'true' }),
        staffApi.getWaitlist(token, { date: dateKey, status: 'active' }),
      ]);
      setAppointments(appointmentsResponse.data || []);
      setPatients(patientsResponse.data.patients || []);
      setWaitlist(waitlistResponse.data || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateKey, selectedDate, t.loadError, t.title]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const loadAvailableSlots = useCallback(async (mode: AppointmentForm['consultationMode']) => {
    if (!practitionerId || selectedDateIsPast) {
      setAvailableSlots([]);
      return;
    }

    setSlotsLoading(true);
    try {
      const response = await staffApi.getAvailableSlots({
        practitionerId,
        date: dateKey,
        consultationMode: mode,
      });
      const slots = (response.data || []) as StaffAvailableSlot[];
      setAvailableSlots(slots);
      const firstAvailable = slots.find((slot) => slot.available);
      if (firstAvailable) {
        setForm((current) => ({
          ...current,
          startTime: firstAvailable.time,
          duration: String(firstAvailable.durationMinutes || current.duration || '30'),
        }));
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [dateKey, practitionerId, selectedDateIsPast]);

  useEffect(() => {
    if (formVisible && !editing) {
      loadAvailableSlots(form.consultationMode);
    }
  }, [editing, form.consultationMode, formVisible, loadAvailableSlots]);

  const sortedAppointments = useMemo(() => (
    [...appointments].sort((a, b) => (parseAppointmentDate(a.start)?.getTime() || 0) - (parseAppointmentDate(b.start)?.getTime() || 0))
  ), [appointments]);
  const selectedSlotAvailable = useMemo(() => (
    Boolean(editing) || availableSlots.some((slot) => slot.available && slot.time === form.startTime)
  ), [availableSlots, editing, form.startTime]);

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients.slice(0, 8);
    return patients.filter((patient) => (
      getPatientName(patient).toLowerCase().includes(query) ||
      String(patient.phone || '').includes(query) ||
      String(patient.email || '').toLowerCase().includes(query)
    )).slice(0, 8);
  }, [patientSearch, patients]);

  const openCreate = () => {
    if (selectedDateIsPast) return;
    setEditing(null);
    setPatientSearch('');
    setForm({ ...defaultForm(), patientId: params.patientId || patients[0]?.id || '' });
    setAvailableSlots([]);
    setFormVisible(true);
  };

  useEffect(() => {
    if (autoOpened || params.new !== '1' || selectedDateIsPast || patients.length === 0) return;
    setAutoOpened(true);
    setEditing(null);
    setPatientSearch('');
    setForm({ ...defaultForm(), appointmentType: 'Suivi', patientId: params.patientId || patients[0]?.id || '' });
    setAvailableSlots([]);
    setFormVisible(true);
  }, [autoOpened, params.new, params.patientId, patients, selectedDateIsPast]);

  const openEdit = (appointment: StaffCalendarAppointment) => {
    if (selectedDateIsPast) return;
    const start = parseAppointmentDate(appointment.start);
    const end = parseAppointmentDate(appointment.end);
    const duration = start && end ? Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)) : 30;
    setEditing(appointment);
    setPatientSearch('');
    setAvailableSlots([]);
    setForm({
      patientId: '',
      appointmentType: appointment.type || 'Consultation',
      startTime: start ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '09:00',
      duration: String(duration),
      consultationMode: appointment.consultationMode === 'online' ? 'online' : 'in-person',
      notes: appointment.notes || '',
      reasonDetail: appointment.reasonDetail || appointment.reasonCategory || '',
    });
    setFormVisible(true);
  };

  const saveAppointment = async () => {
    const token = staffSession.getToken();
    if (!token || actionLoading) return;
    if (!isValidTime(form.startTime)) {
      Alert.alert(t.title, t.timeInvalid);
      return;
    }
    if (!editing && !form.patientId) {
      Alert.alert(t.title, t.patientRequired);
      return;
    }
    if (!editing && !practitionerId) {
      Alert.alert(t.title, t.practitionerRequired);
      return;
    }
    if (!editing && !selectedSlotAvailable) {
      Alert.alert(t.title, t.noSlot);
      return;
    }

    const { start, end, durationMinutes } = buildRange(selectedDate, form.startTime, form.duration);
    setActionLoading(editing ? `${editing.id}:edit` : 'create');
    try {
      if (editing) {
        await staffApi.updateAppointment(token, editing.id, {
          appointmentType: form.appointmentType.trim() || 'Consultation',
          startTime: toLocalDateTimePayload(start),
          endTime: toLocalDateTimePayload(end),
          notes: form.notes,
          consultationMode: form.consultationMode,
          reasonDetail: form.reasonDetail,
        });
      } else {
        const payload: StaffAppointmentCreatePayload = {
          patientId: form.patientId,
          practitionerId,
          appointmentType: form.appointmentType.trim() || 'Consultation',
          title: form.appointmentType.trim() || 'Consultation',
          startTime: toLocalDateTimePayload(start),
          endTime: toLocalDateTimePayload(end),
          durationMinutes,
          notes: form.notes,
          consultationMode: form.consultationMode,
          reasonDetail: form.reasonDetail,
        };
        await staffApi.createAppointment(token, payload);
      }
      setFormVisible(false);
      await loadDay(true);
    } catch (error) {
      Alert.alert(t.title, error instanceof Error && error.message ? error.message : t.saveError);
    } finally {
      setActionLoading('');
    }
  };

  const updateStatus = async (appointment: StaffCalendarAppointment, status: string) => {
    const token = staffSession.getToken();
    if (!token || actionLoading || selectedDateIsPast) return;
    setActionLoading(`${appointment.id}:${status}`);
    try {
      await staffApi.updateAppointment(token, appointment.id, { status });
      await loadDay(true);
    } catch {
      Alert.alert(t.title, t.saveError);
    } finally {
      setActionLoading('');
    }
  };

  const confirmStatus = (appointment: StaffCalendarAppointment, status: string) => {
    const title = status === 'confirmed' ? t.confirmTitle : status === 'completed' ? t.completeTitle : t.cancelTitle;
    Alert.alert(title, appointment.patientName || t.patient, [
      { text: t.no, style: 'cancel' },
      { text: t.yes, style: status === 'cancelled' ? 'destructive' : 'default', onPress: () => updateStatus(appointment, status) },
    ]);
  };

  if (!staffSession.getToken()) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.replace('/auth/staff-login' as never)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDay(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/staff/calendar' as never)} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{t.back}</Text>
          </Pressable>
          {selectedDateIsPast ? (
            <View style={[styles.readOnlyPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
              <Text style={[styles.readOnlyText, { color: colors.muted }]}>{t.readOnly}</Text>
            </View>
          ) : (
            <Pressable onPress={openCreate} style={styles.addButton}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>{t.add}</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="today-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{formatDateTitle(selectedDate, language)}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t.subtitle}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard color="#2563eb" icon="calendar-clear-outline" label={t.appointments} value={sortedAppointments.length} />
          <SummaryCard color="#f59e0b" icon="hourglass-outline" label={t.waitlist} value={waitlist.length} />
        </View>

        {loading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : sortedAppointments.length > 0 ? (
          <View style={styles.list}>
            {sortedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                actionLoading={actionLoading}
                appointment={appointment}
                colors={colors}
                labels={t}
                language={language}
                readOnly={selectedDateIsPast}
                onCancel={() => confirmStatus(appointment, 'cancelled')}
                onComplete={() => confirmStatus(appointment, 'completed')}
                onConfirm={() => confirmStatus(appointment, 'confirmed')}
                onEdit={() => openEdit(appointment)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={34} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.emptyTitle}</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{selectedDateIsPast ? t.pastEmptyText : t.emptyText}</Text>
            {!selectedDateIsPast ? (
              <Pressable onPress={openCreate} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{t.add}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.formHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>{editing ? t.edit : t.add}</Text>
                <Text style={[styles.formTitle, { color: colors.text }]}>{editing ? t.editTitle : t.createTitle}</Text>
              </View>
              <Pressable onPress={() => setFormVisible(false)} style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>
              {!editing ? (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t.patient}</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.subtle} />
                    <TextInput
                      value={patientSearch}
                      onChangeText={setPatientSearch}
                      placeholder={t.searchPatient}
                      placeholderTextColor={colors.subtle}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                  <View style={styles.patientList}>
                    {filteredPatients.map((patient) => {
                      const active = form.patientId === patient.id;
                      return (
                        <Pressable
                          key={patient.id}
                          onPress={() => setForm((current) => ({ ...current, patientId: patient.id }))}
                          style={[styles.patientOption, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
                        >
                          <Text numberOfLines={1} style={[styles.patientOptionText, { color: active ? '#fff' : colors.text }]}>
                            {getPatientName(patient)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t.mode}</Text>
                <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
                  {(['in-person', 'online'] as const).map((mode) => {
                    const active = form.consultationMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setForm((current) => ({ ...current, consultationMode: mode }))}
                        style={[styles.segmentButton, active && styles.segmentButtonActive]}
                      >
                        <Text style={[styles.segmentText, { color: active ? '#fff' : colors.muted }]}>{mode === 'online' ? t.online : t.inPerson}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {!editing ? (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>{t.slot}</Text>
                  {slotsLoading ? (
                    <Text style={[styles.helperText, { color: colors.muted }]}>{t.loadingSlots}</Text>
                  ) : availableSlots.length > 0 ? (
                    <View style={styles.slotGrid}>
                      {availableSlots.map((slot) => {
                        const active = form.startTime === slot.time;
                        return (
                          <Pressable
                            key={`${slot.time}-${slot.endTime || ''}`}
                            disabled={!slot.available}
                            onPress={() => setForm((current) => ({
                              ...current,
                              startTime: slot.time,
                              duration: String(slot.durationMinutes || current.duration || '30'),
                            }))}
                            style={[
                              styles.slotButton,
                              { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border },
                              !slot.available && styles.slotButtonDisabled,
                            ]}
                          >
                            <Text style={[styles.slotTime, { color: active ? '#fff' : colors.text }]}>{slot.time}</Text>
                            <Text style={[styles.slotMeta, { color: active ? '#dbeafe' : colors.muted }]}>
                              {slot.endTime || `${slot.durationMinutes || form.duration} min`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.helperText, { color: colors.muted }]}>{practitionerId ? t.noSlot : t.practitionerRequired}</Text>
                  )}
                </View>
              ) : null}

              <FormInput colors={colors} label={t.type} value={form.appointmentType} onChangeText={(value) => setForm((current) => ({ ...current, appointmentType: value }))} />
              <View style={styles.formRow}>
                <FormInput colors={colors} label={t.time} value={form.startTime} onChangeText={(value) => setForm((current) => ({ ...current, startTime: value }))} />
                <FormInput colors={colors} keyboardType="numeric" label={`${t.duration} (min)`} value={form.duration} onChangeText={(value) => setForm((current) => ({ ...current, duration: value }))} />
              </View>

              <FormInput colors={colors} label={t.reason} value={form.reasonDetail} onChangeText={(value) => setForm((current) => ({ ...current, reasonDetail: value }))} />
              <FormInput colors={colors} label={t.notes} multiline value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} />

              <Pressable
                disabled={Boolean(actionLoading) || slotsLoading || (!editing && !selectedSlotAvailable)}
                onPress={saveAppointment}
                style={[styles.saveButton, (Boolean(actionLoading) || slotsLoading || (!editing && !selectedSlotAvailable)) && styles.disabledButton]}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t.save}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SummaryCard({ color, icon, label, value }: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}16` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function AppointmentCard({
  actionLoading,
  appointment,
  colors,
  labels,
  language,
  readOnly,
  onCancel,
  onComplete,
  onConfirm,
  onEdit,
}: {
  actionLoading: string;
  appointment: StaffCalendarAppointment;
  colors: typeof mobileTheme.light;
  labels: typeof copy.fr;
  language: PatientLanguage;
  readOnly: boolean;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const status = appointment.status || 'scheduled';
  const statusColor = getStatusColor(status);
  const busy = actionLoading.startsWith(appointment.id);

  return (
    <View style={[styles.appointmentCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: statusColor }]}>
      <View style={styles.appointmentTop}>
        <View style={[styles.timeBox, { backgroundColor: `${statusColor}16` }]}>
          <Text style={[styles.timeText, { color: statusColor }]}>{formatTime(appointment.start, language)}</Text>
          <Text style={[styles.endText, { color: colors.muted }]}>{formatTime(appointment.end, language)}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.patientLine}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(appointment.patientName)}</Text>
            </View>
            <View style={styles.patientTextBlock}>
              <Text numberOfLines={1} style={[styles.patientName, { color: colors.text }]}>{appointment.patientName || labels.patient}</Text>
              <Text numberOfLines={1} style={[styles.appointmentType, { color: colors.muted }]}>{appointment.type || 'Consultation'}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <Text style={[styles.statusChip, { backgroundColor: `${statusColor}18`, color: statusColor }]}>
              {labels.statuses[status as keyof typeof labels.statuses] || status}
            </Text>
            <Text style={[styles.modeChip, { backgroundColor: colors.surfaceAlt, color: colors.muted }]}>
              {appointment.consultationMode === 'online' ? labels.online : labels.inPerson}
            </Text>
          </View>
        </View>
      </View>

      {appointment.reasonDetail || appointment.reasonCategory ? (
        <Text style={[styles.detailText, { color: colors.text }]}>{appointment.reasonDetail || appointment.reasonCategory}</Text>
      ) : null}
      {appointment.notes ? <Text style={[styles.notesText, { color: colors.muted }]}>{appointment.notes}</Text> : null}

      {!readOnly ? (
        <View style={styles.actions}>
          <ActionButton color="#2563eb" disabled={busy} icon="create-outline" label={labels.edit} onPress={onEdit} />
          {status === 'scheduled' || status === 'awaiting_approval' ? (
            <ActionButton color="#10b981" disabled={busy} icon="checkmark-outline" label={labels.confirm} onPress={onConfirm} />
          ) : null}
          {status === 'confirmed' ? (
            <ActionButton color="#64748b" disabled={busy} icon="flag-outline" label={labels.complete} onPress={onComplete} />
          ) : null}
          {!['cancelled', 'completed'].includes(status) ? (
            <ActionButton color="#e11d48" disabled={busy} icon="close-outline" label={labels.cancel} onPress={onCancel} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({ color, disabled, icon, label, onPress }: { color: string; disabled?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: `${color}16` }, disabled && styles.disabledButton]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function FormInput({
  colors,
  keyboardType,
  label,
  multiline,
  onChangeText,
  value,
}: {
  colors: typeof mobileTheme.light;
  keyboardType?: 'default' | 'numeric';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        onChangeText={onChangeText}
        value={value}
        placeholderTextColor={colors.subtle}
        style={[
          styles.textInput,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
          multiline && styles.textArea,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 14, padding: 18, paddingBottom: 44 },
  centerScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  backButton: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 42, paddingHorizontal: 12 },
  backText: { fontSize: 13, fontWeight: '900' },
  addButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, flexDirection: 'row', gap: 6, minHeight: 42, paddingHorizontal: 14 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  readOnlyPill: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 42, paddingHorizontal: 13 },
  readOnlyText: { fontSize: 12, fontWeight: '900' },
  heroCard: { alignItems: 'center', borderRadius: 26, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  heroIcon: { alignItems: 'center', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 25, fontWeight: '900', lineHeight: 31, marginTop: 3, textTransform: 'capitalize' },
  subtitle: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { borderRadius: 22, borderWidth: 1, flex: 1, minHeight: 106, padding: 14 },
  summaryIcon: { alignItems: 'center', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  summaryValue: { fontSize: 26, fontWeight: '900', marginTop: 10 },
  summaryLabel: { fontSize: 12, fontWeight: '900', marginTop: 2 },
  loadingCard: { alignItems: 'center', borderRadius: 22, padding: 18 },
  list: { gap: 12 },
  appointmentCard: { borderLeftWidth: 5, borderRadius: 24, borderWidth: 1, gap: 11, padding: 14 },
  appointmentTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  timeBox: { alignItems: 'center', borderRadius: 17, justifyContent: 'center', minHeight: 66, width: 72 },
  timeText: { fontSize: 16, fontWeight: '900' },
  endText: { fontSize: 11, fontWeight: '900', marginTop: 4 },
  identity: { flex: 1, gap: 8, minWidth: 0 },
  patientLine: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 15, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  patientTextBlock: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 16, fontWeight: '900' },
  appointmentType: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  modeChip: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  detailText: { fontSize: 13, fontWeight: '800', lineHeight: 19 },
  notesText: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  actionButton: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 34, paddingHorizontal: 11 },
  actionText: { fontSize: 11, fontWeight: '900' },
  emptyCard: { alignItems: 'center', borderRadius: 28, borderWidth: 1, gap: 9, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyText: { fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, justifyContent: 'center', minHeight: 46, paddingHorizontal: 18 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  modalOverlay: { backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'flex-end' },
  formSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', padding: 18 },
  formHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  formTitle: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  closeButton: { alignItems: 'center', borderRadius: 16, height: 42, justifyContent: 'center', width: 42 },
  formBody: { gap: 12, paddingBottom: 12 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 12, fontWeight: '900' },
  inputRow: { alignItems: 'center', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '800', minHeight: 44 },
  patientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  patientOption: { borderRadius: 999, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 9 },
  patientOptionText: { fontSize: 12, fontWeight: '900' },
  formRow: { flexDirection: 'row', gap: 10 },
  textInput: { borderRadius: 17, borderWidth: 1, fontSize: 14, fontWeight: '800', minHeight: 46, paddingHorizontal: 12 },
  textArea: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  segment: { borderRadius: 18, flexDirection: 'row', gap: 6, padding: 5 },
  segmentButton: { alignItems: 'center', borderRadius: 14, flex: 1, minHeight: 38, justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: '#2563eb' },
  segmentText: { fontSize: 12, fontWeight: '900' },
  helperText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotButton: { borderRadius: 16, borderWidth: 1, minWidth: 82, paddingHorizontal: 12, paddingVertical: 10 },
  slotButtonDisabled: { opacity: 0.38 },
  slotTime: { fontSize: 14, fontWeight: '900' },
  slotMeta: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  saveButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, justifyContent: 'center', minHeight: 48, marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
});
