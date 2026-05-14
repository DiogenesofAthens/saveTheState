const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../parcels.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS parcels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    apn         TEXT    UNIQUE NOT NULL,
    parcel_id   TEXT    NOT NULL,
    address     TEXT    NOT NULL,
    city        TEXT    NOT NULL,
    state       TEXT    NOT NULL DEFAULT 'CA',
    zip         TEXT    NOT NULL,
    owner_type  TEXT    NOT NULL CHECK(owner_type IN ('residential','commercial','industrial')),
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

module.exports = db;
