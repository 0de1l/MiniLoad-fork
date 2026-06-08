import { D1DatabaseLike, getRuntimeEnv } from '@/lib/analytics';

export type R2BucketLike = {
    delete: (key: string) => Promise<unknown>;
};

export type AssetCleanupResult = {
    candidates: string[];
    deleted: string[];
    retained: string[];
    failed: { key: string; error: string }[];
    skipped: string;
};

type ContentRecord = Record<string, unknown>;

const emptyCleanupResult = (candidates: string[], skipped = ''): AssetCleanupResult => ({
    candidates,
    deleted: [],
    retained: [],
    failed: [],
    skipped,
});

export function getR2AssetsBucket(): R2BucketLike | null {
    const env = getRuntimeEnv() as { R2_ASSETS?: R2BucketLike };
    return env.R2_ASSETS && typeof env.R2_ASSETS.delete === 'function' ? env.R2_ASSETS : null;
}

export function extractAssetKeysFromText(value: unknown): string[] {
    if (typeof value !== 'string' || !value.includes('/api/assets/')) return [];

    const keys = new Set<string>();
    const pattern = /(?:https?:\/\/[^/\s"'()]+)?\/api\/assets\/([^\s"'()<>{}\]]+)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
        const key = normalizeAssetKey(match[1]);
        if (key) keys.add(key);
    }

    return [...keys];
}

export function extractAssetKeysFromRecord(record: ContentRecord | null | undefined): string[] {
    if (!record) return [];

    const keys = new Set<string>();
    for (const value of Object.values(record)) {
        for (const key of extractAssetKeysFromText(value)) {
            keys.add(key);
        }
    }

    return [...keys];
}

export async function deleteUnusedAssetKeys(
    keys: string[],
    db: D1DatabaseLike | null,
    bucket: R2BucketLike | null
): Promise<AssetCleanupResult> {
    const candidates = [...new Set(keys.map(normalizeAssetKey).filter(Boolean))];
    if (!candidates.length) return emptyCleanupResult([]);
    if (!db) return emptyCleanupResult(candidates, 'D1 database not available');
    if (!bucket) return emptyCleanupResult(candidates, 'R2 binding R2_ASSETS not available');

    const referencedKeys = await collectReferencedAssetKeys(db);
    const result = emptyCleanupResult(candidates);

    for (const key of candidates) {
        if (referencedKeys.has(key)) {
            result.retained.push(key);
            continue;
        }

        try {
            await bucket.delete(key);
            result.deleted.push(key);
        } catch (error) {
            result.failed.push({
                key,
                error: error instanceof Error ? error.message : 'Unknown R2 delete error',
            });
        }
    }

    return result;
}

async function collectReferencedAssetKeys(db: D1DatabaseLike): Promise<Set<string>> {
    const referenced = new Set<string>();

    const recordSets = await Promise.all([
        safeAll<ContentRecord>(db, 'SELECT content FROM posts'),
        safeAll<ContentRecord>(db, 'SELECT content, image_url FROM daily'),
        safeAll<ContentRecord>(db, 'SELECT content, image_url FROM moments'),
        safeAll<ContentRecord>(db, 'SELECT cover FROM home_books'),
    ]);

    for (const records of recordSets) {
        for (const record of records) {
            for (const key of extractAssetKeysFromRecord(record)) {
                referenced.add(key);
            }
        }
    }

    return referenced;
}

async function safeAll<T>(db: D1DatabaseLike, query: string): Promise<T[]> {
    try {
        const { results } = await db.prepare(query).all<T>();
        return results || [];
    } catch {
        return [];
    }
}

function normalizeAssetKey(value: unknown): string {
    if (typeof value !== 'string') return '';

    const withoutQuery = value.split(/[?#]/)[0] || '';
    const trimmed = withoutQuery.replace(/^\/+/, '').trim();
    if (!trimmed || trimmed.includes('..')) return '';

    try {
        return decodeURIComponent(trimmed);
    } catch {
        return trimmed;
    }
}
