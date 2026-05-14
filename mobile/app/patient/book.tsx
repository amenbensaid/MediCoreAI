import PlaceholderScreen from '@/components/PlaceholderScreen';

export default function PatientBookScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Réservation"
      title="Prendre rendez-vous"
      description="Sélection du médecin, date, mode et créneau. À connecter avec /public/available-slots et /public/book-appointment."
      actions={[
        { label: 'Voir file d’attente', href: '/patient/waitlist' },
        { label: 'Accueil patient', href: '/patient/home', variant: 'secondary' },
      ]}
    />
  );
}
