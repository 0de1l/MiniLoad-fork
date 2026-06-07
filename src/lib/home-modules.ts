import {
    D1DatabaseLike,
    getAnalyticsDb,
    getRuntimeEnv,
} from '@/lib/analytics';
import { HomeToolIcon, homeToolIconOptions } from '@/lib/home-module-types';

export type { HomeToolIcon } from '@/lib/home-module-types';

export type HomeTool = {
    id?: number;
    name: string;
    description: string;
    link: string;
    icon: HomeToolIcon;
    sortOrder: number;
    enabled: boolean;
};

export type HomeBook = {
    id?: number;
    title: string;
    cover: string;
    hoverText: string;
    sortOrder: number;
    enabled: boolean;
};

export type HomeModules = {
    tools: HomeTool[];
    books: HomeBook[];
};

type HomeToolRow = {
    id: number;
    name: string;
    description: string;
    link: string;
    icon: string;
    sort_order: number;
    enabled: number;
};

type HomeBookRow = {
    id: number;
    title: string;
    cover: string;
    hover_text: string;
    sort_order: number;
    enabled: number;
};

const iconValues = new Set(homeToolIconOptions.map((option) => option.value));

export const defaultHomeTools: HomeTool[] = [
    {
        name: 'GenerateExcel',
        description: 'Excel 生成工具',
        link: 'https://github.com/arkleselect/GenerateExcel',
        icon: 'file',
        sortOrder: 10,
        enabled: true,
    },
    {
        name: 'SmartStitcher',
        description: '智能拼接工具',
        link: 'https://github.com/arkleselect/Tools',
        icon: 'layers',
        sortOrder: 20,
        enabled: true,
    },
    {
        name: 'SyncTool',
        description: '内网传输工具',
        link: 'https://github.com/arkleselect/sync_tool',
        icon: 'refresh',
        sortOrder: 30,
        enabled: true,
    },
    {
        name: 'ppt_to_video',
        description: 'PPT 生成视频工具',
        link: 'https://github.com/arkleselect/ppt_to_video',
        icon: 'video',
        sortOrder: 40,
        enabled: true,
    },
];

export const defaultHomeBooks: HomeBook[] = [
    {
        title: 'Elon Musk',
        cover: 'https://raw.githubusercontent.com/arkleselect/blog/main/img/Elon%20Musk.jpg',
        hoverText: 'ELON MUSK',
        sortOrder: 10,
        enabled: true,
    },
];

export const defaultHomeModules: HomeModules = {
    tools: defaultHomeTools,
    books: defaultHomeBooks,
};

export function getHomeDb() {
    return getAnalyticsDb(getRuntimeEnv());
}

export async function ensureHomeModuleSchema(db: D1DatabaseLike) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS home_tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            link TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT 'file',
            sort_order INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS home_books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            cover TEXT NOT NULL,
            hover_text TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS home_module_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();

    await db.prepare('CREATE INDEX IF NOT EXISTS idx_home_tools_enabled_sort ON home_tools(enabled, sort_order, id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_home_books_enabled_sort ON home_books(enabled, sort_order, id)').run();

    await seedDefaultHomeModules(db);
}

async function seedDefaultHomeModules(db: D1DatabaseLike) {
    const seeded = await db.prepare('SELECT value FROM home_module_meta WHERE key = ?').bind('default_seed_v1').first<{ value: string }>();
    if (seeded) return;

    const toolCount = await db.prepare('SELECT COUNT(*) AS count FROM home_tools').first<{ count: number }>();
    const bookCount = await db.prepare('SELECT COUNT(*) AS count FROM home_books').first<{ count: number }>();

    if (!toolCount?.count) {
        for (const tool of defaultHomeTools) {
            await db.prepare(`
                INSERT INTO home_tools (name, description, link, icon, sort_order, enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(tool.name, tool.description, tool.link, tool.icon, tool.sortOrder, tool.enabled ? 1 : 0).run();
        }
    }

    if (!bookCount?.count) {
        for (const book of defaultHomeBooks) {
            await db.prepare(`
                INSERT INTO home_books (title, cover, hover_text, sort_order, enabled)
                VALUES (?, ?, ?, ?, ?)
            `).bind(book.title, book.cover, book.hoverText, book.sortOrder, book.enabled ? 1 : 0).run();
        }
    }

    await db.prepare(`
        INSERT INTO home_module_meta (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).bind('default_seed_v1', 'done').run();
}

export async function getHomeModules(options: { includeDisabled?: boolean } = {}): Promise<HomeModules> {
    const db = getHomeDb();
    if (!db) return defaultHomeModules;

    try {
        await ensureHomeModuleSchema(db);

        const enabledClause = options.includeDisabled ? '' : 'WHERE enabled = 1';
        const [{ results: toolRows }, { results: bookRows }] = await Promise.all([
            db.prepare(`
                SELECT id, name, description, link, icon, sort_order, enabled
                FROM home_tools
                ${enabledClause}
                ORDER BY sort_order ASC, id ASC
            `).all<HomeToolRow>(),
            db.prepare(`
                SELECT id, title, cover, hover_text, sort_order, enabled
                FROM home_books
                ${enabledClause}
                ORDER BY sort_order ASC, id ASC
            `).all<HomeBookRow>(),
        ]);

        const tools = toolRows.map(mapToolRow);
        const books = bookRows.map(mapBookRow);

        return {
            tools: tools.length || options.includeDisabled ? tools : defaultHomeTools,
            books: books.length || options.includeDisabled ? books : defaultHomeBooks,
        };
    } catch (error) {
        console.error('Failed to load home modules:', error);
        return defaultHomeModules;
    }
}

export async function saveHomeTool(db: D1DatabaseLike, data: Partial<HomeTool> & { id?: number }) {
    await ensureHomeModuleSchema(db);

    const tool = normalizeTool(data);
    if (data.id) {
        await db.prepare(`
            UPDATE home_tools
            SET name = ?, description = ?, link = ?, icon = ?, sort_order = ?, enabled = ?, updated_at = datetime('now')
            WHERE id = ?
        `).bind(tool.name, tool.description, tool.link, tool.icon, tool.sortOrder, tool.enabled ? 1 : 0, data.id).run();
        return data.id;
    }

    const result = await db.prepare(`
        INSERT INTO home_tools (name, description, link, icon, sort_order, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(tool.name, tool.description, tool.link, tool.icon, tool.sortOrder, tool.enabled ? 1 : 0).run();

    return getInsertedId(result);
}

export async function saveHomeBook(db: D1DatabaseLike, data: Partial<HomeBook> & { id?: number }) {
    await ensureHomeModuleSchema(db);

    const book = normalizeBook(data);
    if (data.id) {
        await db.prepare(`
            UPDATE home_books
            SET title = ?, cover = ?, hover_text = ?, sort_order = ?, enabled = ?, updated_at = datetime('now')
            WHERE id = ?
        `).bind(book.title, book.cover, book.hoverText, book.sortOrder, book.enabled ? 1 : 0, data.id).run();
        return data.id;
    }

    const result = await db.prepare(`
        INSERT INTO home_books (title, cover, hover_text, sort_order, enabled)
        VALUES (?, ?, ?, ?, ?)
    `).bind(book.title, book.cover, book.hoverText, book.sortOrder, book.enabled ? 1 : 0).run();

    return getInsertedId(result);
}

export async function deleteHomeItem(db: D1DatabaseLike, type: 'tool' | 'book', id: number) {
    await ensureHomeModuleSchema(db);
    const table = type === 'tool' ? 'home_tools' : 'home_books';
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
}

function mapToolRow(row: HomeToolRow): HomeTool {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        link: row.link,
        icon: normalizeIcon(row.icon),
        sortOrder: Number(row.sort_order) || 0,
        enabled: Boolean(row.enabled),
    };
}

function mapBookRow(row: HomeBookRow): HomeBook {
    return {
        id: row.id,
        title: row.title,
        cover: row.cover,
        hoverText: row.hover_text,
        sortOrder: Number(row.sort_order) || 0,
        enabled: Boolean(row.enabled),
    };
}

function normalizeTool(data: Partial<HomeTool>): HomeTool {
    return {
        name: String(data.name || '').trim(),
        description: String(data.description || '').trim(),
        link: String(data.link || '').trim(),
        icon: normalizeIcon(data.icon),
        sortOrder: Number(data.sortOrder) || 0,
        enabled: data.enabled !== false,
    };
}

function normalizeBook(data: Partial<HomeBook>): HomeBook {
    return {
        title: String(data.title || '').trim(),
        cover: String(data.cover || '').trim(),
        hoverText: String(data.hoverText || '').trim(),
        sortOrder: Number(data.sortOrder) || 0,
        enabled: data.enabled !== false,
    };
}

function normalizeIcon(value: unknown): HomeToolIcon {
    return typeof value === 'string' && iconValues.has(value as HomeToolIcon) ? value as HomeToolIcon : 'file';
}

function getInsertedId(result: unknown) {
    if (result && typeof result === 'object' && 'meta' in result) {
        const meta = (result as { meta?: { last_row_id?: number } }).meta;
        return meta?.last_row_id;
    }
    return undefined;
}
