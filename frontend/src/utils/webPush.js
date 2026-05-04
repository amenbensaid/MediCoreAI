import api from '../services/api';

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const registerWebPush = async ({ patientToken } = {}) => {
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return { enabled: false, reason: 'unsupported_or_unconfigured' };
    }

    if (Notification.permission === 'denied') {
        return { enabled: false, reason: 'permission_denied' };
    }

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
        return { enabled: false, reason: 'permission_not_granted' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    if (patientToken) {
        await api.post('/public/web-push/subscribe', { subscription }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
    } else {
        await api.post('/notifications/web-push/subscribe', { subscription });
    }

    return { enabled: true };
};
