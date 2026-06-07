import { NextResponse } from 'next/server';

//Proxy to backend API
export async function GET(request) {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const backendSearch = search ? `?search=${encodeURIComponent(search)}` : '';

        //Added a 10 second timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // forward admin auth so backend can include hidden videos for admins
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const session = cookieStore.get('kf_session');
        const isAdmin = !!process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD;

        const response = await fetch(`${backendUrl}/api/v1/feed${backendSearch}`, {
            signal: controller.signal,
            headers: isAdmin ? { Authorization: `Bearer ${process.env.ADMIN_PASSWORD}` } : {},
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error fetching from backend:', error);
        //Returns empty feed instead of error to prevent UI break
        return NextResponse.json({ success: true, count: 0, videos: [] }, { status: 200 });
    }
}