import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePatientTheme } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

type Action = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

type PlaceholderScreenProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: Action[];
};

export default function PlaceholderScreen({
  eyebrow = 'MediCore AI',
  title,
  description,
  children,
  actions = [],
}: PlaceholderScreenProps) {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>+</Text>
        <View>
          <Text style={[styles.brand, { color: colors.text }]}>MediCore AI</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{eyebrow}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.muted }]}>{description}</Text> : null}
        {children}
        {actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map((action) => (
              <Link key={action.href} href={action.href as never} asChild>
                <Pressable style={[styles.button, action.variant === 'secondary' && styles.secondaryButton]}>
                  <Text style={[styles.buttonText, action.variant === 'secondary' && styles.secondaryButtonText]}>
                    {action.label}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fc',
    padding: 20,
    paddingTop: 72,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#6d28d9',
    color: '#fff',
    fontSize: 30,
    lineHeight: 42,
    textAlign: 'center',
    fontWeight: '700',
  },
  brand: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  caption: {
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 22,
    gap: 12,
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: '#eef2ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#4338ca',
  },
});
