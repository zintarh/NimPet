const hre = require("hardhat");

async function main() {
  const Focusling = await hre.ethers.getContractFactory("Focusling");

  // Base Mainnet USDC (native, Circle-issued)
  const USDC_BASE_MAINNET  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  // Base Sepolia USDC (Circle testnet faucet token)
  const USDC_BASE_SEPOLIA  = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const network = hre.network.name;
  const usdc = network === "base" ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
  const treasury = process.env.TREASURY_ADDRESS || hre.ethers.ZeroAddress;

  console.log(`🚀 Deploying Focusling to ${network}...`);
  const focusling = await hre.upgrades.deployProxy(Focusling, [usdc, treasury], {
    kind: "uups",
  });

  await focusling.waitForDeployment();

  console.log(`Focusling deployed to ${focusling.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
