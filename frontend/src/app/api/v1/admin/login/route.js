import { NextResponse } from 'next/server';
import { COOKIE_NAME, SESSION_TTL_MS, createSessionToken } from '@/lib/adminSession';

export async function POST(request) {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }
    if (password !== adminPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, createSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_TTL_MS / 1000,
        path: '/',
    });
    return response;
}
