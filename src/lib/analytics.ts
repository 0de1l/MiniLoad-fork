import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest } from 'next/server';

export type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            first: <T = unknown>() => Promise<T | null>;
            all: <T = unknown>() => Promise<{ results: T[] }>;
            run: () => Promise<unknown>;
        };
        first: <T = unknown>() => Promise<T | null>;
        all: <T = unknown>() => Promise<{ results: T[] }>;
        run: () => Promise<unknown>;
    };
};

type RuntimeEnv = Record<string, string | D1DatabaseLike | undefined>;

export type AnalyticsPoint = {
    date: string;
    views: number;
    visitors: number;
};

export type AnalyticsSummary = {
    totalViews: number;
    todayViews: number;
    uniqueVisitors: number;
    series: {
        '7d': AnalyticsPoint[];
        '30d': AnalyticsPoint[];
    };
};

const emptyPoint = (date: string): AnalyticsPoint => ({
    date,
    views: 0,
    visitors: 0,
});

export function buildDateRange(days: number): string[] {
    const dates: string[] = [];
    const now = new Date();

    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        date.setUTCDate(date.getUTCDate() - offset);
        dates.push(date.toISOString().slice(0, 10));
    }

    return dates;
}

export const emptyAnalyticsSummary = (): AnalyticsSummary => ({
    totalViews: 0,
    todayViews: 0,
    uniqueVisitors: 0,
    series: {
        '7d': buildDateRange(7).map(emptyPoint),
        '30d': buildDateRange(30).map(emptyPoint),
    },
});

export function getRuntimeEnv(): RuntimeEnv {
    const isNode = typeof process !== 'undefined' && typeof process.versions?.node !== 'undefined';

    if (!isNode) {
        try {
            return getRequestContext().env as RuntimeEnv;
        } catch {
            return {};
        }
    }

    return process.env as RuntimeEnv;
}

export function getAnalyticsDb(env: RuntimeEnv): D1DatabaseLike | null {
    const db = env.DB;
    return db && typeof db === 'object' && 'prepare' in db ? db : null;
}

export function getAdminPassword(env: RuntimeEnv): string {
    const envPassword = env.ADMIN_PASSWORD;
    const processPassword = typeof process !== 'undefined' ? process.env.ADMIN_PASSWORD : '';
    return typeof envPassword === 'string' ? envPassword : processPassword || '';
}

export function shouldTrackPath(path: string): boolean {
    if (!path || !path.startsWith('/')) return false;

    const pathname = path.split('?')[0] || '/';
    return ![
        '/admin',
        '/api',
        '/_next',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
    ].some((blockedPath) => pathname === blockedPath || pathname.startsWith(`${blockedPath}/`));
}

export function normalizePath(value: unknown): string {
    if (typeof value !== 'string') return '/';

    const path = value.trim().slice(0, 500);
    if (!path.startsWith('/')) return '/';

    return path || '/';
}

export function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    return request.headers.get('cf-connecting-ip') || forwarded || 'unknown';
}

export async function hashVisitor(input: string, env: RuntimeEnv): Promise<string> {
    const salt =
        (typeof env.ANALYTICS_SALT === 'string' && env.ANALYTICS_SALT) ||
        getAdminPassword(env) ||
        'miniload-analytics';
    const bytes = new TextEncoder().encode(`${salt}:${input}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export async function ensureAnalyticsSchema(db: D1DatabaseLike) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            visitor_hash TEXT NOT NULL,
            referrer TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();

    await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_path_created_at ON analytics_events(path, created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_created_at ON analytics_events(visitor_hash, created_at)').run();
}

export async function getAnalyticsSummary(db: D1DatabaseLike): Promise<AnalyticsSummary> {
    await ensureAnalyticsSchema(db);

    const totalRow = await db.prepare('SELECT COUNT(*) AS count FROM analytics_events').first<{ count: number }>();
    const todayRow = await db.prepare(`
        SELECT COUNT(*) AS count
        FROM analytics_events
        WHERE date(created_at) = date('now')
    `).first<{ count: number }>();
    const visitorsRow = await db.prepare(`
        SELECT COUNT(DISTINCT visitor_hash) AS count
        FROM analytics_events
    `).first<{ count: number }>();
    const { results } = await db.prepare(`
        SELECT
            date(created_at) AS date,
            COUNT(*) AS views,
            COUNT(DISTINCT visitor_hash) AS visitors
        FROM analytics_events
        WHERE date(created_at) >= date('now', '-29 days')
        GROUP BY date(created_at)
        ORDER BY date(created_at) ASC
    `).all<{ date: string; views: number; visitors: number }>();

    const byDate = new Map(
        results.map((row) => [
            row.date,
            {
                date: row.date,
                views: Number(row.views) || 0,
                visitors: Number(row.visitors) || 0,
            },
        ])
    );

    const buildSeries = (days: 7 | 30) => buildDateRange(days).map((date) => byDate.get(date) || emptyPoint(date));

    return {
        totalViews: Number(totalRow?.count) || 0,
        todayViews: Number(todayRow?.count) || 0,
        uniqueVisitors: Number(visitorsRow?.count) || 0,
        series: {
            '7d': buildSeries(7),
            '30d': buildSeries(30),
        },
    };
}
