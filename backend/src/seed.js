/**
 * Seed script: mints 50 Marin County parcels on-chain and populates SQLite.
 * Run: npm run seed (from the backend/ directory)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ethers } = require("ethers");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db");

// ---------------------------------------------------------------------------
// Parcel data — 50 fabricated but realistic Marin County APNs/addresses
// ---------------------------------------------------------------------------
const PARCELS = [
  // San Rafael (15)
  { apn: "154-210-01", address: "1000 4th St",        city: "San Rafael", zip: "94901", ownerType: "commercial",   lat: 37.9745, lng: -122.5310, acreage: 0.45, zoning: "C-1" },
  { apn: "154-210-02", address: "1025 4th St",        city: "San Rafael", zip: "94901", ownerType: "commercial",   lat: 37.9741, lng: -122.5318, acreage: 0.32, zoning: "C-1" },
  { apn: "154-211-03", address: "37 Mission Ave",     city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9755, lng: -122.5295, acreage: 0.18, zoning: "R-1" },
  { apn: "154-211-04", address: "85 Mission Ave",     city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9758, lng: -122.5288, acreage: 0.21, zoning: "R-1" },
  { apn: "154-212-05", address: "200 3rd St",         city: "San Rafael", zip: "94901", ownerType: "commercial",   lat: 37.9748, lng: -122.5325, acreage: 0.60, zoning: "C-2" },
  { apn: "154-212-06", address: "450 3rd St",         city: "San Rafael", zip: "94901", ownerType: "industrial",   lat: 37.9750, lng: -122.5332, acreage: 1.20, zoning: "I-1" },
  { apn: "154-213-07", address: "120 Lincoln Ave",    city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9760, lng: -122.5302, acreage: 0.15, zoning: "R-2" },
  { apn: "154-213-08", address: "340 Lincoln Ave",    city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9763, lng: -122.5297, acreage: 0.22, zoning: "R-2" },
  { apn: "154-214-09", address: "600 B St",           city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9735, lng: -122.5290, acreage: 0.19, zoning: "R-1" },
  { apn: "154-214-10", address: "750 B St",           city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9738, lng: -122.5285, acreage: 0.17, zoning: "R-1" },
  { apn: "154-215-11", address: "91 Tamalpais Ave",   city: "San Rafael", zip: "94901", ownerType: "commercial",   lat: 37.9730, lng: -122.5315, acreage: 0.55, zoning: "C-1" },
  { apn: "154-215-12", address: "200 Tamalpais Ave",  city: "San Rafael", zip: "94901", ownerType: "residential",  lat: 37.9728, lng: -122.5320, acreage: 0.14, zoning: "R-1" },
  { apn: "154-216-13", address: "50 Knight Dr",       city: "San Rafael", zip: "94901", ownerType: "industrial",   lat: 37.9720, lng: -122.5275, acreage: 2.50, zoning: "I-2" },
  { apn: "154-216-14", address: "180 Knight Dr",      city: "San Rafael", zip: "94901", ownerType: "industrial",   lat: 37.9718, lng: -122.5270, acreage: 1.80, zoning: "I-2" },
  { apn: "154-217-15", address: "501 Grand Ave",      city: "San Rafael", zip: "94901", ownerType: "commercial",   lat: 37.9725, lng: -122.5308, acreage: 0.78, zoning: "C-2" },

  // Mill Valley (8)
  { apn: "054-180-01", address: "220 Throckmorton Ave", city: "Mill Valley", zip: "94941", ownerType: "commercial",  lat: 37.9062, lng: -122.5445, acreage: 0.38, zoning: "C-1" },
  { apn: "054-180-02", address: "380 Throckmorton Ave", city: "Mill Valley", zip: "94941", ownerType: "residential", lat: 37.9065, lng: -122.5450, acreage: 0.25, zoning: "R-1" },
  { apn: "054-181-03", address: "100 Miller Ave",        city: "Mill Valley", zip: "94941", ownerType: "commercial",  lat: 37.9058, lng: -122.5440, acreage: 0.42, zoning: "C-1" },
  { apn: "054-181-04", address: "45 Locust Ave",         city: "Mill Valley", zip: "94941", ownerType: "residential", lat: 37.9055, lng: -122.5435, acreage: 0.30, zoning: "R-2" },
  { apn: "054-182-05", address: "12 Cascade Dr",         city: "Mill Valley", zip: "94941", ownerType: "residential", lat: 37.9070, lng: -122.5462, acreage: 0.35, zoning: "R-1" },
  { apn: "054-182-06", address: "200 Sycamore Ave",      city: "Mill Valley", zip: "94941", ownerType: "residential", lat: 37.9075, lng: -122.5455, acreage: 0.28, zoning: "R-1" },
  { apn: "054-183-07", address: "8 Willow St",           city: "Mill Valley", zip: "94941", ownerType: "residential", lat: 37.9048, lng: -122.5430, acreage: 0.20, zoning: "R-1" },
  { apn: "054-183-08", address: "500 E Blithedale Ave",  city: "Mill Valley", zip: "94941", ownerType: "commercial",  lat: 37.9042, lng: -122.5420, acreage: 0.65, zoning: "C-2" },

  // Sausalito (6)
  { apn: "034-160-01", address: "100 Bridgeway",     city: "Sausalito", zip: "94965", ownerType: "commercial",  lat: 37.8595, lng: -122.4855, acreage: 0.25, zoning: "C-1" },
  { apn: "034-160-02", address: "280 Bridgeway",     city: "Sausalito", zip: "94965", ownerType: "commercial",  lat: 37.8588, lng: -122.4850, acreage: 0.30, zoning: "C-1" },
  { apn: "034-161-03", address: "50 Princess St",    city: "Sausalito", zip: "94965", ownerType: "residential", lat: 37.8600, lng: -122.4858, acreage: 0.18, zoning: "R-1" },
  { apn: "034-161-04", address: "15 Turney St",      city: "Sausalito", zip: "94965", ownerType: "residential", lat: 37.8605, lng: -122.4862, acreage: 0.15, zoning: "R-1" },
  { apn: "034-162-05", address: "300 Bulkley Ave",   city: "Sausalito", zip: "94965", ownerType: "residential", lat: 37.8610, lng: -122.4868, acreage: 0.22, zoning: "R-2" },
  { apn: "034-162-06", address: "420 Caledonia St",  city: "Sausalito", zip: "94965", ownerType: "commercial",  lat: 37.8583, lng: -122.4845, acreage: 0.48, zoning: "C-2" },

  // Corte Madera (5)
  { apn: "074-170-01", address: "300 Tamalpais Dr",     city: "Corte Madera", zip: "94925", ownerType: "residential", lat: 37.9260, lng: -122.5140, acreage: 0.35, zoning: "R-1" },
  { apn: "074-170-02", address: "45 Meadowsweet Dr",    city: "Corte Madera", zip: "94925", ownerType: "residential", lat: 37.9265, lng: -122.5145, acreage: 0.28, zoning: "R-1" },
  { apn: "074-171-03", address: "200 Corte Madera Ave", city: "Corte Madera", zip: "94925", ownerType: "commercial",  lat: 37.9255, lng: -122.5135, acreage: 0.55, zoning: "C-1" },
  { apn: "074-171-04", address: "101 Lucky Dr",         city: "Corte Madera", zip: "94925", ownerType: "commercial",  lat: 37.9250, lng: -122.5130, acreage: 1.20, zoning: "C-2" },
  { apn: "074-172-05", address: "500 Wornum Dr",        city: "Corte Madera", zip: "94925", ownerType: "industrial",  lat: 37.9248, lng: -122.5125, acreage: 2.10, zoning: "I-1" },

  // Larkspur (4)
  { apn: "094-190-01", address: "400 Magnolia Ave", city: "Larkspur", zip: "94939", ownerType: "commercial",  lat: 37.9352, lng: -122.5340, acreage: 0.42, zoning: "C-1" },
  { apn: "094-190-02", address: "100 Ward St",      city: "Larkspur", zip: "94939", ownerType: "residential", lat: 37.9355, lng: -122.5347, acreage: 0.20, zoning: "R-1" },
  { apn: "094-191-03", address: "250 Doherty Dr",   city: "Larkspur", zip: "94939", ownerType: "commercial",  lat: 37.9348, lng: -122.5335, acreage: 0.75, zoning: "C-2" },
  { apn: "094-191-04", address: "15 William Ave",   city: "Larkspur", zip: "94939", ownerType: "residential", lat: 37.9358, lng: -122.5352, acreage: 0.18, zoning: "R-2" },

  // San Anselmo (4)
  { apn: "114-200-01", address: "220 San Anselmo Ave", city: "San Anselmo", zip: "94960", ownerType: "commercial",  lat: 37.9752, lng: -122.5618, acreage: 0.35, zoning: "C-1" },
  { apn: "114-200-02", address: "80 Red Hill Ave",     city: "San Anselmo", zip: "94960", ownerType: "commercial",  lat: 37.9748, lng: -122.5610, acreage: 0.48, zoning: "C-1" },
  { apn: "114-201-03", address: "100 Shady Lane",      city: "San Anselmo", zip: "94960", ownerType: "residential", lat: 37.9755, lng: -122.5625, acreage: 0.32, zoning: "R-1" },
  { apn: "114-201-04", address: "300 Oak Ave",         city: "San Anselmo", zip: "94960", ownerType: "residential", lat: 37.9758, lng: -122.5630, acreage: 0.27, zoning: "R-1" },

  // Fairfax (3)
  { apn: "134-220-01", address: "50 Broadway Blvd", city: "Fairfax", zip: "94930", ownerType: "commercial",  lat: 37.9878, lng: -122.5892, acreage: 0.28, zoning: "C-1" },
  { apn: "134-220-02", address: "100 Bolinas Rd",   city: "Fairfax", zip: "94930", ownerType: "residential", lat: 37.9882, lng: -122.5898, acreage: 0.35, zoning: "R-1" },
  { apn: "134-221-03", address: "25 Center Blvd",   city: "Fairfax", zip: "94930", ownerType: "residential", lat: 37.9875, lng: -122.5885, acreage: 0.22, zoning: "R-2" },

  // Novato (3)
  { apn: "174-240-01", address: "600 Grant Ave",      city: "Novato", zip: "94945", ownerType: "commercial",  lat: 38.1078, lng: -122.5702, acreage: 0.65, zoning: "C-2" },
  { apn: "174-240-02", address: "1200 S Novato Blvd", city: "Novato", zip: "94945", ownerType: "commercial",  lat: 38.1072, lng: -122.5698, acreage: 1.10, zoning: "C-2" },
  { apn: "174-241-03", address: "350 Enfrente Rd",    city: "Novato", zip: "94945", ownerType: "industrial",  lat: 38.1065, lng: -122.5690, acreage: 3.20, zoning: "I-1" },

  // Tiburon (2)
  { apn: "059-310-01", address: "100 Tiburon Blvd", city: "Tiburon", zip: "94920", ownerType: "commercial",  lat: 37.8915, lng: -122.4548, acreage: 0.40, zoning: "C-1" },
  { apn: "059-310-02", address: "200 Mar West St",   city: "Tiburon", zip: "94920", ownerType: "residential", lat: 37.8920, lng: -122.4555, acreage: 0.55, zoning: "R-1" },
];

// ---------------------------------------------------------------------------
// Pre-seeded covenants  (apn → array of covenants)
// flagged=true means the covenant shows as amber / "Under Review"
// ---------------------------------------------------------------------------
const SEED_COVENANTS = [
  { apn: "154-210-01", type: "Housing Density Floor",       flagged: false,
    text: "This parcel must maintain a minimum residential density of 20 units per acre for any future development. No single-family conversions permitted.",
    ref: "CA Gov Code §65583" },
  { apn: "154-210-02", type: "Transit Corridor Restriction", flagged: false,
    text: "No drive-through facilities or auto-oriented uses permitted. Ground floor must remain activated with pedestrian-facing commercial uses.",
    ref: "Marin County Code §22.52" },
  { apn: "154-212-06", type: "Infrastructure Easement",      flagged: false,
    text: "A 15-foot-wide public utility easement along the northern property boundary reserved for underground utility corridor expansion.",
    ref: "" },
  { apn: "154-213-07", type: "Housing Density Floor",        flagged: false,
    text: "Minimum of 8 residential units required in any new development on this parcel. Lot splits prohibited without Planning Commission review.",
    ref: "CA Gov Code §65583.2" },
  { apn: "154-215-11", type: "Water Rights Covenant",        flagged: false,
    text: "Reclaimed water use required for all landscape irrigation. Domestic water connection limited to 1.5-inch service meter per MMWD standards.",
    ref: "MMWD Water Supply Regulation §4.1" },
  { apn: "054-180-01", type: "Conservation Easement",        flagged: false,
    text: "A permanent conservation easement protecting 0.10 acres of riparian buffer along Miller Creek. No impervious surface within 25 feet of the creek bank.",
    ref: "Marin County Open Space District" },
  { apn: "054-181-03", type: "Housing Density Floor",        flagged: false,
    text: "Mixed-use development must include a minimum of 12 affordable housing units at 80% Area Median Income (AMI). Covenant runs with the land in perpetuity.",
    ref: "CA Gov Code §65915" },
  { apn: "054-182-05", type: "Conservation Easement",        flagged: false,
    text: "Protected habitat corridor for the California red-legged frog. No grading or vegetation removal permitted from October 1 through April 30.",
    ref: "USFWS Biological Opinion 2021-07" },
  { apn: "034-160-01", type: "Water Rights Covenant",        flagged: true,
    text: "Tidelands use restriction: no permanent structures below mean high water line. Public waterfront access must be maintained at all times per the Coastal Act.",
    ref: "CA Pub. Res. Code §6301" },
  { apn: "034-160-02", type: "Transit Corridor Restriction", flagged: false,
    text: "Ferry terminal access lane must remain unobstructed. No parking structures over 2 stories on the Bridgeway frontage.",
    ref: "Golden Gate Transit Operating Agreement 2019" },
  { apn: "034-162-05", type: "Housing Density Floor",        flagged: false,
    text: "Inclusionary requirement: 15% of all residential units must be deed-restricted affordable at 120% AMI or below per Sausalito Municipal Code.",
    ref: "Sausalito Municipal Code §14.07" },
  { apn: "074-170-01", type: "Infrastructure Easement",      flagged: false,
    text: "Storm drain easement: 20-foot-wide easement for the Corte Madera Creek flood control channel. No structures permitted within easement boundary.",
    ref: "Marin County Flood Control District Act §8" },
  { apn: "074-171-04", type: "Conservation Easement",        flagged: true,
    text: "Protected tidal wetlands buffer. Development setback of 100 feet from San Francisco Bay tidal marsh boundary. BCDC permit compliance review pending.",
    ref: "BCDC Permit 2020-004" },
  { apn: "094-190-01", type: "Housing Density Floor",        flagged: false,
    text: "Downtown mixed-use requirement: minimum 2 stories of residential above ground-floor commercial. Height bonus applicable per state density bonus law.",
    ref: "Larkspur Zoning Ordinance §18.40" },
  { apn: "094-191-03", type: "Water Rights Covenant",        flagged: true,
    text: "Creek setback covenant: 50-foot riparian buffer from Corte Madera Creek centerline. Vegetation removal requires CDFW 1602 Streambed Alteration Agreement.",
    ref: "CA Fish & Game Code §1602" },
  { apn: "114-200-01", type: "Transit Corridor Restriction", flagged: false,
    text: "Bus rapid transit right-of-way reservation: 12-foot public transit lane along Sir Francis Drake Blvd frontage must remain in the public right-of-way.",
    ref: "Marin Transit Capital Agreement 2022" },
  { apn: "114-200-02", type: "Infrastructure Easement",      flagged: false,
    text: "Underground fiber optic easement along the eastern property boundary for the Marin County countywide broadband network.",
    ref: "Marin County Broadband Master Plan 2023" },
  { apn: "134-220-01", type: "Conservation Easement",        flagged: false,
    text: "Oak woodland preservation: heritage oak trees on parcel are protected under Fairfax tree ordinance. No removal of oaks over 12 inches DBH without Planning Commission approval.",
    ref: "Fairfax Municipal Code §12.01" },
  { apn: "174-240-01", type: "Housing Density Floor",        flagged: false,
    text: "Smart Growth incentive zone: minimum 30 units per acre required for residential development. Ground-floor commercial activation required along Grant Ave frontage.",
    ref: "Novato General Plan 2040 §H-2.3" },
  { apn: "174-241-03", type: "Infrastructure Easement",      flagged: false,
    text: "High voltage transmission easement: 75-foot corridor for PG&E 115kV transmission line. No permanent structures, vegetation over 15 feet, or grading within easement.",
    ref: "PG&E Easement Agreement 94-0127" },
  { apn: "059-310-01", type: "Water Rights Covenant",        flagged: false,
    text: "Bay tidelands lease: use restricted to water-dependent or water-related uses only. Lease subject to 10-year renewal with the State Lands Commission.",
    ref: "State Lands Commission Lease PRC-1842" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Sovereign District — Seed Script ===\n");

  const rpcUrl = process.env.HARDHAT_NODE_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  let provider, wallet, contract;
  let chainAvailable = false;
  let signerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    // ethers v6 retries network detection indefinitely — race with a 5s timeout
    await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RPC connection timeout")), 5000)
      ),
    ]);
    // Wrap in NonceManager so sequential transactions don't collide in automining mode
    wallet = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
    signerAddress = await wallet.getAddress();
    console.log("Connected to chain:", rpcUrl);
    console.log("Signer:", signerAddress);

    const addrPath = path.join(__dirname, "../contract-address.json");
    if (!process.env.CONTRACT_ADDRESS && !fs.existsSync(addrPath)) {
      throw new Error("contract-address.json missing and CONTRACT_ADDRESS not set.");
    }
    const { address } = JSON.parse(fs.readFileSync(addrPath));
    const artifactPath = path.join(
      __dirname,
      "../../contracts/artifacts/contracts/CovenantRegistry.sol/CovenantRegistry.json"
    );
    const abi = JSON.parse(fs.readFileSync(artifactPath)).abi;
    contract = new ethers.Contract(address, abi, wallet);
    console.log("Contract:", address, "\n");
    chainAvailable = true;
  } catch (err) {
    console.warn("Chain not available:", err.message);
    console.warn("Seeding SQLite only (no on-chain transactions).\n");
  }

  // 0. Ensure schema exists
  await db.init();

  // 1. Insert parcels
  for (const p of PARCELS) {
    const parcelId =
      "0x" +
      BigInt(ethers.keccak256(ethers.toUtf8Bytes(p.apn)))
        .toString(16)
        .padStart(64, "0");
    await db.run(
      `INSERT INTO parcels
         (apn, parcel_id, address, city, zip, owner_type, acreage, zoning, lat, lng, on_chain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT (apn) DO NOTHING`,
      [p.apn, parcelId, p.address, p.city, p.zip, p.ownerType,
       p.acreage, p.zoning, p.lat, p.lng]
    );
  }
  console.log(`Inserted ${PARCELS.length} parcels into database.`);

  // 2. Mint parcels on-chain if available
  if (chainAvailable) {
    console.log("\nMinting parcels on-chain...");
    for (const p of PARCELS) {
      try {
        const exists = (await contract.getParcel(await contract.apnToId(p.apn))).exists;
        if (exists) { process.stdout.write("."); continue; }

        const tx = await contract.mintParcel(p.apn);
        const receipt = await tx.wait(1);
        const block = await provider.getBlock(receipt.blockNumber);
        const ts = new Date(Number(block.timestamp) * 1000).toISOString();

        await db.run(
          "UPDATE parcels SET on_chain=1, minted_at=?, minted_by=? WHERE apn=?",
          [ts, signerAddress, p.apn]
        );
        await db.run(
          `INSERT INTO audit_events
             (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
           VALUES (?, 'ParcelMinted', ?, ?, ?, ?, ?)
           ON CONFLICT DO NOTHING`,
          [p.apn, receipt.blockNumber, receipt.hash, ts, signerAddress,
           JSON.stringify({ apn: p.apn })]
        );
        process.stdout.write("✓");
      } catch (err) {
        console.error(`\nError minting ${p.apn}:`, err.message);
      }
    }
    console.log("\nAll parcels minted.\n");
  }

  // 3. Seed covenants
  console.log("Seeding covenants...");
  for (const c of SEED_COVENANTS) {
    const parcel = await db.get("SELECT apn FROM parcels WHERE apn=?", [c.apn]);
    if (!parcel) continue;

    const existing = await db.get(
      "SELECT id FROM covenants WHERE parcel_apn=? AND covenant_type=?",
      [c.apn, c.type]
    );
    if (existing) { process.stdout.write("."); continue; }

    const ipfsHash = crypto.createHash("sha256")
      .update(`${c.apn}:${c.type}:${c.text}`).digest("hex");

    let txHash = null, blockNumber = null;
    let blockTimestamp = new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString();

    if (chainAvailable) {
      try {
        const parcelId = await contract.apnToId(c.apn);
        const tx = await contract.addCovenant(parcelId, c.type, c.text, ipfsHash);
        const receipt = await tx.wait(1);
        txHash = receipt.hash;
        blockNumber = receipt.blockNumber;
        blockTimestamp = new Date(Number((await provider.getBlock(blockNumber)).timestamp) * 1000).toISOString();
        process.stdout.write("✓");
      } catch (err) { console.error(`\nChain error for ${c.apn}:`, err.message); }
    } else {
      process.stdout.write("·");
    }

    const maxRow = await db.get(
      "SELECT MAX(covenant_index) AS max FROM covenants WHERE parcel_apn=?", [c.apn]
    );
    const covenantIndex = (maxRow?.max ?? -1) + 1;

    await db.run(
      `INSERT INTO covenants
         (parcel_apn, covenant_index, covenant_type, legal_text, ipfs_hash, legal_reference,
          creator, tx_hash, block_number, block_timestamp, active, flagged)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (parcel_apn, covenant_index) DO NOTHING`,
      [c.apn, covenantIndex, c.type, c.text, ipfsHash, c.ref || null,
       signerAddress, txHash, blockNumber, blockTimestamp, c.flagged ? 1 : 0]
    );

    if (blockNumber) {
      await db.run(
        `INSERT INTO audit_events
           (parcel_apn, event_type, block_number, tx_hash, block_timestamp, actor, details)
         VALUES (?, 'CovenantAdded', ?, ?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
        [c.apn, blockNumber, txHash, blockTimestamp, signerAddress,
         JSON.stringify({ covenantIndex, covenantType: c.type, ipfsHash })]
      );
    }
  }

  console.log(`\n\nSeed complete!`);
  console.log(`  Parcels: ${PARCELS.length}`);
  console.log(`  Covenants: ${SEED_COVENANTS.length}`);
  console.log(`  Flagged: ${SEED_COVENANTS.filter((c) => c.flagged).length}`);
  console.log("\nRun 'npm start' to launch the API server.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
