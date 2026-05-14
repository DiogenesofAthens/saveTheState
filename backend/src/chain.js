const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let provider, wallet, contract;

function loadABI() {
  const artifactPath = path.join(
    __dirname,
    "../../contracts/artifacts/contracts/CovenantRegistry.sol/CovenantRegistry.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Run 'npm run compile' in the contracts/ directory first."
    );
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
}

function loadContractAddress() {
  // Env var takes priority — set CONTRACT_ADDRESS in Vercel for Base Sepolia deployments
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;
  const addrPath = path.join(__dirname, "../contract-address.json");
  if (!fs.existsSync(addrPath)) {
    throw new Error(
      "Contract address not found. Set CONTRACT_ADDRESS env var or deploy with 'npm run deploy:local'."
    );
  }
  return JSON.parse(fs.readFileSync(addrPath, "utf8")).address;
}

async function init() {
  const rpcUrl = process.env.HARDHAT_NODE_URL || "http://127.0.0.1:8545";
  provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    await provider.getBlockNumber();
  } catch {
    console.warn(
      "[chain] WARNING: Cannot connect to node at",
      rpcUrl,
      "— running in read-only SQLite mode."
    );
    return null;
  }

  const privateKey =
    process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  wallet = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));

  try {
    const abi = loadABI();
    const contractAddress = loadContractAddress();
    contract = new ethers.Contract(contractAddress, abi, wallet);
    console.log("[chain] Connected — contract:", contractAddress);
    console.log("[chain] Signer:", await wallet.getAddress());
  } catch (err) {
    console.warn("[chain] Contract not available:", err.message);
  }

  return { provider, wallet, contract };
}

const getContract = () => contract;
const getProvider = () => provider;
const getWallet = () => wallet;
const isConnected = () => !!contract;

module.exports = { init, getContract, getProvider, getWallet, isConnected };
