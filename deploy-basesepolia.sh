#!/usr/bin/env bash
# =============================================================================
# deploy-basesepolia.sh — One-shot Base Sepolia deployment for Sovereign District
#
# What this does:
#   1. Validates required env vars
#   2. Checks your deployer wallet balance on Base Sepolia
#   3. Compiles the contract
#   4. Deploys CovenantRegistry to Base Sepolia → writes backend/contract-address.json
#   5. Runs the seed script to populate the SQLite DB (chain-backed)
#   6. Prints Vercel env vars to copy-paste
#
# Prerequisites:
#   - Node.js 20+
#   - Funded Base Sepolia wallet (get ETH at https://docs.base.org/docs/tools/network-faucets/)
#   - backend/.env configured (see .env.example — set DEPLOYER_PRIVATE_KEY + BASE_SEPOLIA_URL)
#
# Usage:
#   chmod +x deploy-basesepolia.sh
#   ./deploy-basesepolia.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="$SCRIPT_DIR/backend/.env"
CONTRACT_DIR="$SCRIPT_DIR/contracts"
BACKEND_DIR="$SCRIPT_DIR/backend"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[info]${NC}  $*"; }
ok()      { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
die()     { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sovereign District — Base Sepolia Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Validate env ──────────────────────────────────────────────────────
info "Checking backend/.env..."
if [ ! -f "$BACKEND_ENV" ]; then
  die "backend/.env not found. Copy backend/.env.example → backend/.env and fill in values."
fi

# Source the .env file to read values (safely — only read, don't export)
set -a
# shellcheck disable=SC1090
source "$BACKEND_ENV"
set +a

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ] || [[ "$DEPLOYER_PRIVATE_KEY" == *"0xac0974"* ]]; then
  die "DEPLOYER_PRIVATE_KEY is not set or is still the default Hardhat key.\n  Replace it with a funded Base Sepolia wallet key in backend/.env."
fi

BASE_SEPOLIA_URL="${BASE_SEPOLIA_URL:-https://sepolia.base.org}"
ok "Using RPC: $BASE_SEPOLIA_URL"

# ── Step 2: Check wallet balance ──────────────────────────────────────────────
info "Checking deployer wallet balance on Base Sepolia..."
BALANCE_OUTPUT=$(node - <<EOF
const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("${BASE_SEPOLIA_URL}");
const wallet = new ethers.Wallet("${DEPLOYER_PRIVATE_KEY}", provider);
wallet.getAddress().then(async addr => {
  const bal = await provider.getBalance(addr);
  const eth = parseFloat(ethers.formatEther(bal));
  console.log("ADDRESS=" + addr);
  console.log("BALANCE=" + eth.toFixed(6));
  if (eth < 0.001) {
    console.log("LOW=true");
  }
}).catch(e => { console.error(e.message); process.exit(1); });
EOF
)

WALLET_ADDRESS=$(echo "$BALANCE_OUTPUT" | grep "^ADDRESS=" | cut -d= -f2)
WALLET_BALANCE=$(echo "$BALANCE_OUTPUT" | grep "^BALANCE=" | cut -d= -f2)
IS_LOW=$(echo "$BALANCE_OUTPUT" | grep "^LOW=true" || true)

ok "Wallet: $WALLET_ADDRESS"
ok "Balance: $WALLET_BALANCE ETH (Base Sepolia)"

if [ -n "$IS_LOW" ]; then
  warn "Balance is very low. Get testnet ETH from:"
  warn "  https://docs.base.org/docs/tools/network-faucets/"
  warn "  https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
  echo ""
  read -rp "Continue anyway? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || exit 0
fi

# ── Step 3: Install & compile ─────────────────────────────────────────────────
info "Installing contracts dependencies..."
cd "$CONTRACT_DIR"
npm install --silent

info "Compiling contracts..."
npx hardhat compile --quiet
ok "Contracts compiled"

# ── Step 4: Deploy to Base Sepolia ────────────────────────────────────────────
info "Deploying CovenantRegistry to Base Sepolia..."
echo ""
npx hardhat run scripts/deploy.js --network baseSepolia
echo ""

CONTRACT_ADDRESS_FILE="$BACKEND_DIR/contract-address.json"
if [ ! -f "$CONTRACT_ADDRESS_FILE" ]; then
  die "contract-address.json was not created — deploy may have failed."
fi

DEPLOYED_ADDRESS=$(node -e "console.log(require('$CONTRACT_ADDRESS_FILE').address)")
ok "Contract deployed: $DEPLOYED_ADDRESS"
ok "Block explorer: https://sepolia.basescan.org/address/$DEPLOYED_ADDRESS"

# ── Step 5: Seed the database ─────────────────────────────────────────────────
echo ""
info "Seeding database (50 parcels + covenants against Base Sepolia)..."
info "This makes ~70 on-chain transactions — may take 2–3 minutes..."
echo ""
cd "$BACKEND_DIR"
npm install --silent

# Point the seed at Base Sepolia by temporarily overriding HARDHAT_NODE_URL
HARDHAT_NODE_URL="$BASE_SEPOLIA_URL" node src/seed.js
ok "Database seeded"

# ── Step 6: Print Vercel env vars ─────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Add these environment variables to your Vercel project:"
echo "  (Vercel Dashboard → Project → Settings → Environment Variables)"
echo ""
echo "  DEPLOYER_PRIVATE_KEY  = ${DEPLOYER_PRIVATE_KEY:0:10}...  (your key — keep secret)"
echo "  HARDHAT_NODE_URL      = $BASE_SEPOLIA_URL"
echo ""
echo "  Then redeploy on Vercel. Audit trail links will point to:"
echo "  https://sepolia.basescan.org/tx/<txHash>"
echo ""
echo "  View deployed contract:"
echo "  https://sepolia.basescan.org/address/$DEPLOYED_ADDRESS"
echo ""
