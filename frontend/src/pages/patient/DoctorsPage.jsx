import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PublicNavbar from '../../components/PublicNavbar';
import Container from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../stores/languageStore';
import { getAssetUrl } from '../../utils/assets';

const DoctorsPage = () => {
    const { t } = useI18n();
    const [practitioners, setPractitioners] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchSpecialties();
        fetchPractitioners();
    }, []);

    useEffect(() => {
        fetchPractitioners();
    }, [selectedSpecialty]);

    const fetchSpecialties = async () => {
        try {
            const res = await api.get('/public/specialties');
            setSpecialties(res.data.data);
        } catch (err) { console.error(err); }
    };

    const fetchPractitioners = async () => {
        setLoading(true);
        try {
            const res = await api.get('/public/practitioners', {
                params: selectedSpecialty !== 'all' ? { specialty: selectedSpecialty } : {}
            });
            setPractitioners(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const normalizeSpecialty = (specialty) => (
        specialty === 'General Practice' ? t('doctors.defaultSpecialty') : specialty
    );

    const normalizeBio = (bio) => (
        !bio || bio === 'Experienced healthcare professional dedicated to patient care.'
            ? t('doctors.defaultBio')
            : bio
    );

    const getResultCountLabel = (count) => t(
        count === 1 ? 'doctors.resultCount' : 'doctors.resultCountPlural',
        { count }
    );

    const getReviewCountLabel = (count) => t(
        count === 1 ? 'doctors.reviewCount' : 'doctors.reviewCountPlural',
        { count }
    );

    const filtered = practitioners.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        normalizeSpecialty(p.specialty || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.specialty || '').toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (dr) => `${dr?.firstName?.[0] || ''}${dr?.lastName?.[0] || ''}`.trim() || 'DR';
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <PublicNavbar />

            <main className="fade-in-soft">
                <section className="py-10 sm:py-12">
                    <Container>
                        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                                    {t('doctors.title')}
                                </h1>
                                <p className="text-slate-500">
                                    {t('doctors.subtitle')}
                                </p>
                            </div>

                            <div className="w-full max-w-xl">
                                <div className="relative">
                                    <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder={t('doctors.searchPlaceholder')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                            <button
                                onClick={() => setSelectedSpecialty('all')}
                                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                    selectedSpecialty === 'all'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                }`}
                            >
                                {t('doctors.allSpecialties')}
                            </button>
                            {specialties.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSpecialty(s)}
                                    className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                        selectedSpecialty === s
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                    }`}
                                >
                                    {normalizeSpecialty(s)}
                                </button>
                            ))}
                        </div>

                        <p className="mt-6 text-sm text-slate-500">
                            {getResultCountLabel(filtered.length)}
                        </p>

                        {loading ? (
                            <div className="flex justify-center py-20"><div className="spinner" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="py-20 text-center">
                                <h3 className="text-lg font-semibold text-slate-900">{t('doctors.emptyTitle')}</h3>
                                <p className="mt-1 text-slate-500">{t('doctors.emptyDescription')}</p>
                            </div>
                        ) : (
                            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                                {filtered.map((dr) => {
                                    const rating = Number(dr.ratingAvg || 0);
                                    const reviews = Number(dr.reviewsCount || 0);
                                    return (
                                        <Link
                                            key={dr.id}
                                            to={`/doctors/${dr.id}`}
                                            className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                                        >
                                            <div className="relative h-44 bg-gradient-to-br from-blue-600 to-cyan-400">
                                                {dr.avatarUrl ? (
                                                    <img src={getAssetUrl(dr.avatarUrl)} alt={t('doctors.doctorAlt', { name: dr.name })} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white/95">
                                                        {getInitials(dr)}
                                                    </div>
                                                )}
                                                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-900 backdrop-blur">
                                                    <svg className="h-3.5 w-3.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.538 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.783.57-1.838-.197-1.538-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.098 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                                    </svg>
                                                    {reviews > 0 ? rating.toFixed(1) : t('doctors.notRated')}
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                <h3 className="text-lg font-extrabold text-slate-900 transition-colors group-hover:text-blue-600">
                                                    {dr.name}
                                                </h3>
                                                <p className="mt-0.5 text-sm font-semibold text-blue-600">{normalizeSpecialty(dr.specialty)}</p>
                                                <p className="mt-3 line-clamp-2 text-sm text-slate-500 italic">
                                                    “{normalizeBio(dr.bio)}”
                                                </p>

                                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                                    <div className="text-sm text-slate-500">
                                                        <span className="font-bold text-slate-900">€{dr.consultationFee}</span> / {t('doctors.visit')}
                                                        <div className="mt-1 text-xs text-slate-400">{getReviewCountLabel(reviews)}</div>
                                                    </div>
                                                    <Button
                                                        as="span"
                                                        variant="blue"
                                                        className="!px-5 !py-2 text-sm"
                                                    >
                                                        {t('doctors.viewProfile')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Container>
                </section>
            </main>
        </div>
    );
};

export default DoctorsPage;
