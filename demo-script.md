# Sovereign District — Demo Script

**URL:** https://save-the-state.vercel.app
**Time:** ~8 minutes
**Audience:** County staff / elected officials

---

## Before You Start

- Open the URL in Chrome, full-screen
- No login needed, no wallet, nothing to install
- The **Demo Mode** toggle is in the top-right — leave it **off** for a natural walkthrough; flip it **on** if you want the guided step cards

---

## Scene 1 — First Impression (30 sec)

**What they see:** Deep navy header, map of Marin County covered in colored dots.

> "This is the Parcel Covenant Registry for Marin County. Every dot on this map is a parcel. Blue means there are active covenants on record. Amber means something has been flagged for administrative review."

**Click:** The `ⓘ` icon next to "Public Registry" in the top-right header.

> "The records in this system are cryptographically secured — once something is written, not even the county can alter it. That's what gives this its legal weight."

**Click anywhere** to close the tooltip.

---

## Scene 2 — Search (45 sec)

**Click:** The search box in the **top-left corner of the map** (overlaid on the map, not in the navbar).

**Type:** `4th St`

> "Staff can search by address or by APN — Assessor Parcel Number. Results come back instantly."

**Click** one of the blue results that appears in the dropdown. The right panel slides in.

---

## Scene 3 — Parcel Detail Panel (1.5 min)

**What they see:** Right panel slides in from the right. Dark navy header shows the APN in large bold type, address below it. Below that: a colored badge (Residential/Commercial), zone, acreage. Then three stat boxes: Total Covenants / Active / Flagged.

> "This is the full record for that parcel. APN, address, zoning, acreage — all the standard assessor fields. And here you can see the covenants at a glance."

Point at the stat boxes.

> "Three active covenants, zero flagged. Let's look at one of those covenants."

**Scroll down** in the right panel to see the covenant cards. Each card shows the covenant type, a legal summary, date, and a hash.

> "Each covenant has a permanent cryptographic fingerprint — that hash at the bottom. If anyone tries to tamper with the record later, the hash won't match."

**Close** the panel by clicking the `×` in the panel's top-right corner.

---

## Scene 4 — The Flagged Parcel (1 min)

**Click** an **amber dot** on the map (look for the orange-yellow dots — there are 3 flagged parcels scattered around the county).

**What they see:** Same panel layout, but with an amber warning banner below the stats: *"X covenant(s) on this parcel are flagged for administrative review."*

> "This parcel has something flagged. Maybe the covenant terms are under dispute, maybe there's a pending review. The flag surfaces it on the map immediately so staff don't have to go hunting."

---

## Scene 5 — Add a Covenant (2 min)

Stay on any open parcel panel (or click any dot to open one).

**Click:** The **"Add Covenant" button** — dark navy, top-right of the Covenant Records section, with a `+` icon.

**What they see:** A modal dialog slides up over a blurred background. Header shows "Record New Covenant" with the APN and address.

> "This is where a county clerk or authorized staff member would record a new covenant."

**Click** the **"Covenant Type" dropdown** and select **"Conservation Easement"** (or any type).

> "We have the standard Marin County covenant types pre-loaded — density floors, transit corridor restrictions, water rights, easements."

**Click** the **large text area** labeled "Plain-English Summary" and type:

> `Property owner agrees to maintain natural riparian buffer of 50 feet from all creek centerlines. No impervious surface permitted within buffer zone.`

> "Staff writes it in plain language. No legal Latin required."

Optionally **click** the Legal Reference field and type: `CA Water Code §1600`

Point at the **blue notice box** at the bottom of the form.

> "This is the key part — once you click Record, that's it. The original entry is permanent. Deactivation is possible if a covenant lapses, but the original record stays in the audit trail forever."

**Click:** **"Record to Secure Registry"** (large dark navy button, full width, bottom of modal). It will spin briefly.

**What they see:** Green checkmark screen showing Transaction Hash, Block Number, Record Hash, and timestamp.

> "Done. That record is now anchored. The transaction hash is the proof — it ties this covenant to a specific block in the public record. Anyone can verify it independently."

**Click:** **"View Updated Record"** to dismiss the modal. The new covenant now appears at the top of the parcel's covenant list.

---

## Scene 6 — Audit Trail (1 min)

Still on the same parcel panel.

**Click:** **"View Audit Trail"** — the full-width button at the very bottom of the panel, with a clock icon and "Tamper-proof history" label on the right.

**What they see:** Panel header changes to "Immutable Audit Trail." A blue shield notice reads: *"Every entry below is sourced directly from the cryptographic record."* Below that, a vertical timeline.

> "This is the complete, uneditable history of this parcel — going back to when it was first registered. Every covenant added, every deactivation, block number and timestamp for each."

Point at the timeline entries.

> "Parcel Registered at block 1. Conservation Easement added just now. This is what you'd hand to a title company, an attorney, or a court. It's the authoritative record."

**Click** the `←` back arrow to return to the parcel detail.

---

## Scene 7 — Close Out (30 sec)

**Click** the `×` to close the parcel panel. Map returns to full view.

> "The map updates in real time. If we'd added that covenant to a parcel that had none before, its dot would now be blue. Every clerk in the county is looking at the same live map."

Optional — **flip on Demo Mode** in the top-right toggle to show the guided step cards, if anyone wants to explore on their own afterward.

---

## Q&A Talking Points

| Question | Answer |
|---|---|
| "Who can add covenants?" | Right now the backend signs with a deployer key — production would use role-based auth tied to county SSO |
| "What if we need to remove a covenant?" | Deactivation removes it from active display but the original entry is permanently in the audit trail |
| "Does this replace our existing database?" | No — it sits on top. SQLite caches everything; the chain is the verification layer |
| "What does it cost to record?" | On Base Sepolia testnet, effectively zero. Production gas fees on Base L2 are fractions of a cent |
| "Is the data public?" | The registry is public-read, write-restricted. Same model as a county recorder's office |
