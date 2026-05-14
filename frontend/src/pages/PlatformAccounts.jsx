import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import { useI18n } from '../stores/languageStore';

const statuses = ['all', 'pending', 'approved', 'disabled'];
const roles = ['all', 'admin', 'practitioner', 'patient', 'secretary'];
const featureGroups = [
    {
        key: 'core',
        items: ['dashboard', 'patients', 'animals', 'reviews']
    },
    {
        key: 'planning',
        items: ['appointments', 'waitlist', 'calendar', 'teleconsultations']
    },
    {
        key: 'finance',
        items: ['billing', 'analytics']
    },
    {
        key: 'administration',
        items: ['platformAccounts', 'adminDoctors', 'demoRequests', 'settings']
    },
    {
        key: 'modules',
        items: ['dental', 'aesthetic', 'veterinary']
    }
];
const featureKeys = featureGroups.flatMap((group) => group.items);

const defaultPermissionsByRole = {
    admin: Object.fromEntries(featureKeys.map((key) => [key, true])),
    practitioner: {
        dashboard: true,
        patients: true,
        animals: false,
        reviews: true,
        appointments: true,
        waitlist: true,
        calendar: true,
        teleconsultations: true,
        billing: true,
        analytics: true,
        platformAccounts: false,
        adminDoctors: false,
        demoRequests: false,
        settings: true,
        dental: false,
        aesthetic: false,
        veterinary: false
    },
    secretary: {
        dashboard: true,
        patients: true,
        animals: false,
        reviews: false,
        appointments: true,
        waitlist: true,
        calendar: true,
        teleconsultations: false,
        billing: false,
        analytics: false,
        platformAccounts: false,
        adminDoctors: false,
        demoRequests: false,
        settings: false,
        dental: false,
        aesthetic: false,
        veterinary: false
    },
    patient: Object.fromEntries(featureKeys.map((key) => [key, false]))
};

const resolveAccountPermissions = (account) => {
    const defaults = defaultPermissionsByRole[account.role] || defaultPermissionsByRole.practitioner;
    const explicitPermissions = account.accessPermissions || {};
    return Object.fromEntries(featureKeys.map((key) => [
        key,
        Boolean(explicitPermissions[key] ?? defaults[key] ?? false)
    ]));
};

const emptyAccountForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'practitioner',
    specialty: '',
    avatarUrl: '',
    password: '',
    isActive: true,
    isVerified: true
};

const PlatformAccounts = () => {
    const { t } = useI18n();
    const [accounts, setAccounts] = useState([]);
    const [passwordRequests, setPasswordRequests] = useState([]);
    const [resetPasswords, setResetPasswords] = useState({});
    const [permissionDrafts, setPermissionDrafts] = useState({});
    const [expandedPermissions, setExpandedPermissions] = useState({});
    const [savingPermissionsId, setSavingPermissionsId] = useState('');
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountForm, setAccountForm] = useState(emptyAccountForm);
    const [savingAccount, setSavingAccount] = useState(false);
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disabled: 0 });
    const [status, setStatus] = useState('all');
    const [role, setRole] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const [accountsResponse, resetsResponse] = await Promise.all([
                api.get('/users/platform/accounts', { params: { status, role, search } }),
                api.get('/users/platform/password-reset-requests')
            ]);
            const nextAccounts = accountsResponse.data.data.accounts || [];
            setAccounts(nextAccounts);
            setPermissionDrafts((current) => ({
                ...current,
                ...Object.fromEntries(nextAccounts.map((account) => [account.id, current[account.id] || resolveAccountPermissions(account)]))
            }));
            setStats(accountsResponse.data.data.stats || {});
            setPasswordRequests(resetsResponse.data.data || []);
        } catch (error) {
            setMessage(t('platformAccounts.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (account, key) => {
        setPermissionDrafts((current) => {
            const currentPermissions = current[account.id] || resolveAccountPermissions(account);
            return {
                ...current,
                [account.id]: {
                    ...currentPermissions,
                    [key]: !currentPermissions[key]
                }
            };
        });
    };

    const savePermissions = async (account) => {
        setMessage('');
        setSavingPermissionsId(account.id);
        try {
            const permissions = permissionDrafts[account.id] || resolveAccountPermissions(account);
            const response = await api.patch(`/users/platform/accounts/${account.id}/permissions`, { permissions });
            const accessPermissions = response.data.data?.accessPermissions || permissions;
            setAccounts((current) => current.map((item) => (
                item.id === account.id ? { ...item, accessPermissions } : item
            )));
            setPermissionDrafts((current) => ({ ...current, [account.id]: accessPermissions }));
            setMessage(t('platformAccounts.permissions.saved'));
        } catch (error) {
            setMessage(error.response?.data?.message || t('platformAccounts.permissions.saveError'));
        } finally {
            setSavingPermissionsId('');
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(fetchAccounts, 250);
        return () => window.clearTimeout(timer);
    }, [status, role, search]);

    const metrics = useMemo(() => [
        ['total', stats.total || 0],
        ['pending', stats.pending || 0],
        ['approved', stats.approved || 0],
        ['disabled', stats.disabled || 0]
    ], [stats]);

    const updateAccount = async (account, action) => {
        setMessage('');
        try {
            await api.patch(`/users/platform/accounts/${account.id}/approval`, { action });
            await fetchAccounts();
        } catch (error) {
            setMessage(error.response?.data?.message || t('platformAccounts.actionError'));
        }
    };

    const openCreateAccount = () => {
        setEditingAccount(null);
        setAccountForm(emptyAccountForm);
        setAccountModalOpen(true);
    };

    const openEditAccount = (account) => {
        setEditingAccount(account);
        setAccountForm({
            firstName: account.firstName || '',
            lastName: account.lastName || '',
            email: account.email || '',
            phone: account.phone || '',
            role: account.role || 'practitioner',
            specialty: account.specialty || '',
            avatarUrl: account.avatarUrl || '',
            password: '',
            isActive: Boolean(account.isActive),
            isVerified: Boolean(account.isVerified)
        });
        setAccountModalOpen(true);
    };

    const saveAccount = async (event) => {
        event.preventDefault();
        setMessage('');
        setSavingAccount(true);
        try {
            const payload = {
                ...accountForm,
                permissions: editingAccount
                    ? (permissionDrafts[editingAccount.id] || resolveAccountPermissions(editingAccount))
                    : (defaultPermissionsByRole[accountForm.role] || {})
            };
            if (!payload.password) {
                delete payload.password;
            }
            if (editingAccount) {
                await api.put(`/users/platform/accounts/${editingAccount.id}`, payload);
                setMessage(t('platformAccounts.crud.updated'));
            } else {
                await api.post('/users/platform/accounts', payload);
                setMessage(t('platformAccounts.crud.created'));
            }
            setAccountModalOpen(false);
            await fetchAccounts();
        } catch (error) {
            const validationMessage = error.response?.data?.errors?.[0]?.msg;
            setMessage(validationMessage || error.response?.data?.message || t('platformAccounts.crud.saveError'));
        } finally {
            setSavingAccount(false);
        }
    };

    const generatePassword = (requestId) => {
        const suffix = Math.random().toString(36).slice(2, 8);
        setResetPasswords((current) => ({ ...current, [requestId]: `Medi-${suffix}-2026` }));
    };

    const resolvePasswordRequest = async (request, action) => {
        setMessage('');
        try {
            const payload = { action };
            if (action === 'complete') {
                payload.newPassword = resetPasswords[request.id] || '';
            }
            await api.patch(`/users/platform/password-reset-requests/${request.id}`, payload);
            const nextMessage = action === 'complete'
                ? t('platformAccounts.passwordReset.completed', { password: payload.newPassword })
                : t('platformAccounts.passwordReset.dismissed');
            setMessage(nextMessage);
            setResetPasswords((current) => {
                const copy = { ...current };
                delete copy[request.id];
                return copy;
            });
            await fetchAccounts();
        } catch (error) {
            const validationMessage = error.response?.data?.errors?.[0]?.msg;
            setMessage(validationMessage || error.response?.data?.message || t('platformAccounts.actionError'));
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">{t('platformAccounts.eyebrow')}</p>
                        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{t('platformAccounts.title')}</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('platformAccounts.subtitle')}</p>
                    </div>
                    <button type="button" onClick={openCreateAccount} className="btn-primary">
                        {t('platformAccounts.crud.newAccount')}
                    </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    {metrics.map(([key, value]) => (
                        <div key={key} className="rounded-2xl bg-slate-50 p-4 dark:bg-dark-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t(`platformAccounts.stats.${key}`)}</p>
                            <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder={t('platformAccounts.searchPlaceholder')} />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                        {statuses.map((item) => <option key={item} value={item}>{t(`platformAccounts.status.${item}`)}</option>)}
                    </select>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                        {roles.map((item) => <option key={item} value={item}>{t(`platformAccounts.roles.${item}`)}</option>)}
                    </select>
                </div>
            </section>

            {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{message}</div>}

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">{t('platformAccounts.crud.subFeature')}</p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">{t('platformAccounts.passwordReset.title')}</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('platformAccounts.passwordReset.subtitle')}</p>
                    </div>
                    <span className="rounded-2xl bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">
                        {t('platformAccounts.passwordReset.pendingCount', { count: passwordRequests.length })}
                    </span>
                </div>
                {passwordRequests.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-dark-600">
                        {t('platformAccounts.passwordReset.empty')}
                    </div>
                ) : (
                    <div className="mt-4 grid gap-3">
                        {passwordRequests.map((request) => (
                            <div key={request.id} className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-700 lg:grid-cols-[1fr_360px_auto] lg:items-center">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-extrabold text-slate-950 dark:text-white">{request.fullName}</p>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-dark-800 dark:text-slate-300">
                                            {t(`platformAccounts.roles.${request.role}`)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">{request.email}</p>
                                    <p className="mt-1 text-xs text-slate-400">{request.clinicName || t('platformAccounts.noClinic')}</p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                    <input
                                        type="text"
                                        value={resetPasswords[request.id] || ''}
                                        onChange={(e) => setResetPasswords((current) => ({ ...current, [request.id]: e.target.value }))}
                                        className="input-field"
                                        placeholder={t('platformAccounts.passwordReset.passwordPlaceholder')}
                                    />
                                    <button type="button" onClick={() => generatePassword(request.id)} className="btn-secondary text-sm">
                                        {t('platformAccounts.passwordReset.generate')}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    <button type="button" onClick={() => resolvePasswordRequest(request, 'complete')} className="btn-primary text-sm">
                                        {t('platformAccounts.passwordReset.save')}
                                    </button>
                                    <button type="button" onClick={() => resolvePasswordRequest(request, 'dismiss')} className="btn-secondary text-sm">
                                        {t('platformAccounts.passwordReset.dismiss')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                {loading ? (
                    <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>
                ) : accounts.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">{t('platformAccounts.empty')}</div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-dark-700">
                        {accounts.map((account) => {
                            const permissions = permissionDrafts[account.id] || resolveAccountPermissions(account);
                            const enabledCount = featureKeys.filter((key) => permissions[key]).length;
                            const isExpanded = Boolean(expandedPermissions[account.id]);

                            return (
                            <div key={account.id} className="grid gap-4 p-5 xl:grid-cols-[1.15fr_0.95fr_1.4fr_auto] xl:items-start">
                                <div>
                                    <div className="flex items-start gap-3">
                                        <Avatar src={account.avatarUrl} firstName={account.firstName} lastName={account.lastName} name={account.fullName} size="md" radius="xl" />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-extrabold text-slate-950 dark:text-white">{account.fullName}</p>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-dark-700 dark:text-slate-300">
                                                    {t(`platformAccounts.roles.${account.role}`)}
                                                </span>
                                                <StatusBadge account={account} t={t} />
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">{account.email}</p>
                                            {account.role === 'secretary' && account.assignedPractitionerName && (
                                                <p className="mt-1 text-xs font-semibold text-primary-600">{t('platformAccounts.linkedTo')}: {account.assignedPractitionerName}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-dark-700">
                                    <p className="font-bold text-slate-900 dark:text-white">{account.clinic?.name || t('platformAccounts.noClinic')}</p>
                                    <p className="mt-1 text-slate-500">
                                        {account.clinic?.type === 'other' && account.clinic?.customType
                                            ? account.clinic.customType
                                            : account.clinic?.type || '-'}
                                        {account.clinic?.city ? ` - ${account.clinic.city}` : ''}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-700/70">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">{t('platformAccounts.permissions.title')}</p>
                                            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                                {t('platformAccounts.permissions.enabledCount', { count: enabledCount, total: featureKeys.length })}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPermissions((current) => ({ ...current, [account.id]: !current[account.id] }))}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-dark-600 dark:bg-dark-800 dark:text-slate-200"
                                        >
                                            {isExpanded ? t('platformAccounts.permissions.close') : t('platformAccounts.permissions.manage')}
                                        </button>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {featureKeys.filter((key) => permissions[key]).slice(0, 5).map((key) => (
                                            <span key={key} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-dark-800 dark:text-slate-200 dark:ring-dark-600">
                                                {t(`platformAccounts.permissions.items.${key}.label`)}
                                            </span>
                                        ))}
                                        {enabledCount > 5 && (
                                            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-200">+{enabledCount - 5}</span>
                                        )}
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-4 space-y-4">
                                            {featureGroups.map((group) => (
                                                <div key={group.key}>
                                                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                                        {t(`platformAccounts.permissions.groups.${group.key}`)}
                                                    </p>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        {group.items.map((key) => (
                                                            <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-primary-200 dark:border-dark-600 dark:bg-dark-800">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(permissions[key])}
                                                                    onChange={() => togglePermission(account, key)}
                                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <span>
                                                                    <span className="block text-sm font-extrabold text-slate-900 dark:text-white">{t(`platformAccounts.permissions.items.${key}.label`)}</span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t(`platformAccounts.permissions.items.${key}.description`)}</span>
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => savePermissions(account)}
                                                disabled={savingPermissionsId === account.id}
                                                className="btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {savingPermissionsId === account.id ? t('platformAccounts.permissions.saving') : t('platformAccounts.permissions.save')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 xl:justify-end">
                                    <button onClick={() => openEditAccount(account)} className="btn-secondary text-sm">{t('platformAccounts.crud.edit')}</button>
                                    {!account.isVerified && account.isActive && (
                                        <>
                                            <button onClick={() => updateAccount(account, 'approve')} className="btn-primary text-sm">{t('platformAccounts.actions.approve')}</button>
                                            <button onClick={() => updateAccount(account, 'reject')} className="btn-secondary text-sm">{t('platformAccounts.actions.reject')}</button>
                                        </>
                                    )}
                                    {account.isVerified && account.isActive && (
                                        <button onClick={() => updateAccount(account, 'disable')} className="btn-secondary text-sm">{t('platformAccounts.actions.disable')}</button>
                                    )}
                                    {!account.isActive && (
                                        <button onClick={() => updateAccount(account, 'reactivate')} className="btn-primary text-sm">{t('platformAccounts.actions.reactivate')}</button>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </section>

            {accountModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <form onSubmit={saveAccount} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-dark-800">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
                                    {editingAccount ? t('platformAccounts.crud.editEyebrow') : t('platformAccounts.crud.createEyebrow')}
                                </p>
                                <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                                    {editingAccount ? t('platformAccounts.crud.editTitle') : t('platformAccounts.crud.createTitle')}
                                </h2>
                            </div>
                            <button type="button" onClick={() => setAccountModalOpen(false)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-600 hover:bg-slate-200 dark:bg-dark-700 dark:text-slate-200">
                                {t('platformAccounts.crud.close')}
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <Field label={t('platformAccounts.crud.firstName')}>
                                <input required value={accountForm.firstName} onChange={(e) => setAccountForm((current) => ({ ...current, firstName: e.target.value }))} className="input-field" />
                            </Field>
                            <Field label={t('platformAccounts.crud.lastName')}>
                                <input required value={accountForm.lastName} onChange={(e) => setAccountForm((current) => ({ ...current, lastName: e.target.value }))} className="input-field" />
                            </Field>
                            <Field label={t('platformAccounts.crud.email')}>
                                <input required disabled={Boolean(editingAccount)} type="email" value={accountForm.email} onChange={(e) => setAccountForm((current) => ({ ...current, email: e.target.value }))} className="input-field disabled:opacity-60" />
                            </Field>
                            <Field label={t('platformAccounts.crud.phone')}>
                                <input value={accountForm.phone} onChange={(e) => setAccountForm((current) => ({ ...current, phone: e.target.value }))} className="input-field" />
                            </Field>
                            <Field label={t('platformAccounts.crud.role')}>
                                <select value={accountForm.role} onChange={(e) => setAccountForm((current) => ({ ...current, role: e.target.value }))} className="input-field">
                                    {roles.filter((item) => item !== 'all').map((item) => (
                                        <option key={item} value={item}>{t(`platformAccounts.roles.${item}`)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t('platformAccounts.crud.specialty')}>
                                <input value={accountForm.specialty} onChange={(e) => setAccountForm((current) => ({ ...current, specialty: e.target.value }))} className="input-field" />
                            </Field>
                            <Field label={t('platformAccounts.crud.avatarUrl')}>
                                <input value={accountForm.avatarUrl} onChange={(e) => setAccountForm((current) => ({ ...current, avatarUrl: e.target.value }))} className="input-field" />
                            </Field>
                            <Field label={editingAccount ? t('platformAccounts.crud.newPassword') : t('platformAccounts.crud.password')}>
                                <input required={!editingAccount} type="text" value={accountForm.password} onChange={(e) => setAccountForm((current) => ({ ...current, password: e.target.value }))} className="input-field" placeholder={editingAccount ? t('platformAccounts.crud.passwordHint') : ''} />
                            </Field>
                            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-dark-700 dark:bg-dark-700">
                                <label className="flex items-center justify-between gap-3 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                    {t('platformAccounts.crud.active')}
                                    <input type="checkbox" checked={accountForm.isActive} onChange={(e) => setAccountForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-5 w-5 rounded text-primary-600" />
                                </label>
                                <label className="flex items-center justify-between gap-3 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                    {t('platformAccounts.crud.verified')}
                                    <input type="checkbox" checked={accountForm.isVerified} onChange={(e) => setAccountForm((current) => ({ ...current, isVerified: e.target.checked }))} className="h-5 w-5 rounded text-primary-600" />
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setAccountModalOpen(false)} className="btn-secondary">{t('platformAccounts.crud.cancel')}</button>
                            <button type="submit" disabled={savingAccount} className="btn-primary disabled:opacity-60">
                                {savingAccount ? t('platformAccounts.crud.saving') : t('platformAccounts.crud.save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const Field = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-sm font-extrabold text-slate-800 dark:text-slate-100">{label}</span>
        {children}
    </label>
);

const StatusBadge = ({ account, t }) => {
    const key = !account.isActive ? 'disabled' : account.isVerified ? 'approved' : 'pending';
    const styles = {
        pending: 'bg-amber-50 text-amber-700',
        approved: 'bg-emerald-50 text-emerald-700',
        disabled: 'bg-slate-100 text-slate-500'
    };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[key]}`}>{t(`platformAccounts.status.${key}`)}</span>;
};

export default PlatformAccounts;
