import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    avatarUrl: '',
    consultationFee: 50,
    paymentPolicy: 'full-onsite',
    bio: '',
    calendar: {
        defaultDurationMinutes: 30,
        slotStepMinutes: 30,
        minNoticeHours: 2,
        maxBookingDays: 30,
        allowPatientModeChoice: true
    },
    acceptsOnline: true,
    isActive: true
};

const statusClasses = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    inactive: 'bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-slate-300'
};

const AdminDoctors = () => {
    const { language, t } = useI18n();
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [overview, setOverview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOverviewLoading, setIsOverviewLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('patients');
    const [showModal, setShowModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [saving, setSaving] = useState(false);

    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });

    const fetchDoctors = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get('/users/practitioners/admin', { params: { search, status } });
            const nextDoctors = response.data.data || [];
            setDoctors(nextDoctors);
            setSelectedDoctorId((current) => current && nextDoctors.some((doctor) => doctor.id === current)
                ? current
                : nextDoctors[0]?.id || null);
        } catch (err) {
            console.error('Failed to load doctors:', err);
            setError(t('staffDoctors.loadingError'));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOverview = async (doctorId) => {
        if (!doctorId) {
            setOverview(null);
            return;
        }

        try {
            setIsOverviewLoading(true);
            const response = await api.get(`/users/practitioners/${doctorId}/admin-overview`);
            setOverview(response.data.data);
        } catch (err) {
            console.error('Failed to load doctor overview:', err);
            setError(t('staffDoctors.overviewError'));
        } finally {
            setIsOverviewLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(fetchDoctors, 250);
        return () => window.clearTimeout(timer);
    }, [search, status]);

    useEffect(() => {
        fetchOverview(selectedDoctorId);
    }, [selectedDoctorId]);

    const stats = useMemo(() => doctors.reduce((acc, doctor) => ({
        doctors: acc.doctors + 1,
        active: acc.active + (doctor.isActive ? 1 : 0),
        patients: acc.patients + (doctor.metrics?.patients || 0),
        revenue: acc.revenue + (doctor.metrics?.revenue || 0)
    }), { doctors: 0, active: 0, patients: 0, revenue: 0 }), [doctors]);

    const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId) || overview?.practitioner || null;

    const openCreate = () => {
        setEditingDoctor(null);
        setShowModal(true);
    };

    const openEdit = (doctor) => {
        setEditingDoctor(doctor);
        setShowModal(true);
    };

    const deactivateDoctor = async (doctor) => {
        if (!window.confirm(t('staffDoctors.deactivateConfirm', { name: doctor.fullName }))) return;

        try {
            await api.delete(`/users/practitioners/${doctor.id}`);
            await fetchDoctors();
        } catch (err) {
            console.error('Failed to deactivate doctor:', err);
            setError(t('staffDoctors.deactivateError'));
        }
    };

    const saveDoctor = async (form) => {
        try {
            setSaving(true);
            if (editingDoctor) {
                await api.put(`/users/practitioners/${editingDoctor.id}`, form);
            } else {
                await api.post('/users/practitioners', form);
            }
            setShowModal(false);
            await fetchDoctors();
        } catch (err) {
            console.error('Failed to save doctor:', err);
            setError(err.response?.data?.message || t('staffDoctors.saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">{t('nav.adminDoctors')}</p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{t('staffDoctors.title')}</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('staffDoctors.subtitle')}</p>
                    </div>
                    <button onClick={openCreate} className="btn-primary inline-flex items-center justify-center gap-2">
                        <PlusIcon />
                        {t('staffDoctors.newDoctor')}
                    </button>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30 md:grid-cols-4">
                    <StatCard label={t('staffDoctors.stats.doctors')} value={stats.doctors} accent="bg-primary-500" />
                    <StatCard label={t('staffDoctors.stats.active')} value={stats.active} accent="bg-emerald-500" />
                    <StatCard label={t('staffDoctors.stats.patients')} value={stats.patients} accent="bg-sky-500" />
                    <StatCard label={t('staffDoctors.stats.revenue')} value={money.format(stats.revenue)} accent="bg-orange-500" />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="input-field pl-12"
                            placeholder={t('staffDoctors.searchPlaceholder')}
                        />
                    </div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
                        <option value="all">{t('staffDoctors.allStatuses')}</option>
                        <option value="active">{t('staffDoctors.activeOnly')}</option>
                        <option value="inactive">{t('staffDoctors.inactiveOnly')}</option>
                    </select>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                    ) : doctors.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">{t('staffDoctors.empty')}</div>
                    ) : (
                        <div className="space-y-3">
                            {doctors.map((doctor) => (
                                <DoctorCard
                                    key={doctor.id}
                                    doctor={doctor}
                                    selected={doctor.id === selectedDoctorId}
                                    money={money}
                                    t={t}
                                    onSelect={() => setSelectedDoctorId(doctor.id)}
                                    onEdit={() => openEdit(doctor)}
                                    onDeactivate={() => deactivateDoctor(doctor)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className="min-h-[520px] rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                    {!selectedDoctor ? (
                        <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                            {t('staffDoctors.empty')}
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-100 p-5 dark:border-dark-700">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <Avatar src={selectedDoctor.avatarUrl} firstName={selectedDoctor.firstName} lastName={selectedDoctor.lastName} size="lg" />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="truncate text-2xl font-extrabold text-slate-950 dark:text-white">{selectedDoctor.fullName}</h2>
                                                <StatusPill active={selectedDoctor.isActive} t={t} />
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{selectedDoctor.specialty || '-'} • {selectedDoctor.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => openEdit(selectedDoctor)} className="btn-secondary text-sm">{t('staffDoctors.actions.edit')}</button>
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-4">
                                    <MiniMetric label={t('staffDoctors.stats.appointments')} value={selectedDoctor.metrics?.appointments || 0} />
                                    <MiniMetric label={t('staffDoctors.stats.upcoming')} value={selectedDoctor.metrics?.upcomingAppointments || 0} />
                                    <MiniMetric label={t('staffDoctors.stats.collected')} value={money.format(selectedDoctor.metrics?.collected || 0)} />
                                    <MiniMetric label={t('staffDoctors.stats.secretaries')} value={selectedDoctor.metrics?.secretaries || 0} />
                                </div>
                            </div>

                            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3 dark:border-dark-700">
                                {['patients', 'appointments', 'revenue', 'team'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-dark-700 dark:text-slate-300'}`}
                                    >
                                        {t(`staffDoctors.tabs.${tab}`)}
                                    </button>
                                ))}
                            </div>

                            <div className="p-5">
                                {isOverviewLoading ? (
                                    <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                                ) : (
                                    <OverviewPanel activeTab={activeTab} overview={overview} t={t} locale={locale} money={money} />
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {showModal && (
                <DoctorModal
                    doctor={editingDoctor}
                    saving={saving}
                    t={t}
                    onClose={() => setShowModal(false)}
                    onSave={saveDoctor}
                />
            )}
        </div>
    );
};

const DoctorCard = ({ doctor, selected, money, t, onSelect, onEdit, onDeactivate }) => (
    <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-3xl border p-4 text-left transition ${selected ? 'border-primary-300 bg-primary-50/60 shadow-lg shadow-primary-500/10 dark:border-primary-800 dark:bg-primary-900/10' : 'border-slate-100 bg-white hover:border-primary-200 hover:shadow-sm dark:border-dark-700 dark:bg-dark-800'}`}
    >
        <div className="flex items-start gap-4">
            <Avatar src={doctor.avatarUrl} firstName={doctor.firstName} lastName={doctor.lastName} size="lg" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-extrabold text-slate-950 dark:text-white">{doctor.fullName}</p>
                    <StatusPill active={doctor.isActive} t={t} />
                </div>
                <p className="mt-1 truncate text-sm text-primary-600 dark:text-primary-300">{doctor.specialty || '-'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{doctor.email}</p>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <CardMetric label={t('staffDoctors.stats.patients')} value={doctor.metrics?.patients || 0} />
            <CardMetric label={t('staffDoctors.stats.upcoming')} value={doctor.metrics?.upcomingAppointments || 0} />
            <CardMetric label={t('staffDoctors.stats.revenue')} value={money.format(doctor.metrics?.revenue || 0)} />
        </div>
        <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-700 dark:text-slate-300">
                {doctor.acceptsOnline ? t('staffDoctors.status.online') : t('staffDoctors.status.onsite')}
            </span>
            <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="ml-auto rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-dark-700 dark:text-slate-300">
                {t('staffDoctors.actions.edit')}
            </button>
            {doctor.isActive && (
                <button type="button" onClick={(event) => { event.stopPropagation(); onDeactivate(); }} className="rounded-xl border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">
                    {t('staffDoctors.actions.deactivate')}
                </button>
            )}
        </div>
    </button>
);

const OverviewPanel = ({ activeTab, overview, t, locale, money }) => {
    if (!overview) return null;

    if (activeTab === 'patients') {
        return <ListPanel title={t('staffDoctors.panels.patientsTitle')} empty={t('staffDoctors.panels.noPatients')}>
            {overview.patients.map((patient) => (
                <Link key={patient.id} to={`/patients/${patient.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-dark-700 dark:hover:bg-dark-700">
                    <Avatar src={patient.avatarUrl} firstName={patient.firstName} lastName={patient.lastName} size="md" />
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">{patient.fullName}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{patient.email || patient.phone || patient.patientNumber}</p>
                    </div>
                </Link>
            ))}
        </ListPanel>;
    }

    if (activeTab === 'appointments') {
        return <ListPanel title={t('staffDoctors.panels.appointmentsTitle')} empty={t('staffDoctors.panels.noAppointments')}>
            {overview.appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-dark-700">
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white">{appointment.patientName || '-'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.type} • {new Date(appointment.start).toLocaleString(locale)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-dark-700 dark:text-slate-300">{appointment.status}</span>
                </div>
            ))}
        </ListPanel>;
    }

    if (activeTab === 'revenue') {
        return <ListPanel title={t('staffDoctors.panels.revenueTitle')} empty={t('staffDoctors.panels.noRevenue')}>
            {overview.revenue.map((row) => (
                <div key={row.status} className="rounded-2xl border border-slate-100 p-4 dark:border-dark-700">
                    <div className="flex items-center justify-between">
                        <p className="font-bold capitalize text-slate-900 dark:text-white">{row.status}</p>
                        <span className="text-sm font-semibold text-slate-500">{row.count}</span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <MiniMetric label={t('staffDoctors.stats.revenue')} value={money.format(row.total)} />
                        <MiniMetric label={t('staffDoctors.stats.collected')} value={money.format(row.paid)} />
                        <MiniMetric label={t('staffDoctors.stats.outstanding')} value={money.format(row.balance)} />
                    </div>
                </div>
            ))}
        </ListPanel>;
    }

    return <ListPanel title={t('staffDoctors.panels.teamTitle')} empty={t('staffDoctors.panels.noSecretaries')}>
        {overview.secretaries.map((secretary) => (
            <div key={secretary.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-dark-700">
                <div>
                    <p className="font-bold text-slate-900 dark:text-white">{secretary.firstName} {secretary.lastName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{secretary.email}</p>
                </div>
                <StatusPill active={secretary.isActive} t={t} />
            </div>
        ))}
    </ListPanel>;
};

const DoctorModal = ({ doctor, saving, t, onClose, onSave }) => {
    const [form, setForm] = useState(() => doctor ? {
        firstName: doctor.firstName || '',
        lastName: doctor.lastName || '',
        email: doctor.email || '',
        password: '',
        phone: doctor.phone || '',
        specialty: doctor.specialty || '',
        licenseNumber: doctor.licenseNumber || '',
        avatarUrl: doctor.avatarUrl || '',
        consultationFee: doctor.consultationFee || 50,
        paymentPolicy: doctor.paymentPolicy || 'full-onsite',
        bio: doctor.bio || '',
        calendar: {
            ...emptyForm.calendar,
            ...(doctor.calendar || {})
        },
        acceptsOnline: Boolean(doctor.acceptsOnline),
        isActive: Boolean(doctor.isActive)
    } : { ...emptyForm });

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const submit = (event) => {
        event.preventDefault();
        const payload = { ...form };
        if (doctor) {
            delete payload.email;
            if (!payload.password) delete payload.password;
        }
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-dark-700">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">{doctor ? t('staffDoctors.modal.editTitle') : t('staffDoctors.modal.createTitle')}</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('staffDoctors.modal.subtitle')}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700">×</button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2">
                    <Field label={t('staffDoctors.fields.firstName')} value={form.firstName} onChange={(value) => update('firstName', value)} required />
                    <Field label={t('staffDoctors.fields.lastName')} value={form.lastName} onChange={(value) => update('lastName', value)} required />
                    {!doctor && <Field label={t('staffDoctors.fields.email')} type="email" value={form.email} onChange={(value) => update('email', value)} required />}
                    <Field label={t('staffDoctors.fields.password')} type="password" value={form.password} onChange={(value) => update('password', value)} required={!doctor} />
                    <Field label={t('staffDoctors.fields.phone')} value={form.phone} onChange={(value) => update('phone', value)} />
                    <Field label={t('staffDoctors.fields.specialty')} value={form.specialty} onChange={(value) => update('specialty', value)} />
                    <Field label={t('staffDoctors.fields.licenseNumber')} value={form.licenseNumber} onChange={(value) => update('licenseNumber', value)} />
                    <Field label={t('staffDoctors.fields.avatarUrl')} value={form.avatarUrl} onChange={(value) => update('avatarUrl', value)} />
                    <Field label={t('staffDoctors.fields.consultationFee')} type="number" value={form.consultationFee} onChange={(value) => update('consultationFee', value)} />
                    <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t('staffDoctors.fields.paymentPolicy')}
                        <select value={form.paymentPolicy} onChange={(event) => update('paymentPolicy', event.target.value)} className="input-field">
                            <option value="full-onsite">100% sur place</option>
                            <option value="deposit-30">Acompte 30%</option>
                        </select>
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t('staffDoctors.fields.bio')}
                        <textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} className="input-field min-h-[110px]" />
                    </label>
                    <div className="md:col-span-2 rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-900/40">
                        <p className="mb-4 text-sm font-extrabold text-slate-900 dark:text-white">{t('staffDoctors.fields.planning')}</p>
                        <div className="grid gap-4 md:grid-cols-4">
                            <Field label={t('staffDoctors.fields.defaultDuration')} type="number" value={form.calendar.defaultDurationMinutes} onChange={(value) => update('calendar', { ...form.calendar, defaultDurationMinutes: value })} />
                            <Field label={t('staffDoctors.fields.slotStep')} type="number" value={form.calendar.slotStepMinutes} onChange={(value) => update('calendar', { ...form.calendar, slotStepMinutes: value })} />
                            <Field label={t('staffDoctors.fields.minNotice')} type="number" value={form.calendar.minNoticeHours} onChange={(value) => update('calendar', { ...form.calendar, minNoticeHours: value })} />
                            <Field label={t('staffDoctors.fields.bookableDays')} type="number" value={form.calendar.maxBookingDays} onChange={(value) => update('calendar', { ...form.calendar, maxBookingDays: value })} />
                        </div>
                    </div>
                    <Toggle label={t('staffDoctors.fields.acceptsOnline')} checked={form.acceptsOnline} onChange={(value) => update('acceptsOnline', value)} />
                    <Toggle label={t('staffDoctors.fields.isActive')} checked={form.isActive} onChange={(value) => update('isActive', value)} />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-6 dark:border-dark-700">
                    <button type="button" onClick={onClose} className="btn-secondary">{t('staffDoctors.actions.cancel')}</button>
                    <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                        {saving ? t('staffDoctors.actions.saving') : doctor ? t('staffDoctors.actions.update') : t('staffDoctors.actions.create')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const Field = ({ label, value, onChange, type = 'text', required = false }) => (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="input-field" />
    </label>
);

const Toggle = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:bg-dark-700 dark:text-slate-200">
        {label}
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-primary-600" />
    </label>
);

const ListPanel = ({ title, empty, children }) => {
    const items = Array.isArray(children) ? children.filter(Boolean) : children;
    const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

    return (
        <div>
            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">{title}</h3>
            {isEmpty ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-dark-700 dark:text-slate-400">{empty}</div>
            ) : (
                <div className="mt-4 space-y-3">{items}</div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, accent }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
        <div className={`mb-3 h-2 w-12 rounded-full ${accent}`} />
        <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
);

const MiniMetric = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-dark-700">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
);

const CardMetric = ({ label, value }) => (
    <div className="rounded-2xl bg-slate-50 p-2 dark:bg-dark-700">
        <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
);

const StatusPill = ({ active, t }) => (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? statusClasses.active : statusClasses.inactive}`}>
        {active ? t('staffDoctors.status.active') : t('staffDoctors.status.inactive')}
    </span>
);

const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
);

const SearchIcon = (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

export default AdminDoctors;
