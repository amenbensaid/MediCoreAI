import { useState } from 'react';

const DentalModule = () => {
    const [selectedTooth, setSelectedTooth] = useState(null);

    // Mock data for teeth
    const upperTeeth = Array.from({ length: 16 }, (_, i) => ({ id: 18 - i, state: i % 5 === 0 ? 'cavity' : 'healthy' }));
    const lowerTeeth = Array.from({ length: 16 }, (_, i) => ({ id: 48 - i, state: i % 7 === 0 ? 'missing' : 'healthy' }));

    const getToothColor = (state) => {
        switch (state) {
            case 'cavity': return 'fill-red-500 hover:fill-red-600 transition-colors cursor-pointer';
            case 'missing': return 'fill-gray-300 dark:fill-gray-700 transition-colors cursor-pointer';
            case 'treatment': return 'fill-blue-500 hover:fill-blue-600 transition-colors cursor-pointer';
            default: return 'fill-white dark:fill-dark-700 stroke-gray-300 dark:stroke-gray-600 hover:fill-primary-100 dark:hover:fill-primary-900/30 transition-colors cursor-pointer';
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Dentaire</h1>
                    <p className="text-gray-500 dark:text-gray-400">Schéma dentaire interactif et IA de détection</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Scanner Radio</button>
                    <button className="btn-primary">Analyse IA</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Interactive Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-dark-700">
                    <h3 className="text-lg font-semibold mb-8 text-center text-gray-900 dark:text-white">Denture Permanente</h3>

                    <div className="space-y-12">
                        {/* Upper Jaw */}
                        <div className="flex justify-center gap-2">
                            {upperTeeth.map(tooth => (
                                <div key={tooth.id} className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">{tooth.id}</span>
                                    <svg
                                        width="32" height="42" viewBox="0 0 32 42"
                                        onClick={() => setSelectedTooth(tooth)}
                                        className={getToothColor(tooth.state)}
                                    >
                                        <path d="M16 2C10 2 6 6 4 12C2 18 2 24 4 30C6 36 10 40 16 40C22 40 26 36 28 30C30 24 30 18 28 12C26 6 22 2 16 2Z" strokeWidth="2" />
                                        <path d="M8 12C8 10 12 8 16 8C20 8 24 10 24 12" fill="none" strokeWidth="1" strokeOpacity="0.3" />
                                    </svg>
                                </div>
                            ))}
                        </div>

                        {/* Lower Jaw */}
                        <div className="flex justify-center gap-2">
                            {lowerTeeth.map(tooth => (
                                <div key={tooth.id} className="flex flex-col items-center gap-2">
                                    <svg
                                        width="32" height="42" viewBox="0 0 32 42"
                                        onClick={() => setSelectedTooth(tooth)}
                                        className={getToothColor(tooth.state)}
                                    >
                                        <path d="M16 40C22 40 26 36 28 30C30 24 30 18 28 12C26 6 22 2 16 2C10 2 6 6 4 12C2 18 2 24 4 30C6 36 10 40 16 40Z" strokeWidth="2" />
                                        <path d="M8 30C8 32 12 34 16 34C20 34 24 32 24 30" fill="none" strokeWidth="1" strokeOpacity="0.3" />
                                    </svg>
                                    <span className="text-xs text-gray-400">{tooth.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 flex justify-center gap-6">
                        <LegendItem color="bg-white border-gray-300" label="Sain" />
                        <LegendItem color="bg-red-500" label="Carie" />
                        <LegendItem color="bg-blue-500" label="Soigné" />
                        <LegendItem color="bg-gray-300" label="Manquant" />
                    </div>
                </div>

                {/* AI & Procedures Panel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                            Assistant IA
                        </h3>
                        {selectedTooth ? (
                            <div className="space-y-4 animate-slide-up">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dent {selectedTooth.id}</p>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                                    ⚠️ Carie détectée sur la face occlusale (Probabilité 94%)
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500 mb-2 uppercase font-semibold">Traitements suggérés</p>
                                    <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 text-sm border border-gray-100 dark:border-dark-700">Composite 3 faces</button>
                                    <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 text-sm border border-gray-100 dark:border-dark-700">Inlay-Onlay</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-8">Sélectionnez une dent pour l'analyse</p>
                        )}
                    </div>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Historique Actes</h3>
                        <div className="space-y-3">
                            <HistoryItem date="12 Jan 2024" type="Détartrage" dr="Dr. Martin" />
                            <HistoryItem date="05 Nov 2023" type="Extraction (18)" dr="Dr. Martin" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LegendItem = ({ color, label }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full border ${color}`} />
        <span className="text-xs text-gray-500 transition-colors cursor-pointer">{label}</span>
    </div>
);

const HistoryItem = ({ date, type, dr }) => (
    <div className="p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
        <p className="text-xs text-gray-500">{date}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-white">{type}</p>
        <p className="text-xs text-primary-500">{dr}</p>
    </div>
);

export default DentalModule;
