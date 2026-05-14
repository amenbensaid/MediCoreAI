import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { patientProfileApi } from '@/src/api/profile';
import { patientSession } from '@/src/stores/patientAuthStore';
import { usePatientLanguage } from '@/src/stores/patientUiStore';
import type { PatientProfileWithDocuments } from '@/src/types/document';
import { getFileUrl } from '@/src/utils/getFileUrl';

type ProfileForm = {
  phone: string;
  address: string;
  city: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  avatarUrl: string;
};

type AvatarFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

const emptyForm: ProfileForm = {
  phone: '',
  address: '',
  city: '',
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  avatarUrl: '',
};

const copy = {
  fr: {
    subtitle: 'Profil patient',
    badge: 'Informations personnelles',
    title: 'Mon profil',
    description: 'Mettez à jour vos coordonnées et informations médicales utiles.',
    contact: 'Coordonnées',
    medical: 'Informations médicales',
    phone: 'Téléphone',
    address: 'Adresse',
    city: 'Ville',
    bloodType: 'Groupe sanguin',
    allergies: 'Allergies',
    chronicConditions: 'Maladies chroniques',
    currentMedications: 'Médicaments actuels',
    avatar: 'Photo de profil',
    avatarUrl: 'URL photo profil',
    choosePhoto: 'Choisir une photo',
    changePhoto: 'Changer la photo',
    photoHelp: 'PNG ou JPG depuis votre téléphone.',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Profil mis à jour.',
    loadError: 'Impossible de charger le profil.',
    saveError: 'Impossible de mettre à jour le profil.',
    loginRequired: 'Connectez-vous pour modifier votre profil.',
    commaHelp: 'Séparez les éléments par des virgules.',
  },
  en: {
    subtitle: 'Patient profile',
    badge: 'Personal information',
    title: 'My profile',
    description: 'Update your contact details and useful medical information.',
    contact: 'Contact',
    medical: 'Medical information',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    bloodType: 'Blood type',
    allergies: 'Allergies',
    chronicConditions: 'Chronic conditions',
    currentMedications: 'Current medications',
    avatar: 'Profile photo',
    avatarUrl: 'Profile photo URL',
    choosePhoto: 'Choose photo',
    changePhoto: 'Change photo',
    photoHelp: 'PNG or JPG from your phone.',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Profile updated.',
    loadError: 'Unable to load profile.',
    saveError: 'Unable to update profile.',
    loginRequired: 'Sign in to edit your profile.',
    commaHelp: 'Separate items with commas.',
  },
};

const listToText = (value?: string[]) => (value || []).join(', ');
const textToList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function PatientProfileScreen() {
  const language = usePatientLanguage();
  const t = copy[language];
  const [profile, setProfile] = useState<PatientProfileWithDocuments | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<AvatarFile | null>(null);

  const loadProfile = useCallback(async (isRefresh = false) => {
    const token = patientSession.getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await patientProfileApi.getProfile(token);
      const nextProfile = response.data;
      setProfile(nextProfile);
      setForm({
        phone: nextProfile.phone || '',
        address: nextProfile.address || '',
        city: nextProfile.city || '',
        bloodType: nextProfile.bloodType || '',
        allergies: listToText(nextProfile.allergies),
        chronicConditions: listToText(nextProfile.chronicConditions),
        currentMedications: listToText(nextProfile.currentMedications),
        avatarUrl: nextProfile.avatarUrl || '',
      });
      setAvatarFile(null);
    } catch {
      Alert.alert(t.title, t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t.loadError, t.title]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    const token = patientSession.getToken();
    if (!token || saving) return;

    setSaving(true);
    try {
      await patientProfileApi.updateProfile({
        phone: form.phone,
        address: form.address,
        city: form.city,
        bloodType: form.bloodType,
        allergies: textToList(form.allergies),
        chronicConditions: textToList(form.chronicConditions),
        currentMedications: textToList(form.currentMedications),
        avatarUrl: form.avatarUrl,
        avatarFile,
      }, token);
      Alert.alert(t.title, t.saved);
      loadProfile(true);
    } catch {
      Alert.alert(t.title, t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*'],
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAvatarFile({
      uri: asset.uri,
      name: asset.name || `profile-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
  };

  const avatarPreview = avatarFile?.uri || getFileUrl(form.avatarUrl || profile?.avatarUrl || null);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 18}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>{t.badge}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.description}>{t.description}</Text>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {(profile?.firstName?.[0] || patientSession.getUser()?.firstName?.[0] || 'P')}
                </Text>
              )}
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.name}>{profile?.firstName || patientSession.getUser()?.firstName} {profile?.lastName || patientSession.getUser()?.lastName}</Text>
              <Text style={styles.email}>{profile?.email || patientSession.getUser()?.email}</Text>
            </View>
          </View>
        </View>

        <Section title={t.avatar}>
          <View style={styles.photoEditor}>
            <View style={styles.photoPreview}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.photoPreviewImage} />
              ) : (
                <Text style={styles.photoPreviewText}>
                  {(profile?.firstName?.[0] || patientSession.getUser()?.firstName?.[0] || 'P')}
                </Text>
              )}
            </View>
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>{t.avatar}</Text>
              <Text style={styles.photoHelp}>{avatarFile?.name || t.photoHelp}</Text>
              <Pressable onPress={pickAvatar} style={styles.photoButton}>
                <Text style={styles.photoButtonText}>{avatarPreview ? t.changePhoto : t.choosePhoto}</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title={t.contact}>
          <Input label={t.phone} value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <Input label={t.address} value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
          <Input label={t.city} value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
        </Section>

        <Section title={t.medical}>
          <Input label={t.bloodType} value={form.bloodType} onChangeText={(value) => setForm((current) => ({ ...current, bloodType: value }))} />
          <Input label={t.allergies} helper={t.commaHelp} value={form.allergies} onChangeText={(value) => setForm((current) => ({ ...current, allergies: value }))} />
          <Input label={t.chronicConditions} helper={t.commaHelp} value={form.chronicConditions} onChangeText={(value) => setForm((current) => ({ ...current, chronicConditions: value }))} />
          <Input label={t.currentMedications} helper={t.commaHelp} value={form.currentMedications} onChangeText={(value) => setForm((current) => ({ ...current, currentMedications: value }))} />
        </Section>

        <Pressable onPress={saveProfile} disabled={saving} style={[styles.saveButton, saving && styles.disabledButton]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t.save}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Input({
  helper,
  label,
  onChangeText,
  value,
}: {
  helper?: string;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        returnKeyType="done"
        style={styles.input}
        value={value}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#f8fafc', flex: 1 },
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingBottom: 150,
    paddingTop: 8,
  },
  centerScreen: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center' },
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
  identityRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 18 },
  avatar: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 22, height: 62, justifyContent: 'center', width: 62 },
  avatarImage: { borderRadius: 22, height: '100%', width: '100%' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  identityInfo: { flex: 1 },
  name: { color: '#020617', fontSize: 17, fontWeight: '900' },
  email: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 3 },
  sectionCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 26,
    borderWidth: 1,
    gap: 13,
    padding: 18,
  },
  sectionTitle: { color: '#020617', fontSize: 19, fontWeight: '900' },
  photoEditor: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  photoPreview: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderColor: '#dbeafe',
    borderRadius: 24,
    borderWidth: 3,
    height: 82,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 82,
  },
  photoPreviewImage: { height: '100%', width: '100%' },
  photoPreviewText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  photoInfo: { flex: 1, gap: 6 },
  photoTitle: { color: '#020617', fontSize: 15, fontWeight: '900' },
  photoHelp: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  photoButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  photoButtonText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
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
  helper: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  saveButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 20, padding: 16 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
});
