import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../stores/languageStore';

const statuses = ['all', 'pending', 'approved', 'disabled'];
const roles = ['all', 'admin', 'practitioner', 'patient', 'secretary'];

const PlatformAccounts = () => {
    const { t } = useI18n();
    const [accounts, setAccounts] = useState([]);
    const [passwordRequests, setPasswordRequests] = useState([]);
    const [resetPasswords, setResetPasswords] = useState({});
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disabled: 0 });
    const [status, setStatus] = useState('pending');
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
            setAccounts(accountsResponse.data.data.accounts || []);
            setStats(accountsResponse.data.data.stats || {});
            setPasswordRequests(resetsResponse.data.data || []);
        } catch (error) {
            setMessage(t('platformAccounts.loadError'));
        } finally {
            setLoading(false);
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
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">{t('platformAccounts.eyebrow')}</p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{t('platformAccounts.title')}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('platformAccounts.subtitle')}</p>
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
                        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">{t('platformAccounts.passwordReset.title')}</h2>
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
                        {accounts.map((account) => (
                            <div key={account.id} className="grid gap-4 p-5 xl:grid-cols-[1.3fr_1fr_auto] xl:items-center">
                                <div>
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
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-dark-700">
                                    <p className="font-bold text-slate-900 dark:text-white">{account.clinic?.name || t('platformAccounts.noClinic')}</p>
                                    <p className="mt-1 text-slate-500">
                                        {account.clinic?.type === 'other' && account.clinic?.customType
                                            ? account.clinic.customType
                                            : account.clinic?.type || '-'}
                                        {account.clinic?.city ? ` - ${account.clinic.city}` : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 xl:justify-end">
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
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

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
