/**
 * Vercel serverless entrypoint — wraps the Express app.
 * Chain init is best-effort; app works read-only without it.
 */
const path = require("path");

// Ensure backend env vars are visible (Vercel injects them as process.env)
process.env.DOTENV_SKIP = "1"; // prevent dotenv from overriding Vercel env

const chain = require("../backend/src/chain");
const db = require("../backend/src/db");
const app = require("../backend/src/app");

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
