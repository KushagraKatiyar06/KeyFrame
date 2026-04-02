import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const response = await fetch(`${backendUrl}/api/v1/quota`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Quota proxy error:', error);
        // fail open
        return NextResponse.json({ used: 0, limit: 20, remaining: 20, resetsInSeconds: 86400 }, { status: 200 });
    }
}
