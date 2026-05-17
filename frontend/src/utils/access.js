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

    if (Object.prototype.hasOwnProperty.call(user.accessPermissions || {}, moduleKey)) {
        return Boolean(user.accessPermissions[moduleKey]);
    }

    if (moduleKey === 'waitlist') {
        return Boolean(
            user.role !== 'secretary' ||
            user.accessPermissions?.waitlist ||
            user.accessPermissions?.appointments ||
            user.accessPermissions?.calendar
        );
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
        case 'billing':
        case 'analytics':
            return user.role !== 'practitioner';
        case 'secretaries':
        case 'accountants':
        case 'demoRequests':
        case 'adminDoctors':
            return isClinicAdmin(user);
        case 'platformAccounts':
            return isPlatformAdmin(user);
        default:
            return true;
    }
};
