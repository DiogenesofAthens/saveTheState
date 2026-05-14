const { Router } = require("express");
const crypto = require("crypto");
const db = require("../db");
const chain = require("../chain");

const router = Router();

async function getSignerAddress() {
  try {
    const w = chain.getWallet();
    return w ? await w.getAddress() : "0x0000000000000000000000000000000000000000";
  } catch {
    return "0x0000000000000000000000000000000000000000";
  }
}

// GET /api/parcels — list all parcels with covenant counts
router.get("/", async (_req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT p.*,
         COUNT(c.id)                                                       AS covenant_count,
         SUM(CASE WHEN c.active = 1 THEN 1 ELSE 0 END)                   AS active_covenant_count,
         SUM(CASE WHEN c.flagged = 1 AND c.active = 1 THEN 1 ELSE 0 END) AS flagged_count
       FROM parcels p
       LEFT JOIN covenants c ON c.parcel_apn = p.apn
       GROUP BY p.id, p.apn, p.parcel_id, p.address, p.city, p.state,
                p.zip, p.owner_type, p.acreage, p.zoning, p.lat, p.lng,
                p.on_chain, p.minted_at, p.minted_by, p.created_at`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/parcels/search?q=... — MUST come before /:apn
router.get("/search", async (req, res, next) => {
  try {
    const q = `%${(req.query.q || "").trim()}%`;
    // ILIKE for Postgres case-insensitive search; SQLite LIKE is already case-insensitive for ASCII
    const likeOp = process.env.DATABASE_URL ? "ILIKE" : "LIKE";
    const rows = await db.all(
      `SELECT p.*,
         COUNT(c.id)                                                       AS covenant_count,
         SUM(CASE WHEN c.active = 1 THEN 1 ELSE 0 END)                   AS active_covenant_count,
         SUM(CASE WHEN c.flagged = 1 AND c.active = 1 THEN 1 ELSE 0 END) AS flagged_count
       FROM parcels p
       LEFT JOIN covenants c ON c.parcel_apn = p.apn
       WHERE p.apn ${likeOp} ? OR p.address ${likeOp} ? OR p.city ${likeOp} ? OR c.covenant_type ${likeOp} ?
       GROUP BY p.id, p.apn, p.parcel_id, p.address, p.city, p.state,
                p.zip, p.owner_type, p.acreage, p.zoning, p.lat, p.lng,
                p.on_chain, p.minted_at, p.minted_by, p.created_at
       LIMIT 20`,
      [q, q, q, q]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/parcels/:apn — parcel detail + covenants
router.get("/:apn", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const parcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    const covenants = await db.all(
      "SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC",
      [apn]
    );
    res.json({ ...parcel, covenants });
  } catch (err) { next(err); }
});

// POST /api/parcels/:apn/covenant — write to chain + cache
router.post("/:apn/covenant", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const { covenantType, legalText, legalReference } = req.body;

    if (!covenantType || !legalText) {
      return res.status(400).json({ error: "covenantType and legalText are required" });
    }

    const parcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
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
        const tx = await contract.addCovenant(parcelIdOnChain, covenantType, legalText, ipfsHash);
        const receipt = await tx.wait(1);
        txHash = receipt.hash;
        blockNumber = receipt.blockNumber;
        const block = await chain.getProvider().getBlock(blockNumber);
        blockTimestamp = new Date(Number(block.timestamp) * 1000).toISOString();
      } catch (err) {
        console.error("[covenant] Chain write failed:", err.message);
      }
    }

    const maxRow = await db.get(
      "SELECT MAX(covenant_index) AS max FROM covenants WHERE parcel_apn = ?",
      [apn]
    );
    const covenantIndex = (maxRow?.max ?? -1) + 1;
    const signerAddress = await getSignerAddress();

    await db.run(
      `INSERT INTO covenants
         (parcel_apn, covenant_index, covenant_type, legal_text, ipfs_hash, legal_reference,
          creator, tx_hash, block_number, block_timestamp, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [apn, covenantIndex, covenantType, legalText, ipfsHash,
       legalReference || null, signerAddress, txHash, blockNumber, blockTimestamp]
    );

    await db.run(
      `INSERT INTO audit_events
         (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
       VALUES (?, 'CovenantAdded', ?, ?, ?, ?, ?)`,
      [apn, blockNumber, txHash, blockTimestamp, signerAddress,
       JSON.stringify({ covenantIndex, covenantType, ipfsHash })]
    );

    const updatedParcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
    const covenants = await db.all(
      "SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC",
      [apn]
    );

    res.json({ success: true, txHash, blockNumber, blockTimestamp, ipfsHash,
               parcel: { ...updatedParcel, covenants } });
  } catch (err) { next(err); }
});

module.exports = router;
