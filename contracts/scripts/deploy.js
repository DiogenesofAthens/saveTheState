const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CovenantRegistry with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const CovenantRegistry = await hre.ethers.getContractFactory("CovenantRegistry");
  const registry = await CovenantRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\nCovenantRegistry deployed to:", address);
  console.log("Network:", hre.network.name);

  const deployInfo = {
    address,
    deployer: deployer.address,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../../backend/contract-address.json");
  fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log("\nContract info written to:", outPath);
  console.log("\nNext step: run 'npm run seed' in the backend directory.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
