import { NextResponse } from 'next/server';

function checkAdmin(request) {
    const session = request.cookies.get('kf_session');
    return !!process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD;
}

export async function DELETE(request, { params }) {
    if (!checkAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    const res = await fetch(`${backendUrl}/api/v1/admin/videos/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.ADMIN_PASSWORD}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request, { params }) {
    if (!checkAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    const body = await request.json();
    const res = await fetch(`${backendUrl}/api/v1/admin/videos/${params.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.ADMIN_PASSWORD}`,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
