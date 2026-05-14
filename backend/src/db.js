/**
 * Database abstraction layer.
 * - Local / CI:   better-sqlite3  (synchronous, file-based)
 * - Production:   @neondatabase/serverless  (async, Neon Postgres)
 *
 * The adaptor surfaces a small async API used by all routes:
 *   db.query(sql, params)  → { rows: [...] }
 *   db.run(sql, params)    → void
 *   db.get(sql, params)    → row | undefined
 *   db.all(sql, params)    → row[]
 *   db.init()              → Promise<void>  (creates schema)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const IS_NEON = !!process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Neon (production)
// ---------------------------------------------------------------------------
let neon;

function buildNeonAdapter() {
  const { neon: createNeon } = require("@neondatabase/serverless");
  const sql = createNeon(process.env.DATABASE_URL);

  function pgParams(query, params = []) {
    // Convert ? placeholders to $1, $2, ... for Postgres
    let i = 0;
    return query.replace(/\?/g, () => `$${++i}`);
  }

  return {
    async query(query, params = []) {
      const rows = await sql(pgParams(query, params), params);
      return { rows };
    },
    async run(query, params = []) {
      await sql(pgParams(query, params), params);
    },
    async get(query, params = []) {
      const rows = await sql(pgParams(query, params), params);
      return rows[0];
    },
    async all(query, params = []) {
      return sql(pgParams(query, params), params);
    },
    async init() {
      await sql`
        CREATE TABLE IF NOT EXISTS parcels (
          id          SERIAL PRIMARY KEY,
          apn         TEXT    UNIQUE NOT NULL,
          parcel_id   TEXT    NOT NULL,
          address     TEXT    NOT NULL,
          city        TEXT    NOT NULL,
          state       TEXT    NOT NULL DEFAULT 'CA',
          zip         TEXT    NOT NULL,
          owner_type  TEXT    NOT NULL,
          acreage     REAL,
          zoning      TEXT,
          lat         REAL    NOT NULL,
          lng         REAL    NOT NULL,
          on_chain    INTEGER NOT NULL DEFAULT 0,
          minted_at   TEXT,
          minted_by   TEXT,
          created_at  TEXT    NOT NULL DEFAULT to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS covenants (
          id              SERIAL PRIMARY KEY,
          parcel_apn      TEXT    NOT NULL REFERENCES parcels(apn),
          covenant_index  INTEGER NOT NULL,
          covenant_type   TEXT    NOT NULL,
          legal_text      TEXT,
          ipfs_hash       TEXT,
          legal_reference TEXT,
          creator         TEXT,
          tx_hash         TEXT,
          block_number    INTEGER,
          block_timestamp TEXT,
          active          INTEGER NOT NULL DEFAULT 1,
          flagged         INTEGER NOT NULL DEFAULT 0,
          created_at      TEXT    NOT NULL DEFAULT to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          UNIQUE(parcel_apn, covenant_index)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS audit_events (
          id              SERIAL PRIMARY KEY,
          parcel_apn      TEXT    NOT NULL,
          event_type      TEXT    NOT NULL,
          block_number    INTEGER,
          tx_hash         TEXT,
          block_timestamp TEXT,
          actor           TEXT,
          details         TEXT,
          created_at      TEXT    NOT NULL DEFAULT to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_covenants_apn ON covenants(parcel_apn)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_apn ON audit_events(parcel_apn)`;
    },
  };
}

// ---------------------------------------------------------------------------
// SQLite (local)
// ---------------------------------------------------------------------------
function buildSQLiteAdapter() {
  const Database = require("better-sqlite3");
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../parcels.db");
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    async query(query, params = []) {
      const stmt = sqlite.prepare(query);
      const rows = params.length ? stmt.all(...params) : stmt.all();
      return { rows };
    },
    async run(query, params = []) {
      const stmt = sqlite.prepare(query);
      params.length ? stmt.run(...params) : stmt.run();
    },
    async get(query, params = []) {
      const stmt = sqlite.prepare(query);
      return params.length ? stmt.get(...params) : stmt.get();
    },
    async all(query, params = []) {
      const stmt = sqlite.prepare(query);
      return params.length ? stmt.all(...params) : stmt.all();
    },
    async init() {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS parcels (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          apn         TEXT    UNIQUE NOT NULL,
          parcel_id   TEXT    NOT NULL,
          address     TEXT    NOT NULL,
          city        TEXT    NOT NULL,
          state       TEXT    NOT NULL DEFAULT 'CA',
          zip         TEXT    NOT NULL,
          owner_type  TEXT    NOT NULL,
          acreage     REAL,
          zoning      TEXT,
          lat         REAL    NOT NULL,
          lng         REAL    NOT NULL,
          on_chain    INTEGER NOT NULL DEFAULT 0,
          minted_at   TEXT,
          minted_by   TEXT,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS covenants (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          parcel_apn      TEXT    NOT NULL REFERENCES parcels(apn),
          covenant_index  INTEGER NOT NULL,
          covenant_type   TEXT    NOT NULL,
          legal_text      TEXT,
          ipfs_hash       TEXT,
          legal_reference TEXT,
          creator         TEXT,
          tx_hash         TEXT,
          block_number    INTEGER,
          block_timestamp TEXT,
          active          INTEGER NOT NULL DEFAULT 1,
          flagged         INTEGER NOT NULL DEFAULT 0,
          created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
          UNIQUE(parcel_apn, covenant_index)
        );
        CREATE TABLE IF NOT EXISTS audit_events (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          parcel_apn  TEXT    NOT NULL,
          event_type  TEXT    NOT NULL,
          block_number INTEGER,
          tx_hash     TEXT,
          block_timestamp TEXT,
          actor       TEXT,
          details     TEXT,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_covenants_apn ON covenants(parcel_apn);
        CREATE INDEX IF NOT EXISTS idx_audit_apn ON audit_events(parcel_apn);
      `);
    },
  };
}

// ---------------------------------------------------------------------------
// Export the right adapter
// ---------------------------------------------------------------------------
const db = IS_NEON ? buildNeonAdapter() : buildSQLiteAdapter();

module.exports = db;
