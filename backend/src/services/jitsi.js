const crypto = require('crypto');

const normalizeBaseUrl = (value) => {
    const raw = String(value || 'https://meet.jit.si').trim().replace(/\/+$/, '');
    return raw || 'https://meet.jit.si';
};

const getJitsiConfig = () => ({
    baseUrl: normalizeBaseUrl(process.env.JITSI_BASE_URL),
    roomPrefix: String(process.env.JITSI_ROOM_PREFIX || 'medicore').trim() || 'medicore',
    roomSecret: String(process.env.JITSI_ROOM_SECRET || 'change-me').trim() || 'change-me'
});

const buildRoomName = ({ appointmentId, practitionerId, startTime }) => {
    const { roomPrefix, roomSecret } = getJitsiConfig();
    const hash = crypto
        .createHash('sha256')
        .update(`${roomSecret}:${appointmentId}:${practitionerId || 'na'}:${new Date(startTime).toISOString()}`)
        .digest('hex')
        .slice(0, 16);

    return `${roomPrefix}-${appointmentId}-${hash}`.toLowerCase();
};

const buildMeetingUrl = (roomName) => `${getJitsiConfig().baseUrl}/${roomName}`;

const createJitsiMeeting = ({ appointmentId, practitionerId, startTime }) => {
    const roomName = buildRoomName({ appointmentId, practitionerId, startTime });
    return {
        externalId: roomName,
        meetingUrl: buildMeetingUrl(roomName)
    };
};

const updateJitsiMeeting = ({ appointmentId, practitionerId, startTime, existingExternalId }) => {
    const roomName = existingExternalId || buildRoomName({ appointmentId, practitionerId, startTime });
    return {
        externalId: roomName,
        meetingUrl: buildMeetingUrl(roomName)
    };
};

const getMeetingProviderStatus = () => {
    const { baseUrl, roomPrefix } = getJitsiConfig();
    return {
        provider: 'jitsi',
        requiresConnection: false,
        connected: true,
        baseUrl,
        roomPrefix
    };
};

module.exports = {
    createJitsiMeeting,
    getJitsiConfig,
    getMeetingProviderStatus,
    updateJitsiMeeting
};
