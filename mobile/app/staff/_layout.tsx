import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import StaffHeader from '../../components/StaffHeader';
import { usePatientTheme } from '../../src/stores/patientUiStore';
import { mobileTheme } from '../../src/theme/mobileTheme';

export default function StaffLayout() {
  const theme = usePatientTheme();
  const colors = mobileTheme[theme];

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <StaffHeader />
      </View>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="calendar-day" />
          <Stack.Screen name="appointments" />
          <Stack.Screen name="waitlist" />
          <Stack.Screen name="invoices" />
          <Stack.Screen name="patients" />
          <Stack.Screen name="patient/[id]" />
          <Stack.Screen name="animals" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="teleconsultations" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#f8fafc', flex: 1 },
  header: {
    backgroundColor: '#f8fafc',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  content: { flex: 1 },
});
