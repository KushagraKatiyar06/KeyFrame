//src/app/api/v1/status/[JobId]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const unwrappedParams = await params;
    const jobId = unwrappedParams.jobId;

    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        const response = await fetch(`${backendUrl}/api/v1/status/${jobId}`);

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error fetching status from backend:', error);
        return NextResponse.json({
            error: 'Failed to get job status',
            jobId,
            status: 'ERROR',
            progress: 0
        }, { status: 500 });
    }
}