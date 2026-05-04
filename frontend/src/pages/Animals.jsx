import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const speciesOptions = ['dog', 'cat', 'nac', 'equine', 'bird', 'other'];

const speciesToValue = {
    dog: 'Chien',
    cat: 'Chat',
    nac: 'NAC',
    equine: 'Équidé',
    bird: 'Oiseau',
    other: 'Autre'
};

const getSpeciesIcon = (species = '') => {
    const normalized = String(species).toLowerCase();
    if (normalized.includes('chien') || normalized.includes('dog')) return '🐶';
    if (normalized.includes('chat') || normalized.includes('cat')) return '🐱';
    if (normalized.includes('cheval') || normalized.includes('équidé') || normalized.includes('equine')) return '🐴';
    if (normalized.includes('oiseau') || normalized.includes('bird')) return '🪽';
    return '🐾';
};

const Animals = () => {
    const { language, t } = useI18n();
    const [animals, setAnimals] = useState([]);
    const [patients, setPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('true');
    const [showModal, setShowModal] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);

    const locale = language === 'en' ? 'en-US' : 'fr-FR';

    const fetchAnimals = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get('/animals', {
                params: {
                    search,
                    species: speciesFilter === 'all' ? 'all' : speciesToValue[speciesFilter],
                    isActive: statusFilter
                }
            });
            setAnimals(response.data.data || []);
        } catch (err) {
            setError(t('staffAnimals.loadError'));
            console.error('Error fetching animals:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/patients', { params: { limit: 200, isActive: 'true' } });
            setPatients(response.data.data.patients || []);
        } catch (err) {
            console.error('Error fetching owner patients:', err);
        }
    };

    useEffect(() => {
        fetchAnimals();
    }, [search, speciesFilter, statusFilter]);

    useEffect(() => {
        fetchPatients();
    }, []);

    const stats = useMemo(() => {
        const active = animals.filter((animal) => animal.isActive).length;
        return {
            total: animals.length,
            active,
            inactive: animals.length - active,
            insured: animals.filter((animal) => animal.insuranceProvider).length
        };
    }, [animals]);

    const openCreate = () => {
        setEditingAnimal(null);
        setShowModal(true);
    };

    const openEdit = (animal) => {
        setEditingAnimal(animal);
        setShowModal(true);
    };

    const disableAnimal = async (animal) => {
        if (!window.confirm(t('staffAnimals.deleteConfirm', { name: animal.name }))) return;
        try {
            await api.delete(`/animals/${animal.id}`);
            fetchAnimals();
        } catch (err) {
            console.error('Error disabling animal:', err);
            setError(t('staffAnimals.deleteError'));
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                            {t('nav.animals')}
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                            {t('staffAnimals.title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            {t('staffAnimals.subtitle')}
                        </p>
                    </div>
                    <button onClick={openCreate} className="btn-primary inline-flex items-center justify-center gap-2">
                        <PlusIcon />
                        {t('staffAnimals.newAnimal')}
                    </button>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:grid-cols-4">
                    <StatCard label={t('staffAnimals.count', { count: stats.active })} value={stats.active} icon="🐾" />
                    <StatCard label={t('staffAnimals.active')} value={stats.active} icon="✅" />
                    <StatCard label={t('staffAnimals.inactive')} value={stats.inactive} icon="⏸" />
                    <StatCard label={t('staffAnimals.fields.insuranceProvider')} value={stats.insured} icon="🛡" />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
                    <div className="relative">
                        <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="input-field pl-12"
                            placeholder={t('staffAnimals.searchPlaceholder')}
                        />
                    </div>
                    <select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)} className="input-field">
                        <option value="all">{t('staffAnimals.allSpecies')}</option>
                        {speciesOptions.map((species) => (
                            <option key={species} value={species}>{t(`staffAnimals.species.${species}`)}</option>
                        ))}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-field">
                        <option value="all">{t('staffAnimals.allStatuses')}</option>
                        <option value="true">{t('staffAnimals.activeOnly')}</option>
                        <option value="false">{t('staffAnimals.inactiveOnly')}</option>
                    </select>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="spinner" />
                    </div>
                ) : animals.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t('staffAnimals.empty')}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {animals.map((animal) => (
                            <article key={animal.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800">
                                <div className="h-1 bg-gradient-to-r from-primary-500 via-violet-500 to-medical-500" />
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-4xl shadow-inner dark:bg-dark-900">
                                            {getSpeciesIcon(animal.species)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-lg font-extrabold text-slate-950 dark:text-white">{animal.name}</h3>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${animal.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300'}`}>
                                                    {animal.isActive ? t('staffAnimals.active') : t('staffAnimals.inactive')}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                {[animal.species, animal.breed, animal.color].filter(Boolean).join(' • ') || '-'}
                                            </p>
                                            <p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                                {animal.ownerName || t('staffAnimals.fields.noOwner')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                        <InfoTile label={t('staffAnimals.fields.weight')} value={animal.weight ? `${animal.weight} kg` : '-'} />
                                        <InfoTile label={t('staffAnimals.fields.birthDate')} value={formatDate(animal.dateOfBirth, locale)} />
                                        <InfoTile label={t('staffAnimals.fields.microchip')} value={animal.microchipNumber || '-'} />
                                        <InfoTile label={t('staffAnimals.fields.insuranceProvider')} value={animal.insuranceProvider || '-'} />
                                    </div>

                                    <div className="mt-5 flex gap-2">
                                        <button onClick={() => openEdit(animal)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-dark-600 dark:text-slate-200 dark:hover:bg-dark-700">
                                            {t('staffAnimals.actions.edit')}
                                        </button>
                                        {animal.isActive && (
                                            <button onClick={() => disableAnimal(animal)} className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">
                                                {t('staffAnimals.actions.disable')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {showModal && (
                <AnimalModal
                    animal={editingAnimal}
                    patients={patients}
                    t={t}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchAnimals();
                    }}
                />
            )}
        </div>
    );
};

const emptyAnimalForm = {
    patientId: '',
    name: '',
    species: speciesToValue.dog,
    breed: '',
    color: '',
    dateOfBirth: '',
    gender: 'unknown',
    weight: '',
    microchipNumber: '',
    tattooNumber: '',
    insuranceProvider: '',
    insuranceNumber: '',
    allergies: '',
    chronicConditions: '',
    notes: '',
    isActive: true
};

const AnimalModal = ({ animal, patients, t, onClose, onSuccess }) => {
    const [form, setForm] = useState(() => animal ? {
        patientId: animal.ownerId || '',
        name: animal.name || '',
        species: animal.species || speciesToValue.dog,
        breed: animal.breed || '',
        color: animal.color || '',
        dateOfBirth: animal.dateOfBirth ? String(animal.dateOfBirth).slice(0, 10) : '',
        gender: animal.gender || 'unknown',
        weight: animal.weight || '',
        microchipNumber: animal.microchipNumber || '',
        tattooNumber: animal.tattooNumber || '',
        insuranceProvider: animal.insuranceProvider || '',
        insuranceNumber: animal.insuranceNumber || '',
        allergies: (animal.allergies || []).join(', '),
        chronicConditions: (animal.chronicConditions || []).join(', '),
        notes: animal.notes || '',
        isActive: animal.isActive
    } : emptyAnimalForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                weight: form.weight === '' ? null : Number(form.weight),
                allergies: form.allergies,
                chronicConditions: form.chronicConditions
            };
            if (animal) {
                await api.put(`/animals/${animal.id}`, payload);
            } else {
                await api.post('/animals', payload);
            }
            onSuccess();
        } catch (err) {
            console.error('Error saving animal:', err);
            setError(err.response?.data?.message || t('staffAnimals.saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay items-start overflow-y-auto py-6" onClick={onClose}>
            <div className="modal-content max-w-4xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-primary-700 to-medical-600 px-6 py-5 text-white">
                    <div>
                        <h2 className="text-xl font-extrabold">
                            {animal ? t('staffAnimals.modal.editTitle') : t('staffAnimals.modal.createTitle')}
                        </h2>
                        <p className="mt-1 text-sm text-white/75">{t('staffAnimals.modal.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t('staffAnimals.fields.owner')}>
                            <select value={form.patientId} onChange={(event) => setField('patientId', event.target.value)} className="input-field">
                                <option value="">{t('staffAnimals.fields.noOwner')}</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.fullName} {patient.email ? `- ${patient.email}` : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t('staffAnimals.fields.name')}>
                            <input value={form.name} onChange={(event) => setField('name', event.target.value)} className="input-field" required />
                        </Field>
                        <Field label={t('staffAnimals.fields.species')}>
                            <select value={form.species} onChange={(event) => setField('species', event.target.value)} className="input-field" required>
                                {speciesOptions.map((species) => (
                                    <option key={species} value={speciesToValue[species]}>{t(`staffAnimals.species.${species}`)}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t('staffAnimals.fields.breed')}>
                            <input value={form.breed} onChange={(event) => setField('breed', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.color')}>
                            <input value={form.color} onChange={(event) => setField('color', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.gender')}>
                            <select value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="input-field">
                                <option value="male">{t('staffAnimals.gender.male')}</option>
                                <option value="female">{t('staffAnimals.gender.female')}</option>
                                <option value="unknown">{t('staffAnimals.gender.unknown')}</option>
                            </select>
                        </Field>
                        <Field label={t('staffAnimals.fields.birthDate')}>
                            <input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.weight')}>
                            <input type="number" min="0" step="0.01" value={form.weight} onChange={(event) => setField('weight', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.microchip')}>
                            <input value={form.microchipNumber} onChange={(event) => setField('microchipNumber', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.tattoo')}>
                            <input value={form.tattooNumber} onChange={(event) => setField('tattooNumber', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.insuranceProvider')}>
                            <input value={form.insuranceProvider} onChange={(event) => setField('insuranceProvider', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.insuranceNumber')}>
                            <input value={form.insuranceNumber} onChange={(event) => setField('insuranceNumber', event.target.value)} className="input-field" />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t('staffAnimals.fields.allergies')}>
                            <input value={form.allergies} onChange={(event) => setField('allergies', event.target.value)} className="input-field" />
                        </Field>
                        <Field label={t('staffAnimals.fields.chronicConditions')}>
                            <input value={form.chronicConditions} onChange={(event) => setField('chronicConditions', event.target.value)} className="input-field" />
                        </Field>
                    </div>

                    <Field label={t('staffAnimals.fields.notes')}>
                        <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} className="input-field" rows={3} />
                    </Field>

                    {animal && (
                        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-dark-900/40">
                            <input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{t('staffAnimals.active')}</span>
                        </label>
                    )}

                    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">{t('staffAnimals.actions.cancel')}</button>
                        <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                            {saving ? t('staffAnimals.actions.saving') : animal ? t('staffAnimals.actions.update') : t('staffAnimals.actions.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <span className="text-2xl">{icon}</span>
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
);

const InfoTile = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-dark-900/40">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
);

const Field = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {children}
    </label>
);

const formatDate = (value, locale) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(locale);
};

const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
);

export default Animals;
