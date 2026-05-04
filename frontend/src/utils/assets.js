const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const trimTrailingSlash = (value) => String(value || '').replace(/\/$/, '');

const getConfiguredAssetOrigin = () => {
    const explicitUploadsUrl = import.meta.env.VITE_UPLOADS_URL;
    if (explicitUploadsUrl) {
        return trimTrailingSlash(explicitUploadsUrl);
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && isAbsoluteUrl(apiUrl)) {
        return new URL(apiUrl).origin;
    }

    if (import.meta.env.DEV) {
        return trimTrailingSlash(import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5000');
    }

    return '';
};

export const getAssetUrl = (value) => {
    const nextValue = String(value || '').trim();
    if (!nextValue) {
        return '';
    }

    if (
        isAbsoluteUrl(nextValue) ||
        nextValue.startsWith('data:') ||
        nextValue.startsWith('blob:')
    ) {
        return nextValue;
    }

    if (nextValue.startsWith('/uploads/')) {
        return `${getConfiguredAssetOrigin()}${nextValue}`;
    }

    return nextValue;
};
