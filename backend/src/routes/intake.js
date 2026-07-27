const { Router } = require("express");
const db = require("../db");
const {
  IntakeDocumentError,
  analyzeCovenantDocument,
} = require("../services/covenant-intake");

const router = Router();

// POST /api/intake/analyze — parse a covenant document and return a source-grounded draft.
// The document is processed in memory and is not stored by this endpoint.
router.post("/analyze", async (req, res, next) => {
  try {
    const apn = String(req.body?.apn || "").trim().toUpperCase();
    if (!apn) return res.status(400).json({ error: "apn is required" });

    const parcel = await db.get("SELECT apn, address, city, state, zip FROM parcels WHERE apn = ?", [apn]);
    if (!parcel) return res.status(404).json({ error: "Parcel not found" });

    const result = await analyzeCovenantDocument(req.body?.document, parcel);
    res.json(result);
  } catch (error) {
    if (error instanceof IntakeDocumentError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
