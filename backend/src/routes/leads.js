/**
 * Lead capture — POST /api/leads
 * Accepts { email, county } and notifies the owner via Resend.
 * When RESEND_API_KEY is unset, logs and returns ok so the form
 * works in local dev.
 */
const express = require("express");

const router = express.Router();

const NOTIFY_EMAIL = "kwessman@gmail.com";
const FROM_ADDRESS = "Sovereign District <onboarding@resend.dev>";

router.post("/", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const county = String(req.body?.county || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[leads] DEV — would capture lead: ${email} (${county || "n/a"})`);
    return res.json({ ok: true });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: NOTIFY_EMAIL,
        subject: `New Sovereign District demo request: ${email}`,
        html:
          `<div style="font-family:sans-serif;max-width:480px;">` +
          `<h2>New Covenant Registry Demo Request</h2>` +
          `<p><strong>${email}</strong></p>` +
          (county ? `<p>County / organization: ${county}</p>` : "") +
          `</div>`,
      }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[leads] Resend error:", err.message);
    return res.status(500).json({ error: "Failed to submit. Please try again." });
  }
});

module.exports = router;
