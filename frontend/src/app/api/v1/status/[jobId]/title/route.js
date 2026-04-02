import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
    const { jobId } = await params;
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const body = await request.json();

        const response = await fetch(`${backendUrl}/api/v1/status/${jobId}/title`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error saving title:', error);
        return NextResponse.json({ error: 'Failed to save title' }, { status: 500 });
    }
}
