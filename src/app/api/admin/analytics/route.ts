import { NextRequest, NextResponse } from 'next/server';
import {
    emptyAnalyticsSummary,
    getAdminPassword,
    getAnalyticsDb,
    getAnalyticsSummary,
    getRuntimeEnv,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const env = getRuntimeEnv();
    const authHeader = request.headers.get('Authorization');

    if (authHeader !== getAdminPassword(env)) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }

    const db = getAnalyticsDb(env);
    if (!db) {
        const response = NextResponse.json(emptyAnalyticsSummary());
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }

    try {
        const response = NextResponse.json(await getAnalyticsSummary(db));
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('Failed to load analytics summary:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
