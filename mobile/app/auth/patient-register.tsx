import { useLocalSearchParams, useRouter } from 'expo-router';
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
import en from '@/src/i18n/en';
import fr from '@/src/i18n/fr';
import { patientSession } from '@/src/stores/patientAuthStore';

export default function PatientRegisterScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const t = language === 'fr' ? fr.auth : en.auth;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const target = typeof redirect === 'string' && redirect ? redirect : '/patient/home';

  const submit = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8) {
      setError(t.missingFields);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.patientRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      patientSession.setSession(response.data.token, response.data.user);
      router.replace(target as never);
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
            <Text style={styles.brandSub}>{t.patientPortal}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t.registerTitle}</Text>
          <Text style={styles.subtitle}>{t.registerSubtitle}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.twoColumns}>
            <View style={styles.column}><Field label={t.firstName} required value={firstName} onChangeText={setFirstName} /></View>
            <View style={styles.column}><Field label={t.lastName} required value={lastName} onChangeText={setLastName} /></View>
          </View>
          <Field label={t.email} required value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label={t.phoneOptional} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field
            actionLabel={passwordVisible ? t.hidePassword : t.showPassword}
            label={`${t.password} · ${t.passwordHint}`}
            onActionPress={() => setPasswordVisible((current) => !current)}
            onChangeText={setPassword}
            required
            secureTextEntry={!passwordVisible}
            value={password}
          />
          <Field
            actionLabel={confirmPasswordVisible ? t.hidePassword : t.showPassword}
            label={t.confirmPassword}
            onActionPress={() => setConfirmPasswordVisible((current) => !current)}
            onChangeText={setConfirmPassword}
            required
            secureTextEntry={!confirmPasswordVisible}
            value={confirmPassword}
          />

          <Pressable disabled={loading} onPress={submit} style={[styles.primaryButton, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.create}</Text>}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t.haveAccount} </Text>
            <Pressable
              onPress={() => router.push({
                pathname: '/auth/patient-login',
                params: { redirect: target },
              } as never)}
            >
              <Text style={styles.linkText}>{t.backToLogin}</Text>
            </Pressable>
          </View>
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
    marginBottom: 20,
    marginTop: 24,
    padding: 12,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
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
  title: { color: '#020617', fontSize: 29, fontWeight: '900' },
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
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  fieldGroup: { marginTop: 17 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', marginBottom: 8 },
  required: { color: '#2563eb' },
  inputWrap: {
    position: 'relative',
  },
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
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 19 },
  footerText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
});
