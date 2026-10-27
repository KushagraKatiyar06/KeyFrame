import { NextResponse } from 'next/server';
import { COOKIE_NAME, isAdminFromCookieValue } from '@/lib/adminSession';

export async function GET(request) {
    const session = request.cookies.get(COOKIE_NAME);
    const isAdmin = isAdminFromCookieValue(session?.value);
    return NextResponse.json({ isAdmin });
}
