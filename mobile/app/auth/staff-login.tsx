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
import { staffSession } from '@/src/stores/staffAuthStore';

const copy = {
  fr: {
    language: 'FR',
    portal: 'Espace équipe',
    title: 'Connexion staff',
    subtitle: 'Accédez au dashboard, aux rendez-vous, patients et notifications de la clinique.',
    email: 'Email',
    password: 'Mot de passe',
    missingFields: 'Entrez votre email et votre mot de passe.',
    login: 'Se connecter',
    rememberMe: 'Se souvenir de moi',
    showPassword: 'Afficher',
    hidePassword: 'Masquer',
    forgotPassword: 'Mot de passe oublié ?',
    backHome: 'Page d’accueil',
  },
  en: {
    language: 'EN',
    portal: 'Staff workspace',
    title: 'Staff login',
    subtitle: 'Access the clinic dashboard, appointments, patients and notifications.',
    email: 'Email',
    password: 'Password',
    missingFields: 'Enter your email and password.',
    login: 'Sign in',
    rememberMe: 'Remember me',
    showPassword: 'Show',
    hidePassword: 'Hide',
    forgotPassword: 'Forgot password?',
    backHome: 'Home',
  },
};

export default function StaffLoginScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const t = copy[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError(t.missingFields);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.staffLogin(email.trim(), password);
      staffSession.setSession(response.data.token, response.data.user, { rememberMe });
      router.replace('/staff/dashboard' as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.missingFields);
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
            <Text style={styles.brandSub}>{t.portal}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Field label={t.email} required value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field
            actionLabel={passwordVisible ? t.hidePassword : t.showPassword}
            label={t.password}
            onActionPress={() => setPasswordVisible((current) => !current)}
            onChangeText={setPassword}
            required
            secureTextEntry={!passwordVisible}
            value={password}
          />

          <Pressable
            onPress={() => router.push('/auth/staff-forgot-password' as never)}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>{t.forgotPassword}</Text>
          </Pressable>

          <Pressable onPress={() => setRememberMe((current) => !current)} style={styles.rememberRow}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>{t.rememberMe}</Text>
          </Pressable>

          <Pressable disabled={loading} onPress={submit} style={[styles.primaryButton, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.login}</Text>}
          </Pressable>

          <Pressable onPress={() => router.replace('/' as never)}>
            <Text style={styles.homeLink}>{t.backHome}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  required?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  actionLabel?: string;
  onActionPress?: () => void;
};

function Field({ actionLabel, label, onActionPress, required, ...props }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label} {required ? <Text style={styles.required}>*</Text> : null}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          {...props}
          autoCapitalize="none"
          placeholderTextColor="#94a3b8"
          style={[styles.input, actionLabel && styles.inputWithAction]}
        />
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress} style={styles.inputAction}>
            <Text style={styles.inputActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
  inputWrap: { position: 'relative' },
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
  inputWithAction: { paddingRight: 88 },
  inputAction: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 0,
  },
  inputActionText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  forgotButton: { alignSelf: 'flex-end', marginTop: 12 },
  forgotText: { color: '#2563eb', fontSize: 13, fontWeight: '900' },
  rememberRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#bfdbfe',
    borderRadius: 7,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  rememberText: { color: '#334155', fontSize: 13, fontWeight: '900' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 56,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.65 },
  homeLink: { color: '#64748b', fontSize: 13, fontWeight: '800', marginTop: 18, textAlign: 'center' },
});
