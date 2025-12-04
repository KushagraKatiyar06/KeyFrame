import { NextResponse } from 'next/server';

const mockFeedData = [
    {
        id: 'mock-1',
        title: 'How to Integrate',
        style: 'Educational',
        thumbnailUrl: '/thumbnails/mock_integrals.png',
        videoUrl: '/videos/mock_integrals.mp4',
    },
    {
        id: 'mock-2',
        title: 'How I Won my First Fortnite Game',
        style: 'Storytelling',
        thumbnailUrl: '/thumbnails/mock_fortnite.png',
        videoUrl: '/videos/mock_fortnite.mp4',
    },
    {
        id: 'mock-3',
        title: 'The Greatest Meme of All Time',
        style: 'Meme',
        thumbnailUrl: '/thumbnails/mock_meme.png',
        videoUrl: '/videos/mock_meme.mp4',
    },
];

export async function GET() {
    return NextResponse.json(mockFeedData, { status: 200 });
}