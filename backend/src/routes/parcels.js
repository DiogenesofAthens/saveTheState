const { Router } = require("express");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
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

function nowIso() {
  return new Date().toISOString();
}

function sha256Hex(bufferOrString) {
  return crypto.createHash("sha256").update(bufferOrString).digest("hex");
}

function decodeDocument(document = {}) {
  const encoded = document.contentBase64 || "";
  const buffer = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
  return {
    name: document.name || null,
    type: document.type || null,
    size: Number.isFinite(document.size) ? document.size : buffer.length,
    hash: buffer.length ? sha256Hex(buffer) : null,
  };
}

function sanitizeAnalysisMetadata(metadata) {
  if (!metadata || metadata.assisted !== true) return null;
  const confidence = Number(metadata.overallConfidence);
  return {
    assisted: true,
    mode: ["ai", "demo", "fallback"].includes(metadata.mode) ? metadata.mode : "unknown",
    model: typeof metadata.model === "string" ? metadata.model.slice(0, 120) : null,
    overallConfidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    draftApplied: metadata.draftApplied === true,
  };
}

async function addAuditEvent(apn, eventType, {
  blockNumber = null,
  txHash = null,
  blockTimestamp = nowIso(),
  actor = null,
  details = {},
} = {}) {
  const signerAddress = actor || await getSignerAddress();
  await db.run(
    `INSERT INTO audit_events
       (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [apn, eventType, blockNumber, txHash, blockTimestamp, signerAddress, JSON.stringify(details)]
  );
}

async function recordCovenant(apn, {
  covenantType,
  legalText,
  legalReference,
  documentHash,
  submissionId = null,
}) {
  const ipfsHash = documentHash || sha256Hex(`${apn}:${covenantType}:${legalText}:${Date.now()}`);

  let txHash = null;
  let blockNumber = null;
  let blockTimestamp = nowIso();

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

  await addAuditEvent(apn, "CovenantAdded", {
    blockNumber,
    txHash,
    blockTimestamp,
    actor: signerAddress,
    details: { covenantIndex, covenantType, ipfsHash, documentHash: ipfsHash, submissionId },
  });

  const updatedParcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
  const covenants = await db.all(
    "SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC",
    [apn]
  );

  return {
    success: true,
    txHash,
    blockNumber,
    blockTimestamp,
    ipfsHash,
    documentHash: ipfsHash,
    covenantIndex,
    parcel: { ...updatedParcel, covenants },
  };
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

// GET /api/parcels/search?q=&covenant_type= — MUST come before /:apn
router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const covenantType = (req.query.covenant_type || "").trim();
    const likeOp = process.env.DATABASE_URL ? "ILIKE" : "LIKE";

    const conditions = [];
    const params = [];

    if (q) {
      const like = `%${q}%`;
      conditions.push(`(p.apn ${likeOp} ? OR p.address ${likeOp} ? OR p.city ${likeOp} ? OR c.covenant_type ${likeOp} ?)`);
      params.push(like, like, like, like);
    }

    if (covenantType) {
      conditions.push(`c.covenant_type = ?`);
      params.push(covenantType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await db.all(
      `SELECT p.*,
         COUNT(c.id)                                                       AS covenant_count,
         SUM(CASE WHEN c.active = 1 THEN 1 ELSE 0 END)                   AS active_covenant_count,
         SUM(CASE WHEN c.flagged = 1 AND c.active = 1 THEN 1 ELSE 0 END) AS flagged_count
       FROM parcels p
       LEFT JOIN covenants c ON c.parcel_apn = p.apn
       ${where}
       GROUP BY p.id, p.apn, p.parcel_id, p.address, p.city, p.state,
                p.zip, p.owner_type, p.acreage, p.zoning, p.lat, p.lng,
                p.on_chain, p.minted_at, p.minted_by, p.created_at
       LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/parcels/:apn/submissions — county clerk review queue for a parcel
router.get("/:apn/submissions", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const parcel = await db.get("SELECT apn FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    const submissions = await db.all(
      "SELECT * FROM covenant_submissions WHERE parcel_apn = ? ORDER BY created_at DESC, id DESC",
      [apn]
    );
    res.json({ apn, submissions });
  } catch (err) { next(err); }
});

// POST /api/parcels/:apn/submissions — submit a covenant for clerk review
router.post("/:apn/submissions", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const {
      covenantType,
      legalText,
      legalReference,
      submitterName,
      submitterType,
      document,
      analysisMetadata,
    } = req.body;

    if (!covenantType || !legalText) {
      return res.status(400).json({ error: "covenantType and legalText are required" });
    }

    const parcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    const decodedDocument = decodeDocument(document);
    const intakeAssistance = sanitizeAnalysisMetadata(analysisMetadata);
    const documentHash = decodedDocument.hash || sha256Hex(`${apn}:${covenantType}:${legalText}:${legalReference || ""}`);
    const submittedAt = nowIso();

    await db.run(
      `INSERT INTO covenant_submissions
         (parcel_apn, status, covenant_type, legal_text, legal_reference,
          submitter_name, submitter_type, document_name, document_type, document_size,
          document_hash, submitted_at, updated_at)
       VALUES (?, 'Submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [apn, covenantType, legalText.trim(), legalReference || null,
       submitterName || "Public Submitter", submitterType || "Public",
       decodedDocument.name, decodedDocument.type, decodedDocument.size,
       documentHash, submittedAt, submittedAt]
    );

    const submission = await db.get(
      `SELECT * FROM covenant_submissions
       WHERE parcel_apn = ? AND document_hash = ? AND submitted_at = ?
       ORDER BY id DESC LIMIT 1`,
      [apn, documentHash, submittedAt]
    );

    await addAuditEvent(apn, "CovenantSubmitted", {
      blockTimestamp: submittedAt,
      actor: submitterName || "Public Submitter",
      details: {
        submissionId: submission.id,
        covenantType,
        documentHash,
        documentName: decodedDocument.name,
        status: "Submitted",
        intakeAssistance,
      },
    });

    res.status(201).json({ success: true, submission });
  } catch (err) { next(err); }
});

// POST /api/parcels/:apn/submissions/:id/review — approve or reject intake
router.post("/:apn/submissions/:id/review", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const id = Number(req.params.id);
    const { action, reviewerName, rejectionReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action must be approve or reject" });
    }

    const submission = await db.get(
      "SELECT * FROM covenant_submissions WHERE id = ? AND parcel_apn = ?",
      [id, apn]
    );
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status === "Recorded") {
      return res.status(409).json({ error: "Recorded submissions cannot be changed" });
    }

    const nextStatus = action === "approve" ? "Approved" : "Rejected";
    const reviewedAt = nowIso();
    await db.run(
      `UPDATE covenant_submissions
       SET status = ?, reviewer_name = ?, rejection_reason = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ? AND parcel_apn = ?`,
      [nextStatus, reviewerName || "County Clerk",
       action === "reject" ? (rejectionReason || "Rejected during clerk review") : null,
       reviewedAt, reviewedAt, id, apn]
    );

    const updated = await db.get(
      "SELECT * FROM covenant_submissions WHERE id = ? AND parcel_apn = ?",
      [id, apn]
    );

    await addAuditEvent(apn, action === "approve" ? "CovenantApproved" : "CovenantRejected", {
      blockTimestamp: reviewedAt,
      actor: reviewerName || "County Clerk",
      details: {
        submissionId: id,
        covenantType: updated.covenant_type,
        documentHash: updated.document_hash,
        status: nextStatus,
        rejectionReason: updated.rejection_reason,
      },
    });

    res.json({ success: true, submission: updated });
  } catch (err) { next(err); }
});

// POST /api/parcels/:apn/submissions/:id/record — append approved submission to the secure registry
router.post("/:apn/submissions/:id/record", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const id = Number(req.params.id);
    const { recorderName } = req.body;

    const submission = await db.get(
      "SELECT * FROM covenant_submissions WHERE id = ? AND parcel_apn = ?",
      [id, apn]
    );
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "Approved") {
      return res.status(409).json({ error: "Only approved submissions can be recorded" });
    }

    const result = await recordCovenant(apn, {
      covenantType: submission.covenant_type,
      legalText: submission.legal_text,
      legalReference: submission.legal_reference,
      documentHash: submission.document_hash,
      submissionId: submission.id,
    });

    const recordedAt = result.blockTimestamp || nowIso();
    await db.run(
      `UPDATE covenant_submissions
       SET status = 'Recorded', recorder_name = ?, tx_hash = ?, block_number = ?,
           recorded_at = ?, updated_at = ?
       WHERE id = ? AND parcel_apn = ?`,
      [recorderName || "County Recorder", result.txHash, result.blockNumber,
       recordedAt, recordedAt, id, apn]
    );

    const updated = await db.get(
      "SELECT * FROM covenant_submissions WHERE id = ? AND parcel_apn = ?",
      [id, apn]
    );

    res.json({ ...result, submission: updated });
  } catch (err) { next(err); }
});

// GET /api/parcels/:apn/export.pdf — full covenant record as PDF
router.get("/:apn/export.pdf", async (req, res, next) => {
  try {
    const apn = req.params.apn.toUpperCase();
    const parcel = await db.get("SELECT * FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    const [covenants, events] = await Promise.all([
      db.all("SELECT * FROM covenants WHERE parcel_apn = ? ORDER BY covenant_index ASC", [apn]),
      db.all("SELECT * FROM audit_events WHERE parcel_apn = ? ORDER BY block_number ASC, id ASC", [apn]),
    ]);

    const filename = `covenant-${apn.replace(/[^A-Z0-9]/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      size: "LETTER",
      margin: 60,
      info: {
        Title: `Covenant Record — ${apn}`,
        Author: "Sovereign District Parcel Covenant Registry",
        Subject: "Parcel Covenant Export",
        CreationDate: new Date(),
      },
    });
    doc.pipe(res);

    const L = 60;
    const W = doc.page.width - 120;
    const NAVY  = "#1B2A4A";
    const SLATE = "#4A6FA5";
    const GRAY  = "#6B7280";

    function fmt(ts, style = "long") {
      if (!ts) return null;
      const opts = style === "long"
        ? { year: "numeric", month: "long",  day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" };
      try { return new Date(ts).toLocaleDateString("en-US", opts); } catch { return ts; }
    }

    function shortHash(h) {
      return h ? `${h.slice(0, 10)}...${h.slice(-8)}` : null;
    }

    function divider(color = "#E5E7EB", weight = 0.4) {
      doc.moveDown(0.4);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(color).lineWidth(weight).stroke();
      doc.moveDown(0.6);
    }

    function sectionTitle(text) {
      doc.moveDown(0.6);
      doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(8)
         .text(text, L, doc.y, { characterSpacing: 1.2, width: W });
      doc.moveDown(0.4);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor("#9CA3AF").lineWidth(0.4).stroke();
      doc.moveDown(0.7);
    }

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 76).fill(NAVY);

    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(17)
       .text("SOVEREIGN DISTRICT", L, 16, { width: W });
    doc.fillColor("#93C5FD").font("Helvetica").fontSize(8)
       .text("PARCEL COVENANT REGISTRY", L, 38, { characterSpacing: 1.5, width: W });

    const genDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.fillColor("#BFDBFE").font("Helvetica").fontSize(7)
       .text(`Generated ${genDate}  ·  Public Record`, L, 38, { width: W, align: "right" });
    doc.fillColor("#DBEAFE").font("Helvetica-Bold").fontSize(7)
       .text("COVENANT RECORD EXPORT", L, 27, { width: W, align: "right", characterSpacing: 0.8 });

    // ── Parcel identity ───────────────────────────────────────────────────
    doc.y = 92;

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(22).text(apn, L, doc.y);
    doc.moveDown(0.25);
    doc.fillColor("#374151").font("Helvetica").fontSize(11)
       .text(`${parcel.address}, ${parcel.city}, CA ${parcel.zip}`);
    doc.moveDown(0.3);

    const metaParts = [
      parcel.owner_type && (parcel.owner_type[0].toUpperCase() + parcel.owner_type.slice(1)),
      parcel.zoning    && `Zone ${parcel.zoning}`,
      parcel.acreage   && `${parcel.acreage} ac`,
    ].filter(Boolean);
    if (metaParts.length) {
      doc.fillColor(GRAY).font("Helvetica").fontSize(9).text(metaParts.join("  ·  "));
    }
    doc.moveDown(0.5);

    const chainLabel = parcel.on_chain ? "On-Chain Verified" : "Registry Record (off-chain)";
    const chainColor = parcel.on_chain ? "#10B981" : GRAY;
    const dotY = doc.y;
    doc.circle(L + 4, dotY + 4, 3).fill(chainColor);
    doc.fillColor(chainColor).font("Helvetica-Bold").fontSize(8).text(chainLabel, L + 11, dotY);
    doc.y = dotY + 14;

    divider("#D1D5DB", 0.6);

    // ── Covenants ─────────────────────────────────────────────────────────
    sectionTitle(`COVENANT RECORDS  (${covenants.length})`);

    if (covenants.length === 0) {
      doc.fillColor("#9CA3AF").font("Helvetica-Oblique").fontSize(9)
         .text("No covenants recorded for this parcel.", L, doc.y);
      doc.moveDown(1);
    }

    for (const c of covenants) {
      doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(10).text(c.covenant_type, L, doc.y);
      doc.moveDown(0.2);

      if (c.flagged) {
        doc.fillColor("#D97706").font("Helvetica-Bold").fontSize(7)
           .text("[!]  FLAGGED FOR ADMINISTRATIVE REVIEW", L + 8, doc.y);
        doc.moveDown(0.2);
      }

      const metaLine = [
        fmt(c.block_timestamp) && `Recorded ${fmt(c.block_timestamp)}`,
        c.block_number && `Block #${Number(c.block_number).toLocaleString()}`,
        shortHash(c.tx_hash) && `TX: ${shortHash(c.tx_hash)}`,
      ].filter(Boolean).join("  ·  ");
      if (metaLine) {
        doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(metaLine, L + 8, doc.y);
        doc.moveDown(0.2);
      }

      if (c.legal_reference) {
        doc.fillColor(GRAY).font("Helvetica").fontSize(8)
           .text(`Legal Reference: ${c.legal_reference}`, L + 8, doc.y);
        doc.moveDown(0.2);
      }

      if (c.ipfs_hash) {
        doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7)
           .text(`Content hash: ${c.ipfs_hash}`, L + 8, doc.y, { width: W - 8 });
        doc.moveDown(0.25);
      }

      if (c.legal_text) {
        doc.fillColor("#374151").font("Helvetica").fontSize(9)
           .text(c.legal_text, L + 8, doc.y, { width: W - 8, lineGap: 2 });
      }

      doc.moveDown(0.8);
      doc.moveTo(L + 8, doc.y - 4).lineTo(L + W, doc.y - 4)
         .strokeColor("#E5E7EB").lineWidth(0.3).stroke();
      doc.moveDown(0.4);
    }

    // ── Audit trail ───────────────────────────────────────────────────────
    sectionTitle(`AUDIT TRAIL  (${events.length} events)`);

    const EVENT_LABELS = {
      ParcelMinted:         "Parcel Registered",
      CovenantSubmitted:    "Submission Received",
      CovenantApproved:     "Submission Approved",
      CovenantRejected:     "Submission Rejected",
      CovenantAdded:        "Covenant Added",
      CovenantDeactivated:  "Covenant Deactivated",
    };

    if (events.length === 0) {
      doc.fillColor("#9CA3AF").font("Helvetica-Oblique").fontSize(9).text("No audit events.");
    }

    for (const ev of events) {
      const label = EVENT_LABELS[ev.event_type] || ev.event_type;
      doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(9).text(label, L, doc.y);
      doc.moveDown(0.15);

      const evParts = [
        fmt(ev.block_timestamp, "short"),
        ev.block_number && `Block #${Number(ev.block_number).toLocaleString()}`,
        shortHash(ev.tx_hash) && `TX: ${shortHash(ev.tx_hash)}`,
        ev.actor && ev.actor !== "0x0000000000000000000000000000000000000000"
          && `By: ${ev.actor.slice(0, 8)}...${ev.actor.slice(-4)}`,
      ].filter(Boolean).join("  ·  ");
      doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(evParts, L + 8, doc.y, { width: W - 8 });
      doc.moveDown(0.6);
    }

    // ── Footer ────────────────────────────────────────────────────────────
    doc.moveDown(1);
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
    doc.moveDown(0.7);
    doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7).text(
      "This document was generated by the Sovereign District Parcel Covenant Registry. " +
      "Records are cryptographically secured and tamper-proof. " +
      "The on-chain record is authoritative; this export is for reference purposes only.",
      L, doc.y, { width: W, align: "center", lineGap: 2 }
    );

    doc.end();
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

    const result = await recordCovenant(apn, { covenantType, legalText, legalReference });
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
