import { NextRequest, NextResponse } from 'next/server';
import { getAdminPassword, getRuntimeEnv } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

type R2BucketBinding = {
    put: (
        key: string,
        value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
        options?: { httpMetadata?: { contentType?: string } }
    ) => Promise<unknown>;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

function unauthorized() {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

function getAssetsBucket(): R2BucketBinding | null {
    const env = getRuntimeEnv() as { ASSETS?: R2BucketBinding };
    return env.ASSETS ?? null;
}

function normalizeFolder(value: FormDataEntryValue | null) {
    const folder = typeof value === 'string' ? value : 'uploads';
    if (folder === 'books' || folder === 'posts' || folder === 'daily' || folder === 'moments') return folder;
    return 'uploads';
}

function randomId() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
    if (request.headers.get('Authorization') !== getAdminPassword(getRuntimeEnv())) {
        return unauthorized();
    }

    const bucket = getAssetsBucket();
    if (!bucket) {
        return NextResponse.json({ error: 'R2 binding ASSETS is not available' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: 'Image exceeds 8MB limit' }, { status: 400 });
    }

    const folder = normalizeFolder(formData.get('folder'));
    const extension = EXTENSIONS[file.type] || 'bin';
    const key = `${folder}/${Date.now()}-${randomId()}.${extension}`;

    await bucket.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
    });

    const response = NextResponse.json({
        success: true,
        key,
        url: `/api/assets/${key}`,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
