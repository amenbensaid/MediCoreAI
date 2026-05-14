import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi } from '@/src/api/auth';

const copy = {
  fr: {
    language: 'FR',
    patientPortal: 'Portail patient',
    title: 'Mot de passe oublié',
    subtitle: 'Entrez votre email patient. Un administrateur recevra votre demande et pourra définir un mot de passe temporaire.',
    email: 'Email',
    missingEmail: 'Entrez une adresse email valide.',
    submit: 'Envoyer la demande',
    sending: 'Envoi...',
    successTitle: 'Demande envoyée',
    successText: 'Si ce compte patient existe, une demande de réinitialisation a été envoyée à l’administrateur.',
    backLogin: 'Retour connexion',
    backHome: 'Page d’accueil',
  },
  en: {
    language: 'EN',
    patientPortal: 'Patient portal',
    title: 'Forgot password',
    subtitle: 'Enter your patient email. An administrator will receive your request and can set a temporary password.',
    email: 'Email',
    missingEmail: 'Enter a valid email address.',
    submit: 'Send request',
    sending: 'Sending...',
    successTitle: 'Request sent',
    successText: 'If this patient account exists, a password reset request was sent to the administrator.',
    backLogin: 'Back to login',
    backHome: 'Home',
  },
};

const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const t = copy[language];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError('');
    if (!isEmail(email)) {
      setError(t.missingEmail);
      return;
    }

    setLoading(true);
    try {
      await authApi.patientForgotPassword(email.trim());
      setSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.missingEmail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 18}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage((current) => (current === 'fr' ? 'en' : 'fr'))}
            style={styles.languageButton}
          >
            <Text style={styles.languageActive}>{t.language}</Text>
            <Text style={styles.languageMuted}>{language === 'fr' ? 'EN' : 'FR'}</Text>
          </Pressable>
        </View>

        <View style={styles.brandCard}>
          <View style={styles.logo}><Text style={styles.logoText}>+</Text></View>
          <View>
            <Text style={styles.brand}>MediCore AI</Text>
            <Text style={styles.brandSub}>{t.patientPortal}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {sent ? (
            <>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.title}>{t.successTitle}</Text>
              <Text style={styles.subtitle}>{t.successText}</Text>
              <Pressable onPress={() => router.replace('/auth/patient-login' as never)} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{t.backLogin}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.subtitle}>{t.subtitle}</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t.email} <Text style={styles.required}>*</Text></Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholderTextColor="#94a3b8"
                  returnKeyType="send"
                  style={styles.input}
                  value={email}
                  onSubmitEditing={submit}
                />
              </View>

              <Pressable disabled={loading} onPress={submit} style={[styles.primaryButton, loading && styles.disabled]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.submit}</Text>}
              </Pressable>
            </>
          )}

          <Pressable onPress={() => router.replace('/' as never)}>
            <Text style={styles.homeLink}>{t.backHome}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#f8fafc', flex: 1 },
  container: { flexGrow: 1, padding: 22, paddingBottom: 160, paddingTop: 58 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: { color: '#2563eb', fontSize: 31, fontWeight: '800', lineHeight: 34 },
  languageButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
  },
  languageActive: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  languageMuted: { color: '#64748b', fontSize: 12, fontWeight: '900', paddingRight: 7 },
  brandCard: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
    marginTop: 35,
    padding: 12,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    width: 48,
  },
  logoText: { color: '#fff', fontSize: 29, fontWeight: '800', lineHeight: 32 },
  brand: { color: '#020617', fontSize: 22, fontWeight: '900' },
  brandSub: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 1 },
  card: {
    backgroundColor: '#fff',
    borderColor: '#dbeafe',
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    height: 62,
    justifyContent: 'center',
    marginBottom: 18,
    width: 62,
  },
  successIconText: { color: '#16a34a', fontSize: 32, fontWeight: '900' },
  title: { color: '#020617', fontSize: 31, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  error: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 16,
    borderWidth: 1,
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
    padding: 12,
  },
  fieldGroup: { marginTop: 18 },
  label: { color: '#334155', fontSize: 13, fontWeight: '900', marginBottom: 8 },
  required: { color: '#2563eb' },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 16,
    borderWidth: 1,
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
    minHeight: 52,
    paddingHorizontal: 15,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 18,
    marginTop: 22,
    minHeight: 54,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  homeLink: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 18, textAlign: 'center' },
});
