const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const chain = require("./chain");
const parcelsRouter = require("./routes/parcels");
const auditRouter = require("./routes/audit");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(["http://localhost:5173", "http://localhost:3000"]);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/parcels", parcelsRouter);
app.use("/api/audit", auditRouter);

app.get("/api/health", async (_req, res) => {
  let blockNumber = null;
  let contractAddress = null;
  try {
    const provider = chain.getProvider();
    if (provider) blockNumber = await provider.getBlockNumber();
    const contract = chain.getContract();
    if (contract) contractAddress = await contract.getAddress();
  } catch {}
  res.json({ status: "ok", chainConnected: chain.isConnected(), blockNumber, contractAddress });
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
