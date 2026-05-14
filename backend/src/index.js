const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const chain = require("./chain");
const db = require("./db");
const app = require("./app");

const PORT = process.env.PORT || 3001;

async function start() {
  await db.init();
  await chain.init();
  app.listen(PORT, () => {
    console.log(`\nSovereign District API running on http://localhost:${PORT}`);
    console.log(`Chain connected: ${chain.isConnected()}`);
    console.log(`Database: ${process.env.DATABASE_URL ? "Neon (Postgres)" : "SQLite (local)"}`);
  });
}

start();
