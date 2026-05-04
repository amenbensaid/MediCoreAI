const isClinicAdminUser = (user = {}) => user.role === 'admin' || user.clinicRole === 'admin';

const getOwnedPractitionerId = (user = {}) => {
    if (user.role === 'practitioner') return user.id;
    if (user.role === 'secretary' && user.assignedPractitionerId) return user.assignedPractitionerId;
    return null;
};

const getRequestedPractitionerScope = (req) => {
    const ownedPractitionerId = getOwnedPractitionerId(req.user);
    if (ownedPractitionerId) return ownedPractitionerId;
    if (isClinicAdminUser(req.user) && req.query?.practitionerId) return req.query.practitionerId;
    return null;
};

const getWritablePractitionerId = (req, body = req.body || {}) => {
    const ownedPractitionerId = getOwnedPractitionerId(req.user);
    if (ownedPractitionerId) return ownedPractitionerId;
    if (isClinicAdminUser(req.user)) return body.practitionerId || null;
    return null;
};

module.exports = {
    getOwnedPractitionerId,
    getRequestedPractitionerScope,
    getWritablePractitionerId,
    isClinicAdminUser
};
