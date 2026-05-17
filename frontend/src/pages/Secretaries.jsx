import { useEffect, useState } from 'react';
import api from '../services/api';

const defaultPermissions = {
    dashboard: true,
    patients: true,
    appointments: true,
    waitlist: true,
    calendar: true,
    teleconsultations: false,
    reviews: false,
    billing: false,
    analytics: false,
    settings: false
};

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    practitionerId: '',
    permissions: { ...defaultPermissions }
};

const Secretaries = () => {
    const [secretaries, setSecretaries] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingSecretary, setEditingSecretary] = useState(null);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState(null);

    const fetchDoctors = async () => {
        try {
            const response = await api.get('/users/practitioners/admin');
            setDoctors(response.data.data || []);
        } catch {
            // non-critical
        }
    };

    const fetchSecretaries = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get('/users/secretaries');
            setSecretaries(response.data.data || []);
        } catch (err) {
            console.error('Failed to load secretaries:', err);
            setError('Impossible de charger les secrétaires.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSecretaries();
        fetchDoctors();
    }, []);

    const openCreate = () => {
        setEditingSecretary(null);
        setShowModal(true);
    };

    const openEdit = (secretary) => {
        setEditingSecretary(secretary);
        setShowModal(true);
    };

    const deleteSecretary = async (secretary) => {
        if (!window.confirm(`Supprimer ${secretary.firstName} ${secretary.lastName} ?`)) return;
        try {
            await api.delete(`/users/secretaries/${secretary.id}`);
            setSuccessMsg('Secrétaire supprimé(e).');
            setTimeout(() => setSuccessMsg(null), 3000);
            fetchSecretaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la suppression.');
        }
    };

    const saveSecretary = async (form) => {
        try {
            setSaving(true);
            setError(null);
            if (editingSecretary) {
                await api.put(`/users/secretaries/${editingSecretary.id}`, form);
            } else {
                await api.post('/users/secretaries', form);
            }
            setShowModal(false);
            setSuccessMsg(editingSecretary ? 'Secrétaire mis(e) à jour.' : 'Secrétaire créé(e) avec succès.');
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchSecretaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    const clinicName = secretaries[0]?.clinicName || null;

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="flex items-start justify-between gap-4 p-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">Administration</p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">Secrétaires</h1>
                        {clinicName && (
                            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <BuildingIcon className="h-4 w-4" />
                                {clinicName}
                            </p>
                        )}
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Gérez les secrétaires de votre clinique et leurs permissions d'accès.
                        </p>
                    </div>
                    <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
                        <PlusIcon />
                        Nouvelle secrétaire
                    </button>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:grid-cols-3">
                    <StatCard label="Total" value={secretaries.length} accent="bg-primary-500" />
                    <StatCard label="Actives" value={secretaries.filter((s) => s.isActive).length} accent="bg-emerald-500" />
                    <StatCard label="Avec médecin assigné" value={secretaries.filter((s) => s.practitionerId).length} accent="bg-sky-500" />
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {successMsg}
                </div>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                {isLoading ? (
                    <div className="flex h-48 items-center justify-center"><div className="spinner" /></div>
                ) : secretaries.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-400">
                        <UserGroupIcon className="h-12 w-12 opacity-30" />
                        <p className="text-sm">Aucune secrétaire pour l'instant</p>
                        <button onClick={openCreate} className="btn-primary text-sm">Ajouter une secrétaire</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-dark-700">
                                    <th className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Nom</th>
                                    <th className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Email</th>
                                    <th className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Clinique</th>
                                    <th className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Médecin assigné</th>
                                    <th className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Statut</th>
                                    <th className="px-5 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
                                {secretaries.map((secretary) => (
                                    <tr key={secretary.id} className="hover:bg-slate-50 dark:hover:bg-dark-700/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-900 dark:text-white">{secretary.firstName} {secretary.lastName}</p>
                                            <p className="text-xs text-slate-500">{secretary.phone || ''}</p>
                                        </td>
                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{secretary.email}</td>
                                        <td className="px-5 py-4">
                                            {secretary.clinicName ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-700 dark:text-slate-300">
                                                    <BuildingIcon className="h-3 w-3" />
                                                    {secretary.clinicName}
                                                </span>
                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-5 py-4">
                                            {secretary.practitionerName ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                                    <DoctorIcon className="h-3 w-3" />
                                                    {secretary.practitionerName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Non assigné</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${secretary.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-400'}`}>
                                                {secretary.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => openEdit(secretary)} className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-dark-700 dark:text-slate-300">
                                                    Modifier
                                                </button>
                                                <button onClick={() => deleteSecretary(secretary)} className="rounded-xl border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {showModal && (
                <SecretaryModal
                    secretary={editingSecretary}
                    doctors={doctors}
                    saving={saving}
                    onClose={() => setShowModal(false)}
                    onSave={saveSecretary}
                />
            )}
        </div>
    );
};

const SecretaryModal = ({ secretary, doctors, saving, onClose, onSave }) => {
    const [form, setForm] = useState(() => secretary ? {
        firstName: secretary.firstName || '',
        lastName: secretary.lastName || '',
        email: secretary.email || '',
        password: '',
        phone: secretary.phone || '',
        isActive: secretary.isActive !== false,
        practitionerId: secretary.practitionerId || '',
        permissions: { ...defaultPermissions, ...(secretary.permissions || {}) }
    } : { ...emptyForm });

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const updatePermission = (key, value) => setForm((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, [key]: value }
    }));

    const submit = (event) => {
        event.preventDefault();
        const payload = { ...form };
        if (secretary) {
            delete payload.email;
            if (!payload.password) delete payload.password;
        }
        if (!payload.practitionerId) payload.practitionerId = null;
        onSave(payload);
    };

    const permissionLabels = {
        dashboard: 'Tableau de bord',
        patients: 'Patients',
        appointments: 'Rendez-vous',
        waitlist: "Liste d'attente",
        calendar: 'Calendrier',
        teleconsultations: 'Téléconsultations',
        reviews: 'Avis',
        billing: 'Facturation',
        analytics: 'Statistiques',
        settings: 'Paramètres'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-dark-700">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                            {secretary ? 'Modifier la secrétaire' : 'Nouvelle secrétaire'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Remplissez les informations et définissez les accès.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 text-xl leading-none">×</button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2">
                    <Field label="Prénom" value={form.firstName} onChange={(v) => update('firstName', v)} required />
                    <Field label="Nom" value={form.lastName} onChange={(v) => update('lastName', v)} required />
                    {!secretary && <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} required />}
                    <Field label="Mot de passe" type="password" value={form.password} onChange={(v) => update('password', v)} required={!secretary} placeholder={secretary ? 'Laisser vide pour ne pas changer' : ''} />
                    <Field label="Téléphone" value={form.phone} onChange={(v) => update('phone', v)} />

                    <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-1">
                        Médecin assigné
                        <select
                            value={form.practitionerId}
                            onChange={(e) => update('practitionerId', e.target.value)}
                            className="input-field mt-1.5"
                        >
                            <option value="">— Aucun médecin spécifique —</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    Dr. {d.firstName} {d.lastName}{d.specialty ? ` (${d.specialty})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    {secretary && (
                        <Toggle label="Compte actif" checked={form.isActive} onChange={(v) => update('isActive', v)} />
                    )}

                    <div className="md:col-span-2">
                        <p className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">Permissions d'accès</p>
                        <div className="grid gap-2 md:grid-cols-2">
                            {Object.entries(permissionLabels).map(([key, label]) => (
                                <Toggle
                                    key={key}
                                    label={label}
                                    checked={Boolean(form.permissions[key])}
                                    onChange={(v) => updatePermission(key, v)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-6 dark:border-dark-700">
                    <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
                    <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                        {saving ? 'Enregistrement...' : secretary ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const Field = ({ label, value, onChange, type = 'text', required = false, placeholder = '' }) => (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="input-field" />
    </label>
);

const Toggle = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:bg-dark-700 dark:text-slate-200 cursor-pointer">
        {label}
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary-600" />
    </label>
);

const StatCard = ({ label, value, accent }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
        <div className={`mb-3 h-2 w-12 rounded-full ${accent}`} />
        <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
);

const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
);

const UserGroupIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const BuildingIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const DoctorIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export default Secretaries;
