const crypto = require('crypto');

const db = require('../config/database');

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const parseJsonResponse = async (response) => {
    const text = await response.text();
    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return { raw: text };
    }
};

const getGoogleConfig = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('[GOOGLE] Missing Google Calendar configuration', {
            hasClientId: Boolean(clientId),
            hasClientSecret: Boolean(clientSecret),
            redirectUri: redirectUri || null
        });
        throw new Error('Google Calendar integration is not configured');
    }

    return { clientId, clientSecret, redirectUri };
};

const exchangeCodeForTokens = async (code) => {
    const { clientId, clientSecret, redirectUri } = getGoogleConfig();
    console.log('[GOOGLE] Exchanging authorization code for tokens', {
        redirectUri,
        codeLength: String(code || '').length
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
        console.error('[GOOGLE] Token exchange failed', {
            status: response.status,
            data
        });
        throw new Error(data.error_description || data.error || 'Failed to exchange Google authorization code');
    }

    console.log('[GOOGLE] Token exchange succeeded', {
        hasAccessToken: Boolean(data.access_token),
        hasRefreshToken: Boolean(data.refresh_token),
        expiresIn: data.expires_in || null
    });
    return data;
};

const refreshAccessToken = async (refreshToken) => {
    const { clientId, clientSecret } = getGoogleConfig();
    console.log('[GOOGLE] Refreshing access token', {
        hasRefreshToken: Boolean(refreshToken)
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
        })
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
        console.error('[GOOGLE] Access token refresh failed', {
            status: response.status,
            data
        });
        throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
    }

    console.log('[GOOGLE] Access token refresh succeeded', {
        hasAccessToken: Boolean(data.access_token),
        expiresIn: data.expires_in || null
    });
    return data;
};

const fetchGoogleProfile = async (accessToken) => {
    console.log('[GOOGLE] Fetching Google profile', {
        hasAccessToken: Boolean(accessToken)
    });
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
        console.error('[GOOGLE] Google profile fetch failed', {
            status: response.status,
            data
        });
        throw new Error(data.error_description || data.error || 'Failed to fetch Google profile');
    }

    console.log('[GOOGLE] Google profile fetched', {
        email: data.email || null,
        sub: data.sub || null
    });
    return data;
};

const storeGoogleTokens = async ({ userId, tokens, googleEmail }) => {
    const accessToken = tokens.access_token || null;
    const refreshToken = tokens.refresh_token || null;
    const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

    const existing = await db.query(
        `SELECT google_refresh_token
         FROM users
         WHERE id = $1`,
        [userId]
    );

    const persistedRefreshToken = refreshToken || existing.rows[0]?.google_refresh_token || null;
    console.log('[GOOGLE] Persisting Google tokens', {
        userId,
        googleEmail: googleEmail || null,
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(persistedRefreshToken),
        expiresAt: expiresAt ? expiresAt.toISOString() : null
    });

    await db.query(
        `UPDATE users
         SET google_access_token = $1,
             google_refresh_token = $2,
             google_token_expiry = $3,
             google_calendar_connected = true,
             google_calendar_email = COALESCE($4, google_calendar_email),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [accessToken, persistedRefreshToken, expiresAt, googleEmail || null, userId]
    );
};

const disconnectGoogleCalendar = async (userId) => {
    console.log('[GOOGLE] Disconnecting Google Calendar', { userId });
    await db.query(
        `UPDATE users
         SET google_access_token = NULL,
             google_refresh_token = NULL,
             google_token_expiry = NULL,
             google_calendar_connected = false,
             google_calendar_email = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
    );
};

const getGoogleCalendarStatus = async (userId) => {
    const result = await db.query(
        `SELECT google_calendar_connected, google_calendar_email, google_token_expiry
         FROM users
         WHERE id = $1`,
        [userId]
    );

    const row = result.rows[0] || {};
    const status = {
        connected: Boolean(row.google_calendar_connected),
        email: row.google_calendar_email || null,
        tokenExpiry: row.google_token_expiry || null
    };
    console.log('[GOOGLE] Loaded Google Calendar status', {
        userId,
        connected: status.connected,
        email: status.email,
        tokenExpiry: status.tokenExpiry
    });
    return status;
};

const getValidAccessToken = async (userId) => {
    const result = await db.query(
        `SELECT google_calendar_connected, google_access_token, google_refresh_token, google_token_expiry
         FROM users
         WHERE id = $1`,
        [userId]
    );

    const row = result.rows[0];
    if (!row?.google_calendar_connected) {
        console.warn('[GOOGLE] Google Calendar not connected for user', { userId });
        const error = new Error('Google Calendar is not connected');
        error.code = 'GOOGLE_NOT_CONNECTED';
        throw error;
    }

    const expiryTime = row.google_token_expiry ? new Date(row.google_token_expiry).getTime() : 0;
    const hasValidAccessToken = row.google_access_token && expiryTime > Date.now() + 60 * 1000;
    if (hasValidAccessToken) {
        console.log('[GOOGLE] Reusing existing access token', {
            userId,
            tokenExpiry: row.google_token_expiry
        });
        return row.google_access_token;
    }

    if (!row.google_refresh_token) {
        console.error('[GOOGLE] Missing refresh token for connected user', { userId });
        const error = new Error('Google Calendar refresh token is missing');
        error.code = 'GOOGLE_REFRESH_MISSING';
        throw error;
    }

    const refreshed = await refreshAccessToken(row.google_refresh_token);
    await storeGoogleTokens({
        userId,
        tokens: refreshed
    });

    return refreshed.access_token;
};

const createGoogleMeetEvent = async ({
    practitionerId,
    summary,
    description,
    startTime,
    endTime,
    attendees = []
}) => {
    console.log('[GOOGLE] Creating Google Meet event', {
        practitionerId,
        summary,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        attendeesCount: attendees.length
    });
    const accessToken = await getValidAccessToken(practitionerId);
    const requestId = crypto.randomUUID();

    let response;
    try {
        response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?conferenceDataVersion=1`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary,
                description,
                start: {
                    dateTime: new Date(startTime).toISOString()
                },
                end: {
                    dateTime: new Date(endTime).toISOString()
                },
                attendees,
                conferenceData: {
                    createRequest: {
                        requestId,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet'
                        }
                    }
                }
            })
        });
    } catch (error) {
        console.error('[GOOGLE] Google Meet event creation request failed', {
            message: error.message,
            cause: error.cause?.message || error.cause || null
        });
        throw error;
    }

    const data = await parseJsonResponse(response);
    if (!response.ok) {
        console.error('[GOOGLE] Google Meet event creation failed', {
            status: response.status,
            data
        });
        const error = new Error(data.error?.message || 'Failed to create Google Meet event');
        error.code = 'GOOGLE_EVENT_CREATE_FAILED';
        throw error;
    }

    console.log('[GOOGLE] Google Meet event created', {
        googleEventId: data.id || null,
        meetLink: data.hangoutLink || null
    });
    return {
        googleEventId: data.id,
        meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || null
    };
};

const updateGoogleMeetEvent = async ({
    practitionerId,
    googleEventId,
    summary,
    description,
    startTime,
    endTime,
    attendees = []
}) => {
    if (!googleEventId) {
        return { googleEventId: null, meetLink: null };
    }

    console.log('[GOOGLE] Updating Google Meet event', {
        practitionerId,
        googleEventId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        attendeesCount: attendees.length
    });

    const accessToken = await getValidAccessToken(practitionerId);
    const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${googleEventId}?conferenceDataVersion=1&sendUpdates=all`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            summary,
            description,
            start: {
                dateTime: new Date(startTime).toISOString()
            },
            end: {
                dateTime: new Date(endTime).toISOString()
            },
            attendees
        })
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
        console.error('[GOOGLE] Google Meet event update failed', {
            status: response.status,
            googleEventId,
            data
        });
        const error = new Error(data.error?.message || 'Failed to update Google Meet event');
        error.code = 'GOOGLE_EVENT_UPDATE_FAILED';
        throw error;
    }

    console.log('[GOOGLE] Google Meet event updated', {
        googleEventId: data.id || googleEventId,
        meetLink: data.hangoutLink || null
    });
    return {
        googleEventId: data.id || googleEventId,
        meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || null
    };
};

const cancelGoogleEvent = async ({ practitionerId, googleEventId }) => {
    if (!googleEventId) {
        return;
    }

    console.log('[GOOGLE] Cancelling Google event', {
        practitionerId,
        googleEventId
    });

    const accessToken = await getValidAccessToken(practitionerId);
    const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}/${googleEventId}?sendUpdates=all`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok && response.status !== 404) {
        const data = await parseJsonResponse(response);
        console.error('[GOOGLE] Google event cancellation failed', {
            status: response.status,
            googleEventId,
            data
        });
        const error = new Error(data.error?.message || 'Failed to cancel Google event');
        error.code = 'GOOGLE_EVENT_CANCEL_FAILED';
        throw error;
    }

    console.log('[GOOGLE] Google event cancelled', {
        googleEventId,
        alreadyMissing: response.status === 404
    });
};

const buildGoogleAuthUrl = ({ state }) => {
    const { clientId, redirectUri } = getGoogleConfig();
    console.log('[GOOGLE] Building Google auth URL', {
        redirectUri,
        hasState: Boolean(state),
        clientIdPrefix: clientId ? `${clientId.slice(0, 12)}...` : null
    });

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.events'
        ].join(' '),
        state
    });

    return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`;
};

module.exports = {
    buildGoogleAuthUrl,
    cancelGoogleEvent,
    createGoogleMeetEvent,
    disconnectGoogleCalendar,
    exchangeCodeForTokens,
    fetchGoogleProfile,
    getGoogleCalendarStatus,
    getGoogleConfig,
    refreshAccessToken,
    storeGoogleTokens,
    updateGoogleMeetEvent
};
