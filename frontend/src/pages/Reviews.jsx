import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const ratingOptions = ['5', '4', '3', '2', '1'];

const Reviews = () => {
    const { language, t } = useI18n();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratingFilter, setRatingFilter] = useState('all');
    const [search, setSearch] = useState('');

    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await api.get('/reviews');
                setReviews(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    const filteredReviews = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return reviews.filter((review) => {
            const matchesRating = ratingFilter === 'all' || String(review.rating) === ratingFilter;
            const haystack = [
                review.patient?.fullName,
                review.practitioner?.fullName,
                review.practitioner?.specialty,
                review.reviewText,
                review.appointment?.type
            ].join(' ').toLowerCase();
            return matchesRating && haystack.includes(normalizedSearch);
        });
    }, [reviews, ratingFilter, search]);

    const summary = useMemo(() => {
        const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
        const distribution = ratingOptions.reduce((acc, rating) => {
            acc[rating] = reviews.filter((review) => String(review.rating) === rating).length;
            return acc;
        }, {});

        return {
            count: reviews.length,
            average: reviews.length ? Number((total / reviews.length).toFixed(1)) : 0,
            fiveStars: distribution['5'] || 0,
            distribution
        };
    }, [reviews]);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_420px] lg:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                            {t('nav.reviews')}
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                            {t('staffReviews.title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {t('staffReviews.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <MetricCard label={t('staffReviews.metrics.reviews')} value={summary.count} />
                        <MetricCard label={t('staffReviews.metrics.average')} value={summary.count > 0 ? `${summary.average}/5` : 'N/A'} highlight />
                        <MetricCard label={t('staffReviews.metrics.fiveStars')} value={summary.fiveStars} />
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <div className="relative">
                            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="input-field pl-12"
                                placeholder={t('staffReviews.searchPlaceholder')}
                            />
                        </div>
                        <select
                            value={ratingFilter}
                            onChange={(event) => setRatingFilter(event.target.value)}
                            className="input-field"
                        >
                            <option value="all">{t('staffReviews.allRatings')}</option>
                            {ratingOptions.map((rating) => (
                                <option key={rating} value={rating}>
                                    {t('staffReviews.ratingOption', { count: rating })}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    <h2 className="font-bold text-slate-950 dark:text-white">{t('staffReviews.distributionTitle')}</h2>
                    <div className="mt-5 space-y-4">
                        {ratingOptions.map((rating) => (
                            <DistributionRow
                                key={rating}
                                rating={Number(rating)}
                                count={summary.distribution[rating] || 0}
                                total={summary.count}
                            />
                        ))}
                    </div>
                </aside>

                <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-dark-700 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-950 dark:text-white">{t('staffReviews.listTitle')}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('staffReviews.listSubtitle', { count: filteredReviews.length })}
                            </p>
                        </div>
                    </div>

                    {filteredReviews.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-dark-700">
                            {filteredReviews.map((review) => (
                                <ReviewCard key={review.id} review={review} locale={locale} t={t} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl dark:bg-dark-700">
                                ☆
                            </div>
                            <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">
                                {t('staffReviews.empty')}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, highlight = false }) => (
    <div className={`rounded-2xl border px-4 py-4 text-center shadow-sm ${
        highlight
            ? 'border-primary-100 bg-primary-50 text-primary-700 dark:border-primary-900/30 dark:bg-primary-900/20 dark:text-primary-200'
            : 'border-slate-100 bg-white text-slate-900 dark:border-dark-700 dark:bg-dark-800 dark:text-white'
    }`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
);

const DistributionRow = ({ rating, count, total }) => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <StarRating rating={rating} compact />
                    <span>{rating}/5</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-dark-700">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-medical-500" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
};

const ReviewCard = ({ review, locale, t }) => (
    <article className="p-5 transition hover:bg-slate-50/70 dark:hover:bg-dark-700/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-medical-500 text-sm font-bold text-white shadow-md">
                        {getInitials(review.patient?.fullName)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-950 dark:text-white">{review.patient?.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('staffReviews.patient')}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {t('staffReviews.verified')}
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <StarRating rating={review.rating} />
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">
                        {review.rating}/5
                    </span>
                </div>
            </div>

            <div className="text-sm text-slate-500 dark:text-slate-400 lg:text-right">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{review.practitioner?.fullName}</p>
                {review.practitioner?.specialty && <p>{review.practitioner.specialty}</p>}
                <p className="mt-2">{new Date(review.createdAt).toLocaleDateString(locale)}</p>
            </div>
        </div>

        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:bg-dark-700 dark:text-slate-300">
            {review.reviewText || t('staffReviews.noComment')}
        </p>

        {review.appointment && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-100 dark:bg-dark-800 dark:ring-dark-700">
                    {review.appointment.type || t('staffReviews.appointmentFallback')}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-100 dark:bg-dark-800 dark:ring-dark-700">
                    {new Date(review.appointment.startTime).toLocaleDateString(locale)}
                </span>
            </div>
        )}
    </article>
);

const StarRating = ({ rating, compact = false }) => (
    <div className={`flex items-center ${compact ? 'gap-0.5 text-xs' : 'gap-1 text-lg'}`} aria-label={`${rating}/5`}>
        {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={star <= rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}>
                ★
            </span>
        ))}
    </div>
);

const getInitials = (name = '') => (
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'P'
);

export default Reviews;
