import { Link } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import en from '@/src/i18n/en';
import fr from '@/src/i18n/fr';
import { patientSession } from '@/src/stores/patientAuthStore';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200';

export default function WelcomeScreen() {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [patientToken, setPatientToken] = useState(patientSession.getToken());
  const [showLaunchLogo, setShowLaunchLogo] = useState(true);
  const t = useMemo(() => (language === 'fr' ? fr.landing : en.landing), [language]);
  const fade = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const launchOpacity = useRef(new Animated.Value(0)).current;
  const launchScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(launchOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(launchScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(launchOpacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setShowLaunchLogo(false));
    }, 1250);

    return () => clearTimeout(timer);
  }, [launchOpacity, launchScale]);

  useEffect(() => {
    const unsubscribe = patientSession.subscribe((nextSession) => {
      setPatientToken(nextSession.token);
    });

    Animated.timing(fade, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => {
      unsubscribe();
    };
  }, [fade, float]);

  const heroTranslateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const imageTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  if (showLaunchLogo) {
    return (
      <View style={styles.launchScreen}>
        <Animated.View
          style={[
            styles.launchContent,
            {
              opacity: launchOpacity,
              transform: [{ scale: launchScale }],
            },
          ]}
        >
          <Image source={require('../assets/images/icon.png')} style={styles.launchLogo} />
          <Text style={styles.launchTitle}>MediCore AI</Text>
          <Text style={styles.launchSubtitle}>Santé augmentée par IA</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.backgroundGlowPrimary} />
      <View style={styles.backgroundGlowMedical} />
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.logo}>+</Text>
          <View>
            <Text style={styles.brand}>MediCore AI</Text>
            <Text style={styles.brandCaption}>Mobile</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.switchLanguage}
          onPress={() => setLanguage((current) => (current === 'fr' ? 'en' : 'fr'))}
          style={styles.languageButton}
        >
          <Text style={styles.languageActive}>{t.language}</Text>
          <Text style={styles.languageMuted}>{language === 'fr' ? 'EN' : 'FR'}</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: heroTranslateY }] }]}>
        <View style={styles.heroAccent}>
          <View style={styles.heroAccentPrimary} />
          <View style={styles.heroAccentMedical} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t.badge}</Text>
        </View>
        <Text style={styles.title}>
          {t.title}{'\n'}
          <Text style={styles.highlight}>{t.highlight}</Text>
        </Text>
        <Text style={styles.description}>{t.description}</Text>

        <View style={styles.actions}>
          <Link href={patientToken ? '/patient/home' : '/auth/patient-login'} asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{patientToken ? t.patientDashboard : t.patientPortal}</Text>
            </Pressable>
          </Link>
          <Link href="/auth/staff-login" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t.staffLogin}</Text>
            </Pressable>
          </Link>
        </View>

        <Link href="/patient/doctors" asChild>
          <Pressable style={styles.findButton}>
            <Text style={styles.findButtonText}>{t.findDoctor}</Text>
          </Pressable>
        </Link>

        <Animated.View style={[styles.imageShell, { transform: [{ translateY: imageTranslateY }] }]}>
          <Image source={{ uri: HERO_IMAGE }} accessibilityLabel={t.imageAlt} style={styles.heroImage} />
          <View style={styles.imageOverlay} />
          <View style={styles.floatingBadge}>
            <Text style={styles.floatingBadgeValue}>24h</Text>
            <Text style={styles.floatingBadgeLabel}>{t.stats[2].label}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={styles.statsGrid}>
        {t.stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.trusted}>{t.trusted}</Text>

      <View style={styles.features}>
        {t.features.map((feature) => (
          <View key={feature.title} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  launchScreen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  launchContent: {
    alignItems: 'center',
  },
  launchLogo: {
    borderRadius: 34,
    height: 132,
    width: 132,
  },
  launchTitle: {
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 22,
  },
  launchSubtitle: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 34,
  },
  backgroundGlowPrimary: {
    backgroundColor: '#dbeafe',
    borderRadius: 160,
    height: 210,
    opacity: 0.55,
    position: 'absolute',
    right: -90,
    top: 96,
    width: 210,
  },
  backgroundGlowMedical: {
    backgroundColor: '#cffafe',
    borderRadius: 150,
    height: 190,
    left: -95,
    opacity: 0.45,
    position: 'absolute',
    top: 360,
    width: 190,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  logo: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    height: 46,
    lineHeight: 44,
    overflow: 'hidden',
    textAlign: 'center',
    width: 46,
  },
  brand: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  brandCaption: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  languageButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  languageMuted: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    paddingRight: 7,
  },
  hero: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 24,
    paddingTop: 32,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  imageShell: {
    borderRadius: 26,
    height: 190,
    marginTop: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  imageOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  floatingBadge: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    right: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  floatingBadgeValue: {
    color: '#2563eb',
    fontSize: 19,
    fontWeight: '900',
  },
  floatingBadgeLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  heroAccent: {
    flexDirection: 'row',
    height: 7,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroAccentPrimary: {
    backgroundColor: '#2563eb',
    flex: 1,
  },
  heroAccentMedical: {
    backgroundColor: '#06b6d4',
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 43,
  },
  highlight: {
    color: '#2563eb',
  },
  description: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  actions: {
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 18,
    minHeight: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 54,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '900',
  },
  findButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#bfdbfe',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  findButtonText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  trusted: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 24,
    textAlign: 'center',
  },
  features: {
    gap: 12,
  },
  featureCard: {
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  featureIcon: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    fontSize: 22,
    height: 46,
    lineHeight: 43,
    overflow: 'hidden',
    textAlign: 'center',
    width: 46,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  featureDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
