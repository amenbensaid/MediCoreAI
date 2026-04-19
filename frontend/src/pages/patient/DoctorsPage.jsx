import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const DoctorsPage = () => {
    const [practitioners, setPractitioners] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const isLoggedIn = !!localStorage.getItem('patient-token');

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

    const filtered = practitioners.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.specialty.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">MediCore AI</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        {isLoggedIn ? (
                            <Link to="/patient/portal" className="btn-primary !py-2 !px-4 text-sm">My Portal</Link>
                        ) : (
                            <>
                                <Link to="/patient/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium">Sign In</Link>
                                <Link to="/patient/register" className="btn-primary !py-2 !px-4 text-sm">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="bg-gradient-to-r from-primary-500 to-medical-500 py-12 sm:py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Find Your Doctor</h1>
                    <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                        Browse our network of qualified healthcare professionals and book your appointment online
                    </p>
                    <div className="max-w-xl mx-auto relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Search by name or specialty..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 text-gray-900 placeholder-gray-500 shadow-xl focus:ring-4 focus:ring-white/30 border-0 text-lg" />
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Specialty Filter */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    <button onClick={() => setSelectedSpecialty('all')}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            selectedSpecialty === 'all'
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-primary-300'
                        }`}>
                        All Specialties
                    </button>
                    {specialties.map(s => (
                        <button key={s} onClick={() => setSelectedSpecialty(s)}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                selectedSpecialty === s
                                    ? 'bg-primary-500 text-white shadow-lg'
                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-primary-300'
                            }`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Results count */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found
                </p>

                {/* Doctors Grid */}
                {loading ? (
                    <div className="flex justify-center py-20"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No doctors found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map(dr => (
                            <div key={dr.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-medical-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {dr.firstName?.[0]}{dr.lastName?.[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{dr.name}</h3>
                                        <p className="text-primary-500 font-medium text-sm">{dr.specialty}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {dr.acceptsOnline && (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                    Online
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">In-person</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{dr.bio}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
                                    <div>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">€{dr.consultationFee}</span>
                                        <span className="text-xs text-gray-400 ml-1">/visit</span>
                                    </div>
                                    {isLoggedIn ? (
                                        <Link to={`/patient/book?doctor=${dr.id}`}
                                            className="btn-primary !py-2 !px-5 text-sm">
                                            Book Now
                                        </Link>
                                    ) : (
                                        <Link to="/patient/login"
                                            className="btn-secondary !py-2 !px-5 text-sm">
                                            Sign In to Book
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DoctorsPage;
