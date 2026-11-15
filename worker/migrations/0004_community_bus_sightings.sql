CREATE TABLE IF NOT EXISTS bus_sightings (
  id TEXT PRIMARY KEY,
  auth_uid TEXT NOT NULL REFERENCES user_profiles(auth_uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  route_number TEXT,
  fleet_number TEXT,
  registration TEXT,
  location TEXT,
  observed_at TEXT NOT NULL,
  notes TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  moderation_note TEXT,
  moderated_by TEXT REFERENCES user_profiles(auth_uid) ON DELETE SET NULL,
  moderated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sightings_public ON bus_sightings(status,observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_user ON bus_sightings(auth_uid,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_route ON bus_sightings(route_number);
