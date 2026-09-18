const hre = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!PROXY_ADDRESS) throw new Error("Set CONTRACT_ADDRESS in your env before running this script.");

  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("❌ No signers found. Make sure your PRIVATE_KEY is set in .env");
  }
  const deployer = signers[0];

  console.log(`🚀 Deploying new implementation for Focusling with account: ${deployer.address}`);

  const Focusling = await hre.ethers.getContractFactory("Focusling", deployer);
  const upgraded = await hre.upgrades.upgradeProxy(PROXY_ADDRESS, Focusling);
  await upgraded.waitForDeployment();

  console.log("✅ Upgrade complete! All new features are now live.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
