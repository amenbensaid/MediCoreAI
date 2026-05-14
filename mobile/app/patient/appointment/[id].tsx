import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { documentsApi } from '@/src/api/documents';
import { patientApi, type PatientAppointment } from '@/src/api/patient';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';
import type { PatientDocumentKind, PatientDocumentPayload } from '@/src/types/document';

const copy = {
  fr: {
    badge: 'Détail rendez-vous',
    title: 'Rendez-vous',
    back: 'Retour',
    join: 'Rejoindre la consultation',
    onlineTitle: 'Consultation en ligne',
    jitsiReady: 'Lien Jitsi prêt',
    waitingJitsi: 'Lien Jitsi en attente',
    waitingJitsiText: 'Le lien Jitsi Meet sera disponible après validation du médecin.',
    addDocument: 'Ajouter un document',
    cancel: 'Annuler',
    reschedule: 'Reporter',
    rescheduleUnavailable: 'Réservez un nouveau rendez-vous depuis la liste des praticiens.',
    rescheduleHint: 'Choisissez un nouveau créneau avec le même praticien. Vous pourrez ensuite annuler l’ancien rendez-vous si besoin.',
    cancelConfirm: 'Voulez-vous annuler ce rendez-vous ?',
    cancelled: 'Rendez-vous annulé.',
    cancelError: 'Impossible d’annuler ce rendez-vous.',
    loadError: 'Impossible de charger ce rendez-vous.',
    notFound: 'Rendez-vous introuvable.',
    doctor: 'Praticien',
    date: 'Date',
    status: 'Statut',
    mode: 'Mode',
    payment: 'Paiement',
    details: 'Détails',
    reason: 'Motif',
    notes: 'Notes',
    preparation: 'Préparation',
    requestedDocs: 'Documents demandés',
    online: 'En ligne',
    inPerson: 'Présentiel',
    documentName: 'Nom du document',
    documentNotes: 'Notes document',
    pickFile: 'Choisir PDF ou image',
    selectedFile: 'Fichier sélectionné',
    sendDocument: 'Envoyer le document',
    documentSent: 'Document ajouté au rendez-vous.',
    documentError: 'Impossible d’ajouter ce document.',
    loginTitle: 'Connexion requise',
    loginText: 'Connectez-vous pour consulter ce rendez-vous.',
    login: 'Se connecter',
  },
  en: {
    badge: 'Appointment detail',
    title: 'Appointment',
    back: 'Back',
    join: 'Join consultation',
    onlineTitle: 'Online consultation',
    jitsiReady: 'Jitsi link ready',
    waitingJitsi: 'Jitsi link pending',
    waitingJitsiText: 'The Jitsi Meet link will be available after the doctor approves the appointment.',
    addDocument: 'Add document',
    cancel: 'Cancel',
    reschedule: 'Reschedule',
    rescheduleUnavailable: 'Book a new appointment from the practitioner list.',
    rescheduleHint: 'Choose a new slot with the same practitioner. You can then cancel the old appointment if needed.',
    cancelConfirm: 'Do you want to cancel this appointment?',
    cancelled: 'Appointment cancelled.',
    cancelError: 'Unable to cancel this appointment.',
    loadError: 'Unable to load this appointment.',
    notFound: 'Appointment not found.',
    doctor: 'Practitioner',
    date: 'Date',
    status: 'Status',
    mode: 'Mode',
    payment: 'Payment',
    details: 'Details',
    reason: 'Reason',
    notes: 'Notes',
    preparation: 'Preparation',
    requestedDocs: 'Requested documents',
    online: 'Online',
    inPerson: 'In person',
    documentName: 'Document name',
    documentNotes: 'Document notes',
    pickFile: 'Choose PDF or image',
    selectedFile: 'Selected file',
    sendDocument: 'Send document',
    documentSent: 'Document added to appointment.',
    documentError: 'Unable to add this document.',
    loginTitle: 'Login required',
    loginText: 'Sign in to view this appointment.',
    login: 'Sign in',
  },
};

const statusLabels = {
  fr: {
    awaiting_approval: 'À valider',
    scheduled: 'Planifié',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    no_show: 'Absent',
  },
  en: {
    awaiting_approval: 'Pending',
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  },
};

const detectKind = (file?: PatientDocumentPayload['file']): PatientDocumentKind => {
  const mimeType = String(file?.mimeType || '').toLowerCase();
  const filename = String(file?.name || '').toLowerCase();
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(filename)) return 'image';
  if (mimeType === 'application/pdf' || /\.pdf$/.test(filename)) return 'pdf';
  return 'document';
};

const formatDate = (value: string, language: 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isCancelable = (appointment?: PatientAppointment | null) => (
  Boolean(appointment) && !['completed', 'cancelled', 'no_show'].includes(appointment?.status || '')
);

export default function PatientAppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = usePatientLanguage();
  const t = copy[language];
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(patientSession.getToken()));
  const [refreshing, setRefreshing] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [docName, setDocName] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [file, setFile] = useState<PatientDocumentPayload['file']>(null);

  const appointment = useMemo(
    () => appointments.find((item) => item.id === id) || null,
    [appointments, id],
  );

  const loadAppointment = useCallback(async (isRefresh = false) => {
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
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const nextFile = {
      uri: asset.uri,
      name: asset.name || `appointment-document-${Date.now()}`,
      mimeType: asset.mimeType || null,
    };
    setFile(nextFile);
    setDocName((current) => current.trim() || nextFile.name.replace(/\.[^.]+$/, ''));
  };

  const uploadDocument = async () => {
    const token = patientSession.getToken();
    if (!token || !appointment || !docName.trim() || savingDocument) return;

    setSavingDocument(true);
    try {
      await documentsApi.createDocument({
        name: docName.trim(),
        documentCode: docName.trim(),
        category: 'general',
        notes: docNotes,
        appointmentId: appointment.id,
        accessScope: 'appointment',
        fileType: detectKind(file),
        file,
      }, token);
      Alert.alert(t.title, t.documentSent);
      setDocName('');
      setDocNotes('');
      setFile(null);
    } catch {
      Alert.alert(t.title, t.documentError);
    } finally {
      setSavingDocument(false);
    }
  };

  const cancelAppointment = () => {
    const token = patientSession.getToken();
    if (!token || !appointment) return;

    Alert.alert(t.cancel, t.cancelConfirm, [
      { text: t.back, style: 'cancel' },
      {
        text: t.cancel,
        style: 'destructive',
        onPress: async () => {
          try {
            await patientApi.cancelAppointment(appointment.id, token);
            Alert.alert(t.title, t.cancelled);
            loadAppointment(true);
          } catch {
            Alert.alert(t.title, t.cancelError);
          }
        },
      },
    ]);
  };

  const reschedule = () => {
    if (appointment?.practitionerId) {
      Alert.alert(t.reschedule, t.rescheduleHint, [
        { text: t.back, style: 'cancel' },
        {
          text: t.reschedule,
          onPress: () => router.push(`/patient/doctor/${appointment.practitionerId}` as never),
        },
      ]);
      return;
    }

    Alert.alert(t.reschedule, t.rescheduleUnavailable, [
      { text: t.back, style: 'cancel' },
      {
        text: t.reschedule,
        onPress: () => router.push('/patient/doctors' as never),
      },
    ]);
  };

  if (!patientSession.getToken()) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.loginCard}>
          <Text style={styles.heroBadge}>{t.badge}</Text>
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.description}>{t.loginText}</Text>
          <Pressable onPress={() => router.push('/auth/patient-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.loginCard}>
          <Text style={styles.heroBadge}>{t.badge}</Text>
          <Text style={styles.title}>{t.notFound}</Text>
          <Pressable onPress={() => router.push('/patient/appointments' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.back}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const status = statusLabels[language][appointment.status as keyof typeof statusLabels.fr] || appointment.status;
  const requestedDocuments = appointment.requestedDocuments || [];
  const isOnline = appointment.consultationMode === 'online';
  const canJoinOnline = isOnline && Boolean(appointment.meetLink) && !['cancelled', 'completed', 'no_show'].includes(appointment.status || '');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAppointment(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ {t.back}</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Text style={styles.heroBadge}>{t.badge}</Text>
        <Text style={styles.title}>{appointment.type || t.title}</Text>
        <Text style={styles.description}>{formatDate(appointment.startTime, language)}</Text>
        <View style={styles.heroActions}>
          {canJoinOnline ? (
            <Pressable onPress={() => Linking.openURL(appointment.meetLink || '')} style={styles.primaryLightButton}>
              <Text style={styles.primaryLightText}>{t.join}</Text>
            </Pressable>
          ) : null}
          {isCancelable(appointment) ? (
            <Pressable onPress={reschedule} style={styles.secondaryLightButton}>
              <Text style={styles.secondaryLightText}>{t.reschedule}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isOnline ? (
        <View style={[styles.sectionCard, canJoinOnline ? styles.onlineReadyCard : styles.onlinePendingCard]}>
          <Text style={styles.sectionTitle}>{t.onlineTitle}</Text>
          <Text style={canJoinOnline ? styles.onlineReadyTitle : styles.onlinePendingTitle}>
            {canJoinOnline ? t.jitsiReady : t.waitingJitsi}
          </Text>
          <Text style={styles.onlineText}>{canJoinOnline ? formatDate(appointment.startTime, language) : t.waitingJitsiText}</Text>
          {canJoinOnline ? (
            <Pressable onPress={() => Linking.openURL(appointment.meetLink || '')} style={styles.joinWideButton}>
              <Text style={styles.joinWideText}>{t.join}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t.title}</Text>
        <InfoLine label={t.doctor} value={appointment.practitioner || 'Dr.'} />
        <InfoLine label={t.date} value={formatDate(appointment.startTime, language)} />
        <InfoLine label={t.status} value={status} />
        <InfoLine label={t.mode} value={appointment.consultationMode === 'online' ? t.online : t.inPerson} />
        {appointment.paymentStatus ? <InfoLine label={t.payment} value={appointment.paymentStatus} /> : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t.details}</Text>
        {appointment.reasonDetail ? <InfoLine label={t.reason} value={appointment.reasonDetail} /> : null}
        {appointment.notes ? <InfoLine label={t.notes} value={appointment.notes} /> : null}
        {appointment.preparationNotes ? <InfoLine label={t.preparation} value={appointment.preparationNotes} /> : null}
        {requestedDocuments.length > 0 ? <InfoLine label={t.requestedDocs} value={requestedDocuments.join(', ')} /> : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t.addDocument}</Text>
        <TextInput value={docName} onChangeText={setDocName} placeholder={t.documentName} placeholderTextColor="#94a3b8" style={styles.input} />
        <TextInput value={docNotes} onChangeText={setDocNotes} placeholder={t.documentNotes} placeholderTextColor="#94a3b8" style={[styles.input, styles.textArea]} multiline />
        <Pressable onPress={pickFile} style={styles.fileButton}>
          <Text style={styles.fileButtonTitle}>{t.pickFile}</Text>
          <Text style={styles.fileButtonText}>{file ? `${t.selectedFile}: ${file.name}` : 'PDF · JPG · PNG · WEBP'}</Text>
        </Pressable>
        <Pressable onPress={uploadDocument} disabled={!docName.trim() || savingDocument} style={[styles.primaryButton, (!docName.trim() || savingDocument) && styles.disabledButton]}>
          {savingDocument ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t.sendDocument}</Text>}
        </Pressable>
      </View>

      {isCancelable(appointment) ? (
        <View style={styles.actionPanel}>
          <Pressable onPress={reschedule} style={styles.rescheduleButton}>
            <Text style={styles.rescheduleText}>{t.reschedule}</Text>
          </Pressable>
          <Pressable onPress={cancelAppointment} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, gap: 16, padding: 20, paddingBottom: 42, paddingTop: 8 },
  centerScreen: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 28, borderWidth: 1, padding: 22, width: '100%' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  backButtonText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  heroCard: { backgroundColor: '#2563eb', borderRadius: 30, padding: 22 },
  heroBadge: { color: '#dbeafe', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 16 },
  description: { color: '#dbeafe', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryLightButton: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, flex: 1, padding: 14 },
  primaryLightText: { color: '#2563eb', fontWeight: '900' },
  secondaryLightButton: { alignItems: 'center', borderColor: '#93c5fd', borderRadius: 18, borderWidth: 1, flex: 1, padding: 14 },
  secondaryLightText: { color: '#fff', fontWeight: '900' },
  sectionCard: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 26, borderWidth: 1, gap: 12, padding: 18 },
  sectionTitle: { color: '#020617', fontSize: 19, fontWeight: '900' },
  infoLine: { gap: 3 },
  infoLabel: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#334155', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  input: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 18, borderWidth: 1, color: '#020617', fontSize: 15, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 12 },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  fileButton: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderRadius: 22, borderStyle: 'dashed', borderWidth: 1, padding: 16 },
  fileButtonTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  fileButtonText: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 5 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  actionPanel: { flexDirection: 'row', gap: 10 },
  rescheduleButton: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 18, flex: 1, padding: 14 },
  rescheduleText: { color: '#2563eb', fontWeight: '900' },
  cancelButton: { alignItems: 'center', backgroundColor: '#fff1f2', borderRadius: 18, flex: 1, padding: 14 },
  cancelText: { color: '#e11d48', fontWeight: '900' },
  onlineReadyCard: { borderColor: '#bfdbfe' },
  onlinePendingCard: { borderColor: '#fde68a' },
  onlineReadyTitle: { color: '#2563eb', fontSize: 15, fontWeight: '900' },
  onlinePendingTitle: { color: '#d97706', fontSize: 15, fontWeight: '900' },
  onlineText: { color: '#64748b', fontSize: 13, fontWeight: '700', lineHeight: 20 },
  joinWideButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 2, padding: 14 },
  joinWideText: { color: '#fff', fontWeight: '900' },
});
