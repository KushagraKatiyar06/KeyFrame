import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
    const { jobId } = await params;
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const body = await request.json();

        const response = await fetch(`${backendUrl}/api/v1/status/${jobId}/author`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error saving author:', error);
        return NextResponse.json({ error: 'Failed to save author name' }, { status: 500 });
    }
}
