import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type AuthPayload = {
    password?: string;
};

export async function POST(request: Request) {
    try {
        const { password } = (await request.json()) as AuthPayload;
        const adminPassword = process.env.ADMIN_PASSWORD || '';

        if (password === adminPassword) {
            const res = NextResponse.json({ success: true });
            res.headers.set('Cache-Control', 'no-store');
            return res;
        } else {
            const res = NextResponse.json({ error: 'Invalid security key' }, { status: 401 });
            res.headers.set('Cache-Control', 'no-store');
            return res;
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const res = NextResponse.json({ error: message }, { status: 500 });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    }
}
