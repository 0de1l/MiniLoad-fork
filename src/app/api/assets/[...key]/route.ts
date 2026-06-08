import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnv } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type R2ObjectBody = {
    body: ReadableStream;
    httpMetadata?: {
        contentType?: string;
    };
    httpEtag?: string;
};

type R2BucketBinding = {
    get: (key: string) => Promise<R2ObjectBody | null>;
};

function getAssetsBucket(): R2BucketBinding | null {
    const env = getRuntimeEnv() as { R2_ASSETS?: R2BucketBinding };
    return env.R2_ASSETS ?? null;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ key: string[] }> }
) {
    const bucket = getAssetsBucket();
    if (!bucket) {
        return NextResponse.json({ error: 'R2 binding R2_ASSETS is not available' }, { status: 500 });
    }

    const { key: parts } = await context.params;
    const key = parts.join('/');

    if (!key || key.includes('..')) {
        return NextResponse.json({ error: 'Invalid asset key' }, { status: 400 });
    }

    const object = await bucket.get(key);
    if (!object) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.httpEtag) headers.set('ETag', object.httpEtag);

    const ifNoneMatch = request.headers.get('if-none-match');
    if (object.httpEtag && ifNoneMatch === object.httpEtag) {
        return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(object.body, { headers });
}
