CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reaction (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  reaction_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reaction_user ON reaction(user_id);
CREATE INDEX IF NOT EXISTS idx_reaction_time ON reaction(reaction_ms);
CREATE INDEX IF NOT EXISTS idx_reaction_created ON reaction(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS username_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  current_username TEXT NOT NULL,
  requested_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_username_requests_user ON username_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_username_requests_status ON username_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_requests_one_pending ON username_requests(user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at);

CREATE TABLE IF NOT EXISTS battleship_rooms (
  code TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_battleship_rooms_updated ON battleship_rooms(updated_at);

CREATE TABLE IF NOT EXISTS chess_rooms (
  code TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chess_rooms_updated ON chess_rooms(updated_at);
