export const isPlatformAdmin = (user) => user?.role === 'admin';

export const isClinicAdmin = (user) =>
    user?.role === 'admin' || user?.clinicRole === 'admin';

export const canAccessModule = (user, moduleKey) => {
    if (!user) {
        return false;
    }

    const clinicType = user.clinicType || 'general';

    if (isPlatformAdmin(user)) {
        return true;
    }

    if (user.role === 'secretary') {
        return Boolean(user.accessPermissions?.[moduleKey]);
    }

    switch (moduleKey) {
        case 'patients':
            return clinicType !== 'veterinary';
        case 'animals':
        case 'veterinary':
            return clinicType === 'veterinary';
        case 'dental':
            return clinicType === 'dental';
        case 'aesthetic':
            return clinicType === 'aesthetic';
        case 'demoRequests':
        case 'adminDoctors':
            return isClinicAdmin(user);
        case 'platformAccounts':
            return isPlatformAdmin(user);
        default:
            return true;
    }
};
