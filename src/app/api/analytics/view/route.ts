import { NextRequest, NextResponse } from 'next/server';
import {
    ensureAnalyticsSchema,
    getAnalyticsDb,
    getClientIp,
    getRuntimeEnv,
    hashVisitor,
    normalizePath,
    shouldTrackPath,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type ViewPayload = {
    path?: unknown;
    referrer?: unknown;
};

export async function POST(request: NextRequest) {
    const env = getRuntimeEnv();
    const db = getAnalyticsDb(env);

    if (!db) {
        return NextResponse.json({ tracked: false, reason: 'D1 database not available' }, { status: 202 });
    }

    let payload: ViewPayload = {};
    try {
        payload = (await request.json()) as ViewPayload;
    } catch {
        payload = {};
    }

    const path = normalizePath(payload.path);
    if (!shouldTrackPath(path)) {
        return NextResponse.json({ tracked: false, reason: 'path excluded' });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const ip = getClientIp(request);
    const visitorHash = await hashVisitor(`${ip}:${userAgent}:${acceptLanguage}`, env);
    const referrer = typeof payload.referrer === 'string' ? payload.referrer.slice(0, 500) : '';

    try {
        await ensureAnalyticsSchema(db);
        await db.prepare(`
            INSERT INTO analytics_events (path, visitor_hash, referrer)
            VALUES (?, ?, ?)
        `).bind(path, visitorHash, referrer).run();

        return NextResponse.json({ tracked: true });
    } catch (error) {
        console.error('Analytics view tracking failed:', error);
        return NextResponse.json({ tracked: false, error: 'Internal server error' }, { status: 500 });
    }
}
