import { NextResponse } from 'next/server';
import { getHomeModules } from '@/lib/home-modules';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
    const response = NextResponse.json(await getHomeModules());
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
