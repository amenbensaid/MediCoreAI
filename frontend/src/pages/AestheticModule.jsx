import { useEffect, useState } from 'react';
import api from '../services/api';

const AestheticModule = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('side-by-side');
    const [overview, setOverview] = useState({
        clinic: null,
        stats: { totalRecords: 0, recentRecords: 0, injectionPoints: 0 },
        latestRecord: null,
        stock: [],
        protocols: []
    });

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/aesthetic/overview');
            setOverview({
                clinic: response.data.data.clinic,
                stats: response.data.data.stats || { totalRecords: 0, recentRecords: 0, injectionPoints: 0 },
                latestRecord: response.data.data.latestRecord,
                stock: response.data.data.stock || [],
                protocols: response.data.data.protocols || []
            });
        } catch (err) {
            console.error('Failed to load aesthetic overview:', err);
            setError('Erreur lors du chargement du module esthétique');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    const latestRecord = overview.latestRecord;
    const beforeImage = latestRecord?.beforeImage;
    const afterImage = latestRecord?.afterImage;
    const hasCompareImages = Boolean(beforeImage || afterImage);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {overview.clinic?.name || 'Clinique Esthétique'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Données en direct pour les dossiers esthétiques, l’inventaire et les protocoles.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3 lg:w-auto">
                    <StatCard label="Dossiers" value={overview.stats.totalRecords} />
                    <StatCard label="30 jours" value={overview.stats.recentRecords} />
                    <StatCard label="Points IA" value={overview.stats.injectionPoints} />
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-dark-700 dark:bg-dark-800">
                        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/50 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Comparateur Visuel</span>
                                {latestRecord && (
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {latestRecord.procedureType} · {latestRecord.patientName}
                                    </p>
                                )}
                            </div>
                            <div className="flex rounded-lg border bg-white p-1 dark:border-dark-600 dark:bg-dark-800">
                                <button
                                    onClick={() => setViewMode('side-by-side')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'side-by-side' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Side-by-Side
                                </button>
                                <button
                                    onClick={() => setViewMode('slider')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'slider' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Slider
                                </button>
                            </div>
                        </div>

                        {hasCompareImages ? (
                            viewMode === 'side-by-side' ? (
                                <div className="grid grid-cols-1 gap-px bg-gray-200 dark:bg-dark-700 md:grid-cols-2">
                                    <ImagePanel label="Avant" image={beforeImage} muted />
                                    <ImagePanel label="Après" image={afterImage || beforeImage} accent />
                                </div>
                            ) : (
                                <div className="relative aspect-[16/10] bg-gray-100 dark:bg-dark-900">
                                    <img src={beforeImage || afterImage} alt="Avant" className="h-full w-full object-cover grayscale-[0.15]" />
                                    <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden border-l-4 border-white/80">
                                        <img src={afterImage || beforeImage} alt="Après" className="h-full w-full object-cover brightness-105 contrast-105" />
                                    </div>
                                    <div className="absolute left-4 top-4 rounded-lg bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                        Avant / Après
                                    </div>
                                </div>
                            )
                        ) : (
                            <EmptyPanel
                                title="Aucun comparatif disponible"
                                description="Ajoute des dossiers dans `aesthetic_records` avec images avant/après pour alimenter ce module."
                            />
                        )}
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Points d’Injection</h3>
                        <div className="relative mx-auto flex aspect-square max-w-[420px] items-center justify-center rounded-full border-4 border-dashed border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-900">
                            {latestRecord?.injectionPoints && Object.keys(latestRecord.injectionPoints).length > 0 ? (
                                Object.entries(latestRecord.injectionPoints).slice(0, 8).map(([key], index) => {
                                    const positions = [
                                        'top-[18%] left-[38%]',
                                        'top-[18%] right-[38%]',
                                        'top-[40%] left-[24%]',
                                        'top-[40%] right-[24%]',
                                        'top-[55%] left-[33%]',
                                        'top-[55%] right-[33%]',
                                        'top-[68%] left-[43%]',
                                        'top-[68%] right-[43%]'
                                    ];

                                    return (
                                        <div
                                            key={key}
                                            title={key}
                                            className={`absolute h-4 w-4 rounded-full bg-primary-500 ring-4 ring-primary-500/20 ${positions[index]}`}
                                        />
                                    );
                                })
                            ) : (
                                <span className="px-6 text-center text-sm text-gray-400">
                                    Aucun point d’injection enregistré pour le dernier dossier.
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Stock Injectables</h3>
                        <div className="space-y-4">
                            {overview.stock.length > 0 ? (
                                overview.stock.map((item) => (
                                    <StockItem
                                        key={item.id}
                                        name={item.name}
                                        brand={item.brand}
                                        stock={item.stock}
                                        min={item.minStock}
                                        alert={item.alert}
                                    />
                                ))
                            ) : (
                                <EmptyListMessage message="Aucun produit esthétique actif trouvé." />
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg dark:border-dark-700 dark:bg-dark-800">
                        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Protocoles Disponibles</h3>
                        <div className="space-y-2">
                            {overview.protocols.length > 0 ? (
                                overview.protocols.map((item) => (
                                    <ProtocolItem
                                        key={item.id}
                                        title={item.title}
                                        duration={`${item.duration} min`}
                                        price={`${item.price.toLocaleString('fr-FR')} €`}
                                    />
                                ))
                            ) : (
                                <EmptyListMessage message="Aucun protocole esthétique actif trouvé." />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value }) => (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm dark:border-dark-700 dark:bg-dark-800">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);

const ImagePanel = ({ label, image, muted = false, accent = false }) => (
    <div className="relative aspect-[4/5] bg-gray-100 dark:bg-dark-900">
        <div className={`absolute left-4 top-4 z-10 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${accent ? 'bg-primary-500' : 'bg-black/50'}`}>
            {label}
        </div>
        <img
            src={image}
            alt={label}
            className={`h-full w-full object-cover ${muted ? 'grayscale-[0.2]' : 'brightness-105 contrast-105'}`}
        />
        {accent && <div className="pointer-events-none absolute inset-0 bg-primary-500/10" />}
    </div>
);

const EmptyPanel = ({ title, description }) => (
    <div className="flex aspect-[16/10] items-center justify-center bg-gray-50 px-6 text-center dark:bg-dark-900">
        <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
    </div>
);

const EmptyListMessage = ({ message }) => (
    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
        {message}
    </div>
);

const StockItem = ({ name, brand, stock, min, alert }) => (
    <div className="flex items-center justify-between rounded-xl border border-transparent bg-gray-50 p-3 transition-colors hover:border-gray-200 dark:bg-dark-700">
        <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{name}</p>
            <p className="text-[10px] uppercase text-gray-500">{brand}</p>
        </div>
        <div className="text-right">
            <p className={`text-sm font-bold ${alert ? 'text-red-500' : 'text-primary-500'}`}>{stock} u.</p>
            <p className="text-[10px] text-gray-400">min: {min}</p>
        </div>
    </div>
);

const ProtocolItem = ({ title, duration, price }) => (
    <div className="cursor-pointer rounded-lg border border-transparent p-3 transition-colors hover:border-gray-100 hover:bg-gray-50 dark:hover:border-dark-600 dark:hover:bg-dark-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            <span>{duration}</span>
            <span className="font-bold text-medical-600">{price}</span>
        </div>
    </div>
);

export default AestheticModule;
