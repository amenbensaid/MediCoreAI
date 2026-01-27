import { useState } from 'react';

const AestheticModule = () => {
    const [activeStep, setActiveStep] = useState(1);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clinique Esthétique</h1>
                    <p className="text-gray-500 dark:text-gray-400">Comparatifs Avant/Après et cartographie faciale</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Importer Photos</button>
                    <button className="btn-primary">+ Nouvelle Intervention</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Facial Morphing / Before-After Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-dark-700">
                        <div className="p-4 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center bg-gray-50 dark:bg-dark-900/50">
                            <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Comparateur Visuel</span>
                            <div className="flex bg-white dark:bg-dark-800 rounded-lg p-1 border dark:border-dark-600">
                                <button className="px-3 py-1 text-xs font-medium bg-primary-500 text-white rounded-md">Side-by-Side</button>
                                <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-md transition-colors cursor-pointer">Slider</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-dark-700">
                            <div className="relative aspect-[4/5] bg-gray-100 dark:bg-dark-900 group">
                                <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest">Avant</div>
                                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover grayscale-[0.2]" alt="Before" />
                            </div>
                            <div className="relative aspect-[4/5] bg-gray-100 dark:bg-dark-900 group">
                                <div className="absolute top-4 left-4 z-10 bg-primary-500 px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest">Après (Simulé IA)</div>
                                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover brightness-105 contrast-105" alt="After" />
                                <div className="absolute inset-0 bg-primary-500/10 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-dark-700">
                        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white font-medium">Points d'Injection</h3>
                        <div className="relative aspect-square max-w-[400px] mx-auto bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center border-4 border-dashed border-gray-200 dark:border-dark-700">
                            <span className="text-gray-400 text-sm">Schéma facial interactif</span>
                            {/* Injection Markers */}
                            <div className="absolute top-[20%] left-[40%] w-4 h-4 bg-primary-500 rounded-full shadow-glow animate-pulse ring-4 ring-primary-500/20" />
                            <div className="absolute top-[20%] right-[40%] w-4 h-4 bg-primary-500 rounded-full shadow-glow animate-pulse ring-4 ring-primary-500/20" />
                            <div className="absolute top-[45%] left-[25%] w-4 h-4 bg-medical-500 rounded-full shadow-glow-teal animate-pulse ring-4 ring-medical-500/20" />
                            <div className="absolute top-[45%] right-[25%] w-4 h-4 bg-medical-500 rounded-full shadow-glow-teal animate-pulse ring-4 ring-medical-500/20" />
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Stock Injectables</h3>
                        <div className="space-y-4">
                            <StockItem name="Botox Cosmetic" brand="Allergan" stock={14} min={5} />
                            <StockItem name="Juvéderm Ultra XC" brand="Allergan" stock={3} min={5} alert />
                            <StockItem name="Restylane" brand="Galderma" stock={8} min={4} />
                        </div>
                        <button className="w-full btn-secondary mt-6 py-2 text-sm">Gérer l'inventaire</button>
                    </div>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Protocoles Populaires</h3>
                        <div className="space-y-2">
                            <ProtocolItem title="Rajeunissement Front" duration="45 min" price="350 €" />
                            <ProtocolItem title="Augmentation Lèvres" duration="30 min" price="280 €" />
                            <ProtocolItem title="Mésothérapie Visage" duration="60 min" price="150 €" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StockItem = ({ name, brand, stock, min, alert }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-transparent hover:border-gray-200 transition-colors">
        <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{name}</p>
            <p className="text-[10px] text-gray-500 uppercase">{brand}</p>
        </div>
        <div className="text-right">
            <p className={`text-sm font-bold ${alert ? 'text-red-500' : 'text-primary-500'}`}>{stock} u.</p>
            <p className="text-[10px] text-gray-400">min: {min}</p>
        </div>
    </div>
);

const ProtocolItem = ({ title, duration, price }) => (
    <div className="p-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-dark-600">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>{duration}</span>
            <span className="font-bold text-medical-600">{price}</span>
        </div>
    </div>
);

export default AestheticModule;
