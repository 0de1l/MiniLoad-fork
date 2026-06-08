import { NextRequest, NextResponse } from 'next/server';
import {
    deleteHomeItem,
    ensureHomeModuleSchema,
    getHomeDb,
    getHomeModules,
    saveHomeBook,
    saveHomeTool,
} from '@/lib/home-modules';
import { getAdminPassword, getRuntimeEnv } from '@/lib/analytics';
import {
    deleteUnusedAssetKeys,
    extractAssetKeysFromRecord,
    getR2AssetsBucket,
} from '@/lib/r2-assets';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type HomeItemType = 'tool' | 'book';

function unauthorized() {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

function requireAdmin(request: NextRequest) {
    return request.headers.get('Authorization') === getAdminPassword(getRuntimeEnv());
}

function normalizeType(value: string | null): HomeItemType {
    return value === 'book' ? 'book' : 'tool';
}

export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) return unauthorized();

    const type = normalizeType(new URL(request.url).searchParams.get('type'));
    const modules = await getHomeModules({ includeDisabled: true });
    const items = type === 'tool'
        ? modules.tools.map((tool) => ({ ...tool, filename: String(tool.id || '') }))
        : modules.books.map((book) => ({ ...book, filename: String(book.id || '') }));

    const response = NextResponse.json({ items });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) return unauthorized();

    const db = getHomeDb();
    if (!db) {
        return NextResponse.json({ error: 'D1 database not available' }, { status: 500 });
    }

    const body = await request.json() as { type?: HomeItemType; data?: Record<string, unknown> };
    const type = body.type === 'book' ? 'book' : 'tool';

    if (!body.data) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const id = type === 'tool'
        ? await saveHomeTool(db, body.data)
        : await saveHomeBook(db, body.data);

    const response = NextResponse.json({ success: true, id });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

export async function DELETE(request: NextRequest) {
    if (!requireAdmin(request)) return unauthorized();

    const db = getHomeDb();
    if (!db) {
        return NextResponse.json({ error: 'D1 database not available' }, { status: 500 });
    }

    const body = await request.json() as { type?: HomeItemType; id?: number | string };
    const type = body.type === 'book' ? 'book' : 'tool';
    const id = Number(body.id);

    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await ensureHomeModuleSchema(db);

    const target = type === 'book'
        ? await db.prepare('SELECT cover FROM home_books WHERE id = ?').bind(id).first<Record<string, unknown>>()
        : null;
    const cleanupCandidates = extractAssetKeysFromRecord(target);

    await deleteHomeItem(db, type, id);

    const assetCleanup = cleanupCandidates.length
        ? await deleteUnusedAssetKeys(cleanupCandidates, db, getR2AssetsBucket())
        : null;

    const response = NextResponse.json({ success: true, assetCleanup });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
