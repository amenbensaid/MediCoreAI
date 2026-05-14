import * as DocumentPicker from 'expo-document-picker';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { documentsApi } from '@/src/api/documents';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';
import type {
  PatientDocument,
  PatientDocumentAccessScope,
  PatientDocumentKind,
  PatientDocumentPayload,
  PatientProfileWithDocuments,
} from '@/src/types/document';
import { getFileUrl } from '@/src/utils/getFileUrl';

type Language = 'fr' | 'en';

type DocumentFormState = {
  name: string;
  documentCode: string;
  category: string;
  notes: string;
  accessScope: PatientDocumentAccessScope;
  fileType: PatientDocumentKind;
  file: PatientDocumentPayload['file'];
};

const emptyForm: DocumentFormState = {
  name: '',
  documentCode: '',
  category: 'general',
  notes: '',
  accessScope: 'private',
  fileType: 'document',
  file: null,
};

const copy = {
  fr: {
    badge: 'Dossier médical',
    title: 'Documents',
    subtitle: 'Ordonnances, analyses, imageries et justificatifs au même endroit.',
    add: 'Ajouter',
    back: 'Accueil',
    documents: 'Documents',
    shared: 'Partagés',
    images: 'Images',
    storage: 'Stockage',
    search: 'Rechercher un document...',
    all: 'Tous',
    latest: 'Derniers documents',
    emptyTitle: 'Aucun document',
    emptyText: 'Ajoutez un PDF, une image ou une note médicale pour compléter votre dossier.',
    private: 'Privé',
    appointment: 'RDV',
    sharedAccess: 'Médecins',
    open: 'Ouvrir',
    edit: 'Modifier',
    delete: 'Supprimer',
    noFile: 'Sans fichier',
    addTitle: 'Ajouter un document',
    editTitle: 'Modifier le document',
    name: 'Nom du document',
    requested: 'Type demandé',
    category: 'Catégorie',
    visibility: 'Confidentialité',
    notes: 'Notes',
    selectFile: 'Sélectionner un PDF ou une image',
    selectedFile: 'Fichier sélectionné',
    save: 'Enregistrer',
    update: 'Mettre à jour',
    cancel: 'Annuler',
    saved: 'Document enregistré.',
    updated: 'Document mis à jour.',
    deleted: 'Document supprimé.',
    loadError: 'Impossible de charger les documents.',
    saveError: 'Impossible d’enregistrer ce document.',
    deleteError: 'Impossible de supprimer ce document.',
    confirmDelete: 'Supprimer ce document ?',
    loginTitle: 'Connexion requise',
    loginText: 'Connectez-vous pour consulter votre dossier médical.',
    login: 'Se connecter',
  },
  en: {
    badge: 'Medical record',
    title: 'Documents',
    subtitle: 'Prescriptions, lab results, imaging and proofs in one place.',
    add: 'Add',
    back: 'Home',
    documents: 'Documents',
    shared: 'Shared',
    images: 'Images',
    storage: 'Storage',
    search: 'Search documents...',
    all: 'All',
    latest: 'Latest documents',
    emptyTitle: 'No documents',
    emptyText: 'Add a PDF, image or medical note to complete your record.',
    private: 'Private',
    appointment: 'Appointment',
    sharedAccess: 'Doctors',
    open: 'Open',
    edit: 'Edit',
    delete: 'Delete',
    noFile: 'No file',
    addTitle: 'Add document',
    editTitle: 'Edit document',
    name: 'Document name',
    requested: 'Requested type',
    category: 'Category',
    visibility: 'Privacy',
    notes: 'Notes',
    selectFile: 'Choose PDF or image',
    selectedFile: 'Selected file',
    save: 'Save',
    update: 'Update',
    cancel: 'Cancel',
    saved: 'Document saved.',
    updated: 'Document updated.',
    deleted: 'Document deleted.',
    loadError: 'Unable to load documents.',
    saveError: 'Unable to save this document.',
    deleteError: 'Unable to delete this document.',
    confirmDelete: 'Delete this document?',
    loginTitle: 'Login required',
    loginText: 'Sign in to view your medical record.',
    login: 'Sign in',
  },
};

const categories = [
  { key: 'general', fr: 'Général', en: 'General' },
  { key: 'lab-test', fr: 'Analyse', en: 'Lab test' },
  { key: 'imaging', fr: 'Imagerie', en: 'Imaging' },
  { key: 'prescription', fr: 'Ordonnance', en: 'Prescription' },
  { key: 'insurance', fr: 'Assurance', en: 'Insurance' },
];

const kindFilters: { key: '' | PatientDocumentKind; labelFr: string; labelEn: string }[] = [
  { key: '', labelFr: 'Tous', labelEn: 'All' },
  { key: 'pdf', labelFr: 'PDF', labelEn: 'PDF' },
  { key: 'image', labelFr: 'Images', labelEn: 'Images' },
  { key: 'document', labelFr: 'Notes', labelEn: 'Notes' },
];

const detectKind = (doc?: PatientDocument, file?: DocumentFormState['file']): PatientDocumentKind => {
  const mimeType = String(file?.mimeType || doc?.mime_type || '').toLowerCase();
  const filename = String(file?.name || doc?.file_path || doc?.file_url || '').toLowerCase();

  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(filename)) return 'image';
  if (mimeType === 'application/pdf' || /\.pdf$/.test(filename)) return 'pdf';
  return (doc?.file_type as PatientDocumentKind) || 'document';
};

const formatFileSize = (size?: number | string | null) => {
  const numericSize = Number(size || 0);
  if (!numericSize) return '';
  if (numericSize < 1024) return `${numericSize} B`;
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`;
  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
};

const getAccessLabel = (scope: string | null | undefined, language: Language) => {
  const t = copy[language];
  if (scope === 'appointment') return t.appointment;
  if (scope === 'shared') return t.sharedAccess;
  return t.private;
};

const getCategoryLabel = (category: string | null | undefined, language: Language) => (
  categories.find((item) => item.key === category)?.[language] || category || categories[0][language]
);

const getKindIconStyle = (kind: PatientDocumentKind) => {
  if (kind === 'pdf') return styles.pdfIcon;
  if (kind === 'image') return styles.imageIcon;
  return styles.documentIcon;
};

export default function PatientDocumentsScreen() {
  const router = useRouter();
  const language = usePatientLanguage();
  const t = copy[language];
  const auth = patientSession.getSession();
  const [profile, setProfile] = useState<PatientProfileWithDocuments | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(Boolean(auth.token));
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | PatientDocumentKind>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PatientDocument | null>(null);
  const [form, setForm] = useState<DocumentFormState>(emptyForm);

  const loadDocuments = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await documentsApi.getMedicalRecord(token);
      setProfile(response.data);
      setDocuments(response.data.documents || []);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const kind = detectKind(document);
      const text = `${document.name || ''} ${document.notes || ''} ${document.category || ''} ${document.document_code || ''}`.toLowerCase();
      return (!kindFilter || kind === kindFilter) && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [documents, kindFilter, query]);

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, document) => sum + Number(document.file_size || 0), 0);
    return {
      total: documents.length,
      shared: documents.filter((document) => ['appointment', 'shared'].includes(String(document.access_scope))).length,
      images: documents.filter((document) => detectKind(document) === 'image').length,
      storage: formatFileSize(totalSize) || '0 MB',
    };
  }, [documents]);

  const openCreateModal = () => {
    setEditingDocument(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (document: PatientDocument) => {
    setEditingDocument(document);
    setForm({
      name: document.name || '',
      documentCode: document.document_code || '',
      category: document.category || 'general',
      notes: document.notes || '',
      accessScope: (document.access_scope as PatientDocumentAccessScope) || 'private',
      fileType: detectKind(document),
      file: null,
    });
    setModalVisible(true);
  };

  const selectFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.name || `document-${Date.now()}`,
      mimeType: asset.mimeType || null,
    };

    setForm((current) => ({
      ...current,
      file,
      fileType: detectKind(undefined, file),
      name: current.name.trim() ? current.name : file.name.replace(/\.[^.]+$/, ''),
    }));
  };

  const saveDocument = async () => {
    const token = patientSession.getToken();
    if (!token || !form.name.trim() || saving) return;

    setSaving(true);
    try {
      const payload: PatientDocumentPayload = {
        name: form.name.trim(),
        documentCode: form.documentCode,
        category: form.category,
        notes: form.notes,
        accessScope: form.accessScope,
        fileType: form.fileType,
        file: form.file,
      };

      if (editingDocument) {
        await documentsApi.updateDocument(editingDocument.id, payload, token);
        Alert.alert(t.title, t.updated);
      } else {
        await documentsApi.createDocument(payload, token);
        Alert.alert(t.title, t.saved);
      }

      setModalVisible(false);
      setEditingDocument(null);
      setForm(emptyForm);
      loadDocuments(true);
    } catch {
      Alert.alert(t.title, t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = (document: PatientDocument) => {
    const token = patientSession.getToken();
    if (!token) return;

    Alert.alert(t.delete, t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await documentsApi.deleteDocument(document.id, token);
            Alert.alert(t.title, t.deleted);
            loadDocuments(true);
          } catch {
            Alert.alert(t.title, t.deleteError);
          }
        },
      },
    ]);
  };

  if (!auth.token) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.loginCard}>
          <Text style={styles.badge}>{t.badge}</Text>
          <Text style={styles.loginTitle}>{t.loginTitle}</Text>
          <Text style={styles.loginText}>{t.loginText}</Text>
          <Pressable onPress={() => router.push('/auth/patient-login' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDocuments(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroBadge}>{t.badge}</Text>
            <Pressable onPress={openCreateModal} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ {t.add}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
          <Text style={styles.patientName}>
            {profile?.firstName || auth.user?.firstName || ''} {profile?.lastName || auth.user?.lastName || ''}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label={t.documents} value={String(stats.total)} tone="#2563eb" />
          <StatCard label={t.shared} value={String(stats.shared)} tone="#14b8a6" />
          <StatCard label={t.images} value={String(stats.images)} tone="#8b5cf6" />
          <StatCard label={t.storage} value={stats.storage} tone="#f59e0b" />
        </View>

        <View style={styles.searchCard}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {kindFilters.map((filter) => {
              const selected = kindFilter === filter.key;
              return (
                <Pressable
                  key={filter.key || 'all'}
                  onPress={() => setKindFilter(filter.key)}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {language === 'fr' ? filter.labelFr : filter.labelEn}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.latest}</Text>
          {loading ? <ActivityIndicator color="#2563eb" /> : null}
        </View>

        {!loading && filteredDocuments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>□</Text>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.emptyText}</Text>
            <Pressable onPress={openCreateModal} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>+ {t.add}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.documentList}>
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                language={language}
                onDelete={() => deleteDocument(document)}
                onEdit={() => openEditModal(document)}
              />
            ))}
          </View>
        )}

        <Link href="/patient/home" asChild>
          <Pressable style={styles.backButton}>
            <Text style={styles.backButtonText}>{t.back}</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <DocumentFormModal
        form={form}
        language={language}
        saving={saving}
        title={editingDocument ? t.editTitle : t.addTitle}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingDocument(null);
          setForm(emptyForm);
        }}
        onChange={setForm}
        onPickFile={selectFile}
        onSave={saveDocument}
      />
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statMarker, { backgroundColor: tone }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DocumentCard({
  document,
  language,
  onDelete,
  onEdit,
}: {
  document: PatientDocument;
  language: Language;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const t = copy[language];
  const kind = detectKind(document);
  const fileUrl = getFileUrl(document.file_url);
  const createdAt = document.created_at
    ? new Date(document.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.documentCard}>
      <View style={styles.documentTop}>
        <View style={[styles.fileIcon, getKindIconStyle(kind)]}>
          <Text style={styles.fileIconText}>{kind === 'pdf' ? 'PDF' : kind === 'image' ? 'IMG' : 'DOC'}</Text>
        </View>
        <View style={styles.documentInfo}>
          <Text numberOfLines={1} style={styles.documentName}>{document.name}</Text>
          <Text style={styles.documentMeta}>
            {getCategoryLabel(document.category, language)} · {createdAt || t.documents}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={styles.kindBadge}>{kind.toUpperCase()}</Text>
            <Text style={styles.accessBadge}>{getAccessLabel(document.access_scope, language)}</Text>
          </View>
        </View>
      </View>

      {document.notes ? <Text numberOfLines={2} style={styles.notes}>{document.notes}</Text> : null}

      <View style={styles.documentFooter}>
        <Text style={styles.fileSize}>{formatFileSize(document.file_size) || t.noFile}</Text>
        <View style={styles.actionRow}>
          {fileUrl ? (
            <Pressable onPress={() => Linking.openURL(fileUrl)} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>{t.open}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onEdit} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{t.edit}</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.actionButton, styles.deleteAction]}>
            <Text style={[styles.actionButtonText, styles.deleteActionText]}>{t.delete}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DocumentFormModal({
  form,
  language,
  saving,
  title,
  visible,
  onCancel,
  onChange,
  onPickFile,
  onSave,
}: {
  form: DocumentFormState;
  language: Language;
  saving: boolean;
  title: string;
  visible: boolean;
  onCancel: () => void;
  onChange: (next: DocumentFormState | ((current: DocumentFormState) => DocumentFormState)) => void;
  onPickFile: () => void;
  onSave: () => void;
}) {
  const t = copy[language];

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>

            <Input label={t.name} value={form.name} onChangeText={(value) => onChange((current) => ({ ...current, name: value }))} />
            <Input label={t.requested} value={form.documentCode} onChangeText={(value) => onChange((current) => ({ ...current, documentCode: value }))} />

            <Text style={styles.inputLabel}>{t.category}</Text>
            <View style={styles.optionGrid}>
              {categories.map((category) => {
                const selected = form.category === category.key;
                return (
                  <Pressable
                    key={category.key}
                    onPress={() => onChange((current) => ({ ...current, category: category.key }))}
                    style={[styles.optionChip, selected && styles.optionChipActive]}
                  >
                    <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{category[language]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>{t.visibility}</Text>
            <View style={styles.optionGrid}>
              {(['private', 'appointment', 'shared'] as PatientDocumentAccessScope[]).map((scope) => {
                const selected = form.accessScope === scope;
                return (
                  <Pressable
                    key={scope}
                    onPress={() => onChange((current) => ({ ...current, accessScope: scope }))}
                    style={[styles.optionChip, selected && styles.optionChipActive]}
                  >
                    <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{getAccessLabel(scope, language)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label={t.notes}
              multiline
              value={form.notes}
              onChangeText={(value) => onChange((current) => ({ ...current, notes: value }))}
            />

            <Pressable onPress={onPickFile} style={styles.filePickerButton}>
              <Text style={styles.filePickerTitle}>{t.selectFile}</Text>
              <Text style={styles.filePickerText}>
                {form.file ? `${t.selectedFile}: ${form.file.name}` : 'PDF · JPG · PNG · WEBP'}
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable onPress={onCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={onSave}
                disabled={saving || !form.name.trim()}
                style={[styles.saveButton, (saving || !form.name.trim()) && styles.disabledButton]}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t.save}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Input({
  label,
  multiline,
  onChangeText,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        style={[styles.input, multiline && styles.textArea]}
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
  centerScreen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  brand: { color: '#020617', fontSize: 20, fontWeight: '900' },
  brandSub: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 1 },
  languageButton: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageActive: { color: '#334155', fontSize: 12, fontWeight: '900' },
  hero: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  heroHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroBadge: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  title: { color: '#020617', fontSize: 34, fontWeight: '900', marginTop: 18 },
  subtitle: { color: '#64748b', fontSize: 15, fontWeight: '600', lineHeight: 23, marginTop: 8 },
  patientName: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 102,
    padding: 14,
    width: '48.4%',
  },
  statMarker: { borderRadius: 999, height: 4, marginBottom: 14, width: 34 },
  statValue: { color: '#020617', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  searchCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterRow: { gap: 8, paddingTop: 12 },
  filterChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  filterChipTextActive: { color: '#fff' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#020617', fontSize: 20, fontWeight: '900' },
  documentList: { gap: 12 },
  documentCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  documentTop: { flexDirection: 'row', gap: 13 },
  fileIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  pdfIcon: { backgroundColor: '#ffe4e6' },
  imageIcon: { backgroundColor: '#dcfce7' },
  documentIcon: { backgroundColor: '#dbeafe' },
  fileIconText: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  documentInfo: { flex: 1, minWidth: 0 },
  documentName: { color: '#020617', fontSize: 17, fontWeight: '900' },
  documentMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  kindBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    color: '#4338ca',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accessBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notes: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
    padding: 12,
  },
  documentFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  fileSize: { color: '#94a3b8', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-end' },
  actionButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonText: { color: '#334155', fontSize: 11, fontWeight: '900' },
  deleteAction: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  deleteActionText: { color: '#e11d48' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 26,
  },
  emptyIcon: { color: '#94a3b8', fontSize: 40, fontWeight: '900' },
  emptyTitle: { color: '#020617', fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8, textAlign: 'center' },
  emptyButton: { backgroundColor: '#2563eb', borderRadius: 999, marginTop: 18, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: '#fff', fontWeight: '900' },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  backButtonText: { color: '#334155', fontWeight: '900' },
  loginCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    width: '100%',
  },
  badge: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  loginTitle: { color: '#020617', fontSize: 24, fontWeight: '900', marginTop: 10 },
  loginText: { color: '#64748b', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 18, padding: 14 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
  },
  modalContent: { gap: 13, padding: 20, paddingBottom: 34 },
  modalTitle: { color: '#020617', fontSize: 24, fontWeight: '900' },
  inputGroup: { gap: 7 },
  inputLabel: { color: '#334155', fontSize: 13, fontWeight: '900' },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  optionChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  optionChipTextActive: { color: '#fff' },
  filePickerButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 16,
  },
  filePickerTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  filePickerText: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 5 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  cancelButtonText: { color: '#334155', fontWeight: '900' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 18,
    flex: 1,
    padding: 14,
  },
  saveButtonText: { color: '#fff', fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
});
