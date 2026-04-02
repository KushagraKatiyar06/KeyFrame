import { NextResponse } from 'next/server';

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
    response.cookies.set('kf_session', adminPassword, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
    return response;
}
