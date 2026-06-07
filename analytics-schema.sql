CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    referrer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_path_created_at
ON analytics_events(path, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_created_at
ON analytics_events(visitor_hash, created_at);
