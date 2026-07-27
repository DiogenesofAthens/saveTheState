# Sovereign District — Parcel Covenant Registry

A full-stack proof-of-concept demonstrating a cryptographically secured land covenant registry for county government. Parcel records and covenants are permanently anchored to a distributed ledger, making them tamper-proof and publicly verifiable without relying on any central authority.

---

## Overview

This system provides:

- A **web-based registry** of 50 Marin County, CA parcels with associated land-use covenants
- An **interactive map** showing parcel status at a glance
- A **permanent, immutable audit trail** for every change to every record
- An **Intake Copilot** that converts PDF, DOCX, or TXT covenant documents into source-cited drafts for clerk review
- A **self-guided demo mode** for county officials

---

## System Requirements

Before you begin, your IT department will need to install the following free tools. Each link goes to the official installer:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org) | 20 or newer | Runs the API server and frontend |
| [Git](https://git-scm.com) | Any recent | Downloads the code |

To verify Node.js is installed, open a terminal and run:
```
node --version
```
You should see something like `v20.x.x`.

---

## Project Structure

```
saveTheState/
├── contracts/     Smart contract code (runs on local test network)
├── backend/       API server + database
├── frontend/      Web application
└── README.md      This file
```

---

## Setup Instructions

**Step 1 — Install all dependencies**

Open a terminal, navigate to this folder, and run the following commands one at a time:

```bash
cd contracts
npm install

cd ../backend
npm install

cd ../frontend
npm install
```

---

**Step 2 — Configure the backend**

```bash
cd backend
cp .env.example .env
```

The default `.env` file is pre-configured for local development. No changes are needed to run the demo. The Intake Copilot uses a deterministic sample extractor when `AI_MODEL` is empty. To enable LLM extraction, set `AI_MODEL` to a current Vercel AI Gateway model and provide `AI_GATEWAY_API_KEY` for local development. For production deployment, replace the `DEPLOYER_PRIVATE_KEY` with a securely generated key and update `HARDHAT_NODE_URL` to point to your network.

---

**Step 3 — Start the local test network**

This starts a local simulation of the distributed ledger on your computer. Open a **new terminal window** and keep it running:

```bash
cd contracts
npx hardhat node
```

You should see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Account #0: 0xf39Fd6e51... (10000 ETH)
...
```

> **Note:** This terminal window must stay open while using the application. The test network is local — nothing is transmitted to the internet.

---

**Step 4 — Deploy the registry contract**

In a **second terminal window**:

```bash
cd contracts
npm run deploy:local
```

You should see:
```
Deploying CovenantRegistry with account: 0xf39Fd6e51...
CovenantRegistry deployed to: 0x5FbDB...
Contract info written to backend/contract-address.json
```

---

**Step 5 — Seed the database**

This step populates the registry with 50 Marin County parcels and pre-recorded covenants:

```bash
cd backend
npm run seed
```

Expected output:
```
Connected to chain: http://127.0.0.1:8545
Minting parcels on-chain...
✓✓✓✓✓ (50 parcels)
Seeding covenants...
✓✓✓✓✓ (21 covenants)
Seed complete!
```

---

**Step 6 — Start the API server**

In a **third terminal window**:

```bash
cd backend
npm start
```

You should see:
```
Sovereign District API running on http://localhost:3001
Chain connected: true
```

---

**Step 7 — Start the web application**

In a **fourth terminal window**:

```bash
cd frontend
npm run dev
```

Then open your web browser and go to: **http://localhost:5173**

---

## Demo Walkthrough (5 Steps)

The following walkthrough is designed for county officials. Enable **Demo Mode** using the toggle in the top-right navigation bar to see step-by-step guidance overlaid on the application.

### Step 1 — Search for a Parcel

Click the search bar in the upper-left of the map. Type a parcel number (APN) or street address:
- Try: `154-210-01` (San Rafael commercial parcel)
- Try: `Sausalito` (shows all Sausalito parcels)
- Try: `Housing Density` (shows parcels with that covenant type)

### Step 2 — View a Parcel on the Map

Each dot on the map represents a registered parcel:
- **Gray** = No covenants recorded
- **Blue** = Has active covenants
- **Amber** = Has a covenant flagged for administrative review

Click any dot to open the parcel record panel on the right side of the screen.

### Step 3 — Review Existing Covenants

The right-side panel shows all recorded covenants for the selected parcel. Each card displays:
- The covenant type and legal category
- The plain-English summary of the obligation
- The legal code reference (e.g., CA Gov Code §65583)
- The date recorded and a cryptographic fingerprint
- "Under Review" badge for flagged items

### Step 4 — Add a New Covenant

Click the **"Add Covenant"** button in the parcel panel, then upload a text-based PDF, DOCX, or TXT covenant. You can also click **"Try sample covenant"** for a no-configuration demo.

The Intake Copilot proposes a covenant type, plain-English summary, legal reference, affected APNs, parties, dates, and restrictions. Every suggested core field includes a confidence score and a verbatim source quote. Click **"Apply suggestions to intake form"**, verify or edit the fields, and submit the draft to the clerk review queue. Approval and permanent recording remain separate human actions.

### Step 5 — Examine the Audit Trail

Click **"View Audit Trail"** at the bottom of the parcel panel. This screen shows every change ever made to this parcel in reverse chronological order:
- When the parcel was first registered (with timestamp and block number)
- Each covenant that was added (with the recording address)
- Any covenants that were deactivated

This timeline is sourced directly from the cryptographic record and cannot be altered by any party.

---

## Deploying to Base Sepolia Testnet (Optional)

For a public-facing demo accessible from any browser without running a local network:

1. Create a wallet and fund it with testnet ETH from the [Base Sepolia faucet](https://docs.base.org/docs/tools/network-faucets/)
2. In `backend/.env`, set:
   ```
   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   HARDHAT_NODE_URL=https://sepolia.base.org
   ```
3. Deploy the contract:
   ```bash
   cd contracts
   npm run deploy:baseSepolia
   ```
4. Run the seed script and start the API server as above
5. Audit trail links will point to the live [Base Sepolia block explorer](https://sepolia.basescan.org)

---

## API Reference

The API server runs on `http://localhost:3001`. All endpoints return JSON.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parcels` | List all 50 parcels with covenant counts |
| GET | `/api/parcels/:apn` | Full parcel record with all covenants |
| GET | `/api/parcels/search?q=` | Search by APN, address, or covenant type |
| POST | `/api/intake/analyze` | Analyze a covenant document in memory and return a source-cited review draft |
| POST | `/api/parcels/:apn/covenant` | Record a new covenant |
| GET | `/api/audit/:apn` | Full audit trail for a parcel |
| GET | `/api/health` | System status and connectivity check |

---

## Frequently Asked Questions

**Q: Do I need internet access to run this demo?**
Not for the default demo configuration. The test network, database, API server, web application, and deterministic sample extractor all run locally. Internet access is required only when an administrator enables an AI Gateway model.

**Q: Is any data transmitted to an AI provider or other third party?**
Not in the default demo configuration: when `AI_MODEL` is empty, document analysis stays local and uses a deterministic extractor. If an administrator enables an AI Gateway model, extracted document text is sent to the configured model provider for analysis. The analysis endpoint processes the upload in memory and does not retain the original document. Map tiles still load from OpenStreetMap and Google Fonts loads the Inter typeface.

**Q: What does "cryptographically secured" mean?**
Every covenant is run through a mathematical function that produces a unique fingerprint (hash). If anyone tries to alter the record — even by one character — the fingerprint changes, immediately revealing the tampering. The record also lives in a distributed ledger, meaning no single party controls it.

**Q: Can a covenant be deleted?**
No. This is the core value proposition. Covenants can be *deactivated* (marked as no longer in force), but the original record — including who recorded it and when — is permanently preserved in the audit trail. This creates an unalterable chain of custody.

**Q: Who can add covenants in this system?**
In this prototype, the registry owner account (the county) can add covenants from the web interface. The smart contract supports a granular authorization system where specific addresses can be granted or revoked recording privileges.

---

## Support

For technical support during the evaluation period, contact the Sovereign District team. For issues with Node.js installation, refer to [nodejs.org/en/download](https://nodejs.org/en/download/).
