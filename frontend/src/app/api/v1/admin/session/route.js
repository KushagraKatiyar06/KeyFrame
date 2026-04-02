import { NextResponse } from 'next/server';

export async function GET(request) {
    const session = request.cookies.get('kf_session');
    const adminPassword = process.env.ADMIN_PASSWORD;
    const isAdmin = !!adminPassword && session?.value === adminPassword;
    return NextResponse.json({ isAdmin });
}
