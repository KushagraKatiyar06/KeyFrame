import { NextResponse } from 'next/server';

function checkAdmin(request) {
    const session = request.cookies.get('kf_session');
    return !!process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(request) {
    if (!checkAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    const formData = await request.formData();

    const res = await fetch(`${backendUrl}/api/v1/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.ADMIN_PASSWORD}` },
        body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
