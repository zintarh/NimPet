const hre = require("hardhat");

// Run this once after deploying to set the USDC token address and (optionally)
// a launch discount.
// Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/post-upgrade-init.js --network base

const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DISCOUNT_BPS      = 0;   // e.g. 3000 for 30% off; 0 disables
const DISCOUNT_END_UNIX = 0;

async function main() {
  const PROXY = process.env.CONTRACT_ADDRESS;
  if (!PROXY) throw new Error("Set CONTRACT_ADDRESS in your env before running this script.");

  const [owner] = await hre.ethers.getSigners();
  console.log(`Using account: ${owner.address}`);

  const proxy = await hre.ethers.getContractAt("Focusling", PROXY, owner);

  console.log("Setting USDC address…");
  const tx1 = await proxy.setUsdc(USDC_BASE_MAINNET);
  await tx1.wait();
  console.log(`✅ setUsdc done (tx: ${tx1.hash})`);

  if (DISCOUNT_BPS > 0) {
    console.log(`Setting launch discount (${DISCOUNT_BPS} bps until ${DISCOUNT_END_UNIX})…`);
    const tx2 = await proxy.setLaunchDiscount(DISCOUNT_BPS, DISCOUNT_END_UNIX);
    await tx2.wait();
    console.log(`✅ setLaunchDiscount done (tx: ${tx2.hash})`);
  }

  const usdcAddr = await proxy.usdc();
  const discountBps = await proxy.discountBps();
  const discountEnd = await proxy.discountEndTime();
  console.log("\n── Verification ──────────────────────────────");
  console.log(`usdc address   : ${usdcAddr}`);
  console.log(`discountBps    : ${discountBps} (${Number(discountBps) / 100}% off)`);
  console.log(`discountEndTime: ${discountEnd}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
