import { createHmac, timingSafeEqual } from 'crypto';

export const COOKIE_NAME = 'kf_session';
export const SESSION_TTL_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

// Falls back to ADMIN_PASSWORD so existing deploys keep working without a new
// env var, but SESSION_SECRET should be set so a leaked cookie can't be used
// to derive the admin password.
function getSessionSecret() {
    return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

function sign(payload, secret) {
    return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken() {
    const secret = getSessionSecret();
    const expiresAt = String(Date.now() + SESSION_TTL_MS);
    return `${expiresAt}.${sign(expiresAt, secret)}`;
}

function isValidSessionToken(token) {
    const secret = getSessionSecret();
    if (!secret || !token) return false;

    const [expiresAt, signature] = token.split('.');
    if (!expiresAt || !signature) return false;

    const expected = Buffer.from(sign(expiresAt, secret), 'hex');
    const actual = Buffer.from(signature, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        return false;
    }

    return Number(expiresAt) > Date.now();
}

export function isAdminFromCookieValue(value) {
    return !!process.env.ADMIN_PASSWORD && isValidSessionToken(value);
}
