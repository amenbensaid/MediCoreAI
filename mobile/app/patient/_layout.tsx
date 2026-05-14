import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import PatientHeader from '@/components/PatientHeader';
import { usePatientTheme } from '@/src/stores/patientUiStore';
import { mobileTheme } from '@/src/theme/mobileTheme';

export default function PatientLayout() {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <PatientHeader />
      </View>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="home" />
          <Stack.Screen name="doctors" />
          <Stack.Screen name="doctor/[id]" />
          <Stack.Screen name="book" />
          <Stack.Screen name="waitlist" />
          <Stack.Screen name="appointments" />
          <Stack.Screen name="appointment/[id]" />
          <Stack.Screen name="documents" />
          <Stack.Screen name="invoices" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#f8fafc', flex: 1 },
  header: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
  },
  content: { flex: 1 },
});
