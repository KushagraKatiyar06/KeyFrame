import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {

    await request.json();
    const jobId = uuidv4();

    return NextResponse.json(
        {
            jobId: jobId,
            message: 'Job received. Check status endpoint for updates.',
        },
        { status: 202 }
    );
}