self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (error) {
        payload = { title: 'MediCore', body: event.data?.text() || '' };
    }

    event.waitUntil(self.registration.showNotification(payload.title || 'MediCore', {
        body: payload.body || '',
        data: { url: payload.url || '/' },
        icon: '/favicon.svg',
        badge: '/favicon.svg'
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(targetUrl));
});
