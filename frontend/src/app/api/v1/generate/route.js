import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';

        // forward the browser UUID so per-user quota works correctly
        const userToken = request.headers.get('x-user-token') || '';

        const response = await fetch(`${backendUrl}/api/v1/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(userToken ? { 'X-User-Token': userToken } : {}),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error submitting job to backend:', error);
        return NextResponse.json(
            { error: 'Failed to submit job' },
            { status: 500 }
        );
    }
}