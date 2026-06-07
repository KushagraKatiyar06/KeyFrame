import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const userToken = request.headers.get('x-user-token') || '';

        const response = await fetch(`${backendUrl}/api/v1/quota`, {
            cache: 'no-store',
            headers: userToken ? { 'X-User-Token': userToken } : {},
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Quota proxy error:', error);
        return NextResponse.json({ used: 0, limit: 20, remaining: 20, userUsed: 0, userLimit: 2, userRemaining: 2, resetsInSeconds: 86400 }, { status: 200 });
    }
}
