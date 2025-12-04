//src/app/api/v1/status/[JobId]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const jobId = params.jobId;

    const pollCount = Math.floor(Date.now() / 5000) % 5;

    let status = 'QUEUED';
    let progress = 10;
    let videoUrl = null;
    let thumbnailUrl = null;

    if (pollCount >= 1 && pollCount <= 3) {

        status = 'PROCESSING';
        progress = 10 + (pollCount * 20);
    } else if (pollCount >= 4) {

        status = 'COMPLETE';
        progress = 100;
        videoUrl = `/videos/mock_meme.mp4`;
        thumbnailUrl = `/thumbnails/mock_meme.png`;
    }

    return NextResponse.json({
        jobId,
        status,
        progress,
        videoUrl,
        thumbnailUrl,
    }, { status: 200 });
}