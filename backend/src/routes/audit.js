const { Router } = require("express");
const db = require("../db");
const chain = require("../chain");

const router = Router();

// GET /api/audit/:apn — full event log for a parcel (DB cache + optionally synced from chain)
router.get("/:apn", async (req, res) => {
  const apn = req.params.apn.toUpperCase();

  const parcel = db.prepare("SELECT * FROM parcels WHERE apn = ?").get(apn);
  if (!parcel) return res.status(404).json({ error: "Parcel not found" });

  // If chain is available, fetch live events and upsert any missing ones
  if (chain.isConnected()) {
    try {
      await syncAuditEvents(apn, parcel.parcel_id);
    } catch (err) {
      console.warn("[audit] Chain sync failed:", err.message);
    }
  }

  const events = db
    .prepare(
      `SELECT * FROM audit_events WHERE parcel_apn = ? ORDER BY block_number DESC, id DESC`
    )
    .all(apn);

  res.json({ apn, events });
});

async function syncAuditEvents(apn, parcelIdHex) {
  const contract = chain.getContract();
  const provider = chain.getProvider();
  if (!contract || !provider) return;

  const parcelId = BigInt(parcelIdHex);

  const mintFilter = contract.filters.ParcelMinted(parcelId);
  const addFilter = contract.filters.CovenantAdded(parcelId);
  const deactivateFilter = contract.filters.CovenantDeactivated(parcelId);

  const [mintLogs, addLogs, deactivateLogs] = await Promise.all([
    contract.queryFilter(mintFilter),
    contract.queryFilter(addFilter),
    contract.queryFilter(deactivateFilter),
  ]);

  const allLogs = [
    ...mintLogs.map((l) => ({ ...l, eventType: "ParcelMinted" })),
    ...addLogs.map((l) => ({ ...l, eventType: "CovenantAdded" })),
    ...deactivateLogs.map((l) => ({ ...l, eventType: "CovenantDeactivated" })),
  ];

  const upsert = db.prepare(
    `INSERT OR IGNORE INTO audit_events
       (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const log of allLogs) {
    const existing = db
      .prepare("SELECT id FROM audit_events WHERE tx_hash = ? AND event_type = ?")
      .get(log.transactionHash, log.eventType);
    if (existing) continue;

    let block;
    try {
      block = await provider.getBlock(log.blockNumber);
    } catch {
      block = null;
    }

    const ts = block
      ? new Date(Number(block.timestamp) * 1000).toISOString()
      : null;

    let actor = "0x0000000000000000000000000000000000000000";
    let details = {};

    if (log.eventType === "ParcelMinted") {
      actor = log.args[2] || actor;
      details = { apn: log.args[1] };
    } else if (log.eventType === "CovenantAdded") {
      actor = log.args[3] || actor;
      details = {
        covenantIndex: log.args[1]?.toString(),
        covenantType: log.args[2],
      };
    } else if (log.eventType === "CovenantDeactivated") {
      actor = log.args[2] || actor;
      details = { covenantIndex: log.args[1]?.toString() };
    }

    upsert.run(
      apn,
      log.eventType,
      log.blockNumber,
      log.transactionHash,
      ts,
      actor,
      JSON.stringify(details)
    );
  }
}

module.exports = router;
