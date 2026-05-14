const { Router } = require("express");
const crypto = require("crypto");
const db = require("../db");
const chain = require("../chain");

const router = Router();

// GET /api/parcels — list all parcels with covenant counts
router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*,
        COUNT(c.id)                                          AS covenant_count,
        SUM(CASE WHEN c.active = 1 THEN 1 ELSE 0 END)       AS active_covenant_count,
        SUM(CASE WHEN c.flagged = 1 AND c.active = 1 THEN 1 ELSE 0 END) AS flagged_count
       FROM parcels p
       LEFT JOIN covenants c ON c.parcel_apn = p.apn
       GROUP BY p.apn`
    )
    .all();
  res.json(rows);
});

// GET /api/parcels/search?q=... — search by APN, address, or covenant type
router.get("/search", (req, res) => {
  const q = `%${(req.query.q || "").trim()}%`;
  const rows = db
    .prepare(
      `SELECT DISTINCT p.*,
        COUNT(c.id)                                          AS covenant_count,
        SUM(CASE WHEN c.active = 1 THEN 1 ELSE 0 END)       AS active_covenant_count,
        SUM(CASE WHEN c.flagged = 1 AND c.active = 1 THEN 1 ELSE 0 END) AS flagged_count
       FROM parcels p
       LEFT JOIN covenants c ON c.parcel_apn = p.apn
       WHERE p.apn LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR c.covenant_type LIKE ?
       GROUP BY p.apn
       LIMIT 20`
    )
    .all(q, q, q, q);
  res.json(rows);
});

// GET /api/parcels/:apn — parcel detail + covenants
router.get("/:apn", (req, res) => {
  const apn = req.params.apn.toUpperCase();
  const parcel = db.prepare("SELECT * FROM parcels WHERE apn = ?").get(apn);
  if (!parcel) return res.status(404).json({ error: "Parcel not found" });

  const covenants = db
    .prepare("SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC")
    .all(apn);

  res.json({ ...parcel, covenants });
});

async function getSignerAddress() {
  try {
    const w = chain.getWallet();
    return w ? await w.getAddress() : "0x0000000000000000000000000000000000000000";
  } catch {
    return "0x0000000000000000000000000000000000000000";
  }
}

// POST /api/parcels/:apn/covenant — write covenant to chain + cache
router.post("/:apn/covenant", async (req, res) => {
  const apn = req.params.apn.toUpperCase();
  const { covenantType, legalText, legalReference } = req.body;

  if (!covenantType || !legalText) {
    return res.status(400).json({ error: "covenantType and legalText are required" });
  }

  const parcel = db.prepare("SELECT * FROM parcels WHERE apn = ?").get(apn);
  if (!parcel) return res.status(404).json({ error: "Parcel not found" });

  const ipfsHash = crypto
    .createHash("sha256")
    .update(`${apn}:${covenantType}:${legalText}:${Date.now()}`)
    .digest("hex");

  let txHash = null;
  let blockNumber = null;
  let blockTimestamp = new Date().toISOString();

  if (chain.isConnected()) {
    try {
      const contract = chain.getContract();
      const parcelIdOnChain = await contract.apnToId(apn);

      const tx = await contract.addCovenant(
        parcelIdOnChain,
        covenantType,
        legalText,
        ipfsHash
      );
      const receipt = await tx.wait(1);
      txHash = receipt.hash;
      blockNumber = receipt.blockNumber;

      const block = await chain.getProvider().getBlock(blockNumber);
      blockTimestamp = new Date(Number(block.timestamp) * 1000).toISOString();
    } catch (err) {
      console.error("[covenant] Chain write failed:", err.message);
      // Continue with SQLite-only fallback
    }
  }

  // Determine next covenant_index for this parcel
  const maxRow = db
    .prepare("SELECT MAX(covenant_index) AS max FROM covenants WHERE parcel_apn = ?")
    .get(apn);
  const covenantIndex = (maxRow?.max ?? -1) + 1;

  db.prepare(
    `INSERT INTO covenants
       (parcel_apn, covenant_index, covenant_type, legal_text, ipfs_hash, legal_reference,
        creator, tx_hash, block_number, block_timestamp, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    apn,
    covenantIndex,
    covenantType,
    legalText,
    ipfsHash,
    legalReference || null,
    await getSignerAddress(),
    txHash,
    blockNumber,
    blockTimestamp
  );

  // Write audit event
  db.prepare(
    `INSERT INTO audit_events (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
     VALUES (?, 'CovenantAdded', ?, ?, ?, ?, ?)`
  ).run(
    apn,
    blockNumber,
    txHash,
    blockTimestamp,
    await getSignerAddress(),
    JSON.stringify({ covenantIndex, covenantType, ipfsHash })
  );

  const updatedParcel = db.prepare("SELECT * FROM parcels WHERE apn = ?").get(apn);
  const covenants = db
    .prepare("SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC")
    .all(apn);

  res.json({
    success: true,
    txHash,
    blockNumber,
    blockTimestamp,
    ipfsHash,
    parcel: { ...updatedParcel, covenants },
  });
});

module.exports = router;
