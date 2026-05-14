import PlaceholderScreen from '@/components/PlaceholderScreen';
import { usePatientLanguage } from '@/src/stores/patientUiStore';

const copy = {
  fr: {
    eyebrow: 'Vétérinaire',
    title: 'Animaux',
    description: 'Gestion des animaux liés aux patients. À connecter avec GET /animals.',
    dashboard: 'Dashboard',
  },
  en: {
    eyebrow: 'Veterinary',
    title: 'Animals',
    description: 'Manage animals linked to patient records. Connect with GET /animals.',
    dashboard: 'Dashboard',
  },
};

export default function StaffAnimalsScreen() {
  const language = usePatientLanguage();
  const t = copy[language];

  return (
    <PlaceholderScreen
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
      actions={[{ label: t.dashboard, href: '/staff/dashboard' }]}
    />
  );
}
