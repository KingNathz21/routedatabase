CREATE TABLE IF NOT EXISTS user_settings (
 auth_uid TEXT PRIMARY KEY REFERENCES user_profiles(auth_uid) ON DELETE CASCADE,
 theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('system','light','dark')),
 default_mode TEXT NOT NULL DEFAULT 'all' CHECK(default_mode IN ('all','bus','rail')),
 notifications_enabled INTEGER NOT NULL DEFAULT 0 CHECK(notifications_enabled IN (0,1)),
 home_location TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS saved_journeys (
 id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
 auth_uid TEXT NOT NULL REFERENCES user_profiles(auth_uid) ON DELETE CASCADE,
 origin TEXT NOT NULL,
 destination TEXT NOT NULL,
 journey_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_user ON saved_journeys(auth_uid,created_at);
