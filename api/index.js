/**
 * Vercel serverless entrypoint — wraps the Express app.
 * Chain init is best-effort; app works read-only without it.
 *
 * SQLite on Vercel: the function bundle is read-only, so we copy
 * the pre-seeded parcels.db to /tmp on first invocation and point
 * DB_PATH there.  Data added during a request (covenants, audit events)
 * persists within a warm lambda instance but resets on cold start — fine
 * for a demo; replace with DATABASE_URL (Neon) for true persistence.
 */
const fs   = require("fs");
const path = require("path");

// ── SQLite → /tmp bridge (must happen BEFORE db module is required) ──────────
if (!process.env.DATABASE_URL) {
  const bundledDb = path.join(__dirname, "../backend/parcels.db");
  const tmpDb     = "/tmp/parcels.db";

  // Copy seed data to /tmp on cold start so SQLite can write WAL files
  if (!fs.existsSync(tmpDb) && fs.existsSync(bundledDb)) {
    try {
      fs.copyFileSync(bundledDb, tmpDb);
      console.log("[vercel] parcels.db copied to /tmp");
    } catch (copyErr) {
      console.warn("[vercel] Could not copy parcels.db to /tmp:", copyErr.message);
    }
  }

  if (fs.existsSync(tmpDb)) {
    process.env.DB_PATH = tmpDb;
  } else if (!fs.existsSync(bundledDb)) {
    // Neither file exists → schema will be created in /tmp on db.init()
    process.env.DB_PATH = tmpDb;
    console.warn("[vercel] parcels.db not found in bundle — starting with empty DB");
  }
}

// Ensure backend env vars are visible (Vercel injects them as process.env)
process.env.DOTENV_SKIP = "1"; // prevent dotenv from overriding Vercel env

const chain = require("../backend/src/chain");
const db    = require("../backend/src/db");
const app   = require("../backend/src/app");

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  await db.init();
  await chain.init().catch((err) =>
    console.warn("[vercel] Chain init skipped:", err.message)
  );
}

module.exports = async (req, res) => {
  await ensureInit();
  app(req, res);
};
