const defaultCalendarPreferences = {
    defaultDurationMinutes: 30,
    slotStepMinutes: 30,
    minNoticeHours: 2,
    maxBookingDays: 30,
    allowPatientModeChoice: true,
    sessions: [
        { id: 'mon-am', dayOfWeek: 1, start: '09:00', end: '12:00', mode: 'both', enabled: true },
        { id: 'mon-pm', dayOfWeek: 1, start: '14:00', end: '17:00', mode: 'both', enabled: true },
        { id: 'tue-am', dayOfWeek: 2, start: '09:00', end: '12:00', mode: 'both', enabled: true },
        { id: 'tue-pm', dayOfWeek: 2, start: '14:00', end: '17:00', mode: 'both', enabled: true },
        { id: 'wed-am', dayOfWeek: 3, start: '09:00', end: '12:00', mode: 'both', enabled: true },
        { id: 'wed-pm', dayOfWeek: 3, start: '14:00', end: '17:00', mode: 'both', enabled: true },
        { id: 'thu-am', dayOfWeek: 4, start: '09:00', end: '12:00', mode: 'both', enabled: true },
        { id: 'thu-pm', dayOfWeek: 4, start: '14:00', end: '17:00', mode: 'both', enabled: true },
        { id: 'fri-am', dayOfWeek: 5, start: '09:00', end: '12:00', mode: 'both', enabled: true },
        { id: 'fri-pm', dayOfWeek: 5, start: '14:00', end: '17:00', mode: 'both', enabled: true }
    ]
};

const clampNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
};

const normalizeTime = (value, fallback) => (
    /^\d{2}:\d{2}$/.test(String(value || '')) ? value : fallback
);

const normalizeCalendarPreferences = (value = {}) => {
    const source = value && typeof value === 'object' ? value : {};
    const sessions = Array.isArray(source.sessions) ? source.sessions : defaultCalendarPreferences.sessions;

    return {
        defaultDurationMinutes: clampNumber(source.defaultDurationMinutes, defaultCalendarPreferences.defaultDurationMinutes, 10, 240),
        slotStepMinutes: clampNumber(source.slotStepMinutes, defaultCalendarPreferences.slotStepMinutes, 5, 120),
        minNoticeHours: clampNumber(source.minNoticeHours, defaultCalendarPreferences.minNoticeHours, 0, 168),
        maxBookingDays: clampNumber(source.maxBookingDays, defaultCalendarPreferences.maxBookingDays, 1, 365),
        allowPatientModeChoice: source.allowPatientModeChoice !== false,
        sessions: sessions.map((session, index) => ({
            id: session.id || `session-${index}`,
            dayOfWeek: clampNumber(session.dayOfWeek, 1, 0, 6),
            start: normalizeTime(session.start, '09:00'),
            end: normalizeTime(session.end, '17:00'),
            mode: ['both', 'online', 'in-person'].includes(session.mode) ? session.mode : 'both',
            enabled: session.enabled !== false
        })).filter((session) => session.start < session.end)
    };
};

const timeToMinutes = (value) => {
    const [hours, minutes] = String(value).split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (value) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getSessionLabel = (session) => `${session.start}-${session.end}`;

module.exports = {
    defaultCalendarPreferences,
    getSessionLabel,
    minutesToTime,
    normalizeCalendarPreferences,
    timeToMinutes
};
