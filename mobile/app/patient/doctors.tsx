import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import en from '@/src/i18n/en';
import fr from '@/src/i18n/fr';
import { patientApi } from '@/src/api/patient';
import { usePatientLanguage } from '@/src/stores/patientUiStore';
import type { Practitioner } from '@/src/types/doctor';
import { getFileUrl } from '@/src/utils/getFileUrl';

const normalizeSpecialty = (specialty: string | null | undefined, t: typeof fr.doctors) =>
  !specialty || specialty === 'General Practice' ? t.defaultSpecialty : specialty;

const normalizeBio = (bio: string | null | undefined, t: typeof fr.doctors) =>
  !bio || bio === 'Experienced healthcare professional dedicated to patient care.' ? t.defaultBio : bio;

const initials = (doctor: Practitioner) =>
  `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}`.trim() ||
  doctor.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ||
  'DR';

const interpolate = (template: string, count: number) => template.replace('{{count}}', String(count));

export default function PatientDoctorsScreen() {
  const language = usePatientLanguage();
  const t = language === 'fr' ? fr.doctors : en.doctors;
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'online' | 'rated'>('all');
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState<Practitioner[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    patientApi.getSpecialties()
      .then((response) => active && setSpecialties(response.data || []))
      .catch(() => active && setSpecialties([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    patientApi.getPractitioners(selectedSpecialty)
      .then((response) => {
        if (active) setDoctors(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load practitioners');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSpecialty]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const specialty = normalizeSpecialty(doctor.specialty, t).toLowerCase();
      const matchesSearch = !query || doctor.name.toLowerCase().includes(query) || specialty.includes(query);
      const matchesQuickFilter =
        quickFilter === 'all' ||
        (quickFilter === 'online' && doctor.acceptsOnline) ||
        (quickFilter === 'rated' && Number(doctor.ratingAvg || 0) >= 4);

      return matchesSearch && matchesQuickFilter;
    });
  }, [doctors, search, quickFilter, t]);

  const resetFilters = () => {
    setSelectedSpecialty('all');
    setQuickFilter('all');
    setSearch('');
  };

  const resultText = interpolate(filteredDoctors.length === 1 ? t.result : t.results, filteredDoctors.length);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t.badge}</Text>
        </View>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t.searchPlaceholder}
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>{t.filters.title}</Text>
          <Pressable onPress={resetFilters}>
            <Text style={styles.resetText}>{t.filters.reset}</Text>
          </Pressable>
        </View>

        <View style={styles.quickFilters}>
          {[
            { key: 'all', label: t.filters.all },
            { key: 'online', label: t.filters.online },
            { key: 'rated', label: t.filters.rated },
          ].map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => setQuickFilter(filter.key as typeof quickFilter)}
              style={[styles.quickChip, quickFilter === filter.key && styles.quickChipActive]}
            >
              <Text style={[styles.quickChipText, quickFilter === filter.key && styles.quickChipTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.specialtyLabel}>{t.filters.specialties}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            onPress={() => setSelectedSpecialty('all')}
            style={[styles.chip, selectedSpecialty === 'all' && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedSpecialty === 'all' && styles.chipTextActive]} numberOfLines={1}>
              {t.allSpecialties}
            </Text>
          </Pressable>
          {specialties.map((specialty) => (
            <Pressable
              key={specialty}
              onPress={() => setSelectedSpecialty(specialty)}
              style={[styles.chip, selectedSpecialty === specialty && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedSpecialty === specialty && styles.chipTextActive]} numberOfLines={1}>
                {normalizeSpecialty(specialty, t)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultCount}>{resultText}</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{error}</Text>
        </View>
      ) : filteredDoctors.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyDescription}>{t.emptyDescription}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} t={t} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function DoctorCard({ doctor, t }: { doctor: Practitioner; t: typeof fr.doctors }) {
  const avatarUrl = getFileUrl(doctor.avatarUrl);
  const rating = Number(doctor.ratingAvg || 0);
  const reviews = Number(doctor.reviewsCount || 0);
  const reviewText = interpolate(reviews === 1 ? t.review : t.reviews, reviews);

  return (
    <Link href={`/patient/doctor/${doctor.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.cardTop}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials(doctor)}</Text>
            </View>
          )}
          <View style={styles.cardMain}>
            <View style={styles.nameRow}>
              <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.ratingText}>{reviews > 0 ? rating.toFixed(1) : t.notRated}</Text>
              </View>
            </View>
            <Text style={styles.specialty}>{normalizeSpecialty(doctor.specialty, t)}</Text>
            <Text style={styles.bio} numberOfLines={2}>{normalizeBio(doctor.bio, t)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.fee}>€{doctor.consultationFee || 50} <Text style={styles.visit}>/ {t.visit}</Text></Text>
            <Text style={styles.reviews}>{reviewText}</Text>
          </View>
          <View style={styles.profileButton}>
            <Text style={styles.profileButtonText}>{t.viewProfile}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    padding: 20,
    paddingBottom: 34,
    paddingTop: 8,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backText: {
    color: '#4f46e5',
    fontSize: 30,
    lineHeight: 33,
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
    backgroundColor: '#6366f1',
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
  header: {
    marginTop: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
    marginTop: 14,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  searchIcon: {
    color: '#94a3b8',
    fontSize: 24,
    fontWeight: '800',
  },
  searchInput: {
    color: '#0f172a',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  filterCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  resetText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '900',
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickChip: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  quickChipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  quickChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
  },
  quickChipTextActive: {
    color: '#4f46e5',
  },
  specialtyLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 14,
  },
  chipScroller: {
    maxHeight: 52,
    marginTop: 8,
  },
  chips: {
    alignItems: 'center',
    gap: 9,
    paddingRight: 4,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    maxWidth: 190,
    paddingHorizontal: 15,
  },
  chipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  chipTextActive: {
    color: '#fff',
  },
  resultCount: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyDescription: {
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 26,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 13,
  },
  avatar: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    height: 86,
    width: 86,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    borderRadius: 20,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  cardMain: {
    flex: 1,
  },
  nameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  doctorName: {
    color: '#0f172a',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  ratingBadge: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  star: {
    color: '#f59e0b',
    fontSize: 12,
  },
  ratingText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '900',
  },
  specialty: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },
  bio: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 13,
  },
  fee: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  visit: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  reviews: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  profileButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
