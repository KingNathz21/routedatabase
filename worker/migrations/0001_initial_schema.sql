
CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  website_url TEXT,
  logo_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  operator_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
  address TEXT,
  postcode TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, operator_id)
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  route_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'withdrawn')),
  start_point TEXT,
  destination TEXT,
  operator_name TEXT,
  garage_name TEXT,
  route_type TEXT,
  vehicle_type TEXT,
  power_type TEXT,
  pvr INTEGER,
  via TEXT,
  service_notes TEXT,
  source TEXT NOT NULL DEFAULT 'route-archive',
  source_updated_at TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_number ON routes(route_number);
CREATE INDEX IF NOT EXISTS idx_routes_status_number ON routes(status, route_number);
CREATE INDEX IF NOT EXISTS idx_routes_operator ON routes(operator_name);
CREATE INDEX IF NOT EXISTS idx_routes_garage ON routes(garage_name);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  fleet_number TEXT NOT NULL,
  registration TEXT,
  manufacturer TEXT,
  model TEXT,
  vehicle_type TEXT,
  power_type TEXT,
  operator_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
  garage_id TEXT REFERENCES garages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stored', 'withdrawn', 'unknown')),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'user-entered',
  source_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_fleet_number ON vehicles(fleet_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_operator ON vehicles(operator_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_garage ON vehicles(garage_id);

CREATE TABLE IF NOT EXISTS vehicle_allocations (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_number TEXT,
  garage_id TEXT REFERENCES garages(id) ON DELETE SET NULL,
  valid_from TEXT,
  valid_to TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_allocations_vehicle ON vehicle_allocations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_allocations_route ON vehicle_allocations(route_number);

CREATE TABLE IF NOT EXISTS user_profiles (
  auth_uid TEXT PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_routes (
  auth_uid TEXT NOT NULL REFERENCES user_profiles(auth_uid) ON DELETE CASCADE,
  route_number TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (auth_uid, route_number)
);

CREATE TABLE IF NOT EXISTS saved_stops (
  auth_uid TEXT NOT NULL REFERENCES user_profiles(auth_uid) ON DELETE CASCADE,
  stop_id TEXT NOT NULL,
  stop_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (auth_uid, stop_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  auth_uid TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
