const { Router } = require("express");
const db = require("../db");
const chain = require("../chain");

const router = Router();

router.get("/:apn", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const parcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    if (chain.isConnected()) {
      try { await syncAuditEvents(apn, parcel.parcel_id); }
      catch (err) { console.warn("[audit] Chain sync failed:", err.message); }
    }

    const events = await db.all(
      "SELECT * FROM audit_events WHERE parcel_apn = ? ORDER BY block_number DESC, id DESC",
      [apn]
    );
    res.json({ apn, events });
  } catch (err) { next(err); }
});

async function syncAuditEvents(apn, parcelIdHex) {
  const contract = chain.getContract();
  const provider = chain.getProvider();
  if (!contract || !provider) return;

  const parcelId = BigInt(parcelIdHex);
  const [mintLogs, addLogs, deactivateLogs] = await Promise.all([
    contract.queryFilter(contract.filters.ParcelMinted(parcelId)),
    contract.queryFilter(contract.filters.CovenantAdded(parcelId)),
    contract.queryFilter(contract.filters.CovenantDeactivated(parcelId)),
  ]);

  const allLogs = [
    ...mintLogs.map((l) => ({ ...l, eventType: "ParcelMinted" })),
    ...addLogs.map((l) => ({ ...l, eventType: "CovenantAdded" })),
    ...deactivateLogs.map((l) => ({ ...l, eventType: "CovenantDeactivated" })),
  ];

  for (const log of allLogs) {
    const existing = await db.get(
      "SELECT id FROM audit_events WHERE tx_hash = ? AND event_type = ?",
      [log.transactionHash, log.eventType]
    );
    if (existing) continue;

    let block;
    try { block = await provider.getBlock(log.blockNumber); } catch { block = null; }

    const ts = block ? new Date(Number(block.timestamp) * 1000).toISOString() : null;
    let actor = "0x0000000000000000000000000000000000000000";
    let details = {};

    if (log.eventType === "ParcelMinted") {
      actor = log.args[2] || actor;
      details = { apn: log.args[1] };
    } else if (log.eventType === "CovenantAdded") {
      actor = log.args[3] || actor;
      details = { covenantIndex: log.args[1]?.toString(), covenantType: log.args[2] };
    } else if (log.eventType === "CovenantDeactivated") {
      actor = log.args[2] || actor;
      details = { covenantIndex: log.args[1]?.toString() };
    }

    await db.run(
      `INSERT INTO audit_events
         (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [apn, log.eventType, log.blockNumber, log.transactionHash, ts, actor,
       JSON.stringify(details)]
    );
  }
}

module.exports = router;
