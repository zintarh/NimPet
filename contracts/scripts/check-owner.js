const hre = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!PROXY_ADDRESS) throw new Error("Set CONTRACT_ADDRESS in your env before running this script.");

  console.log(`Checking state for Proxy: ${PROXY_ADDRESS}`);
  const proxy = await hre.ethers.getContractAt("Focusling", PROXY_ADDRESS);

  try {
    const owner = await proxy.owner();
    console.log(`-----------------------------------------`);
    console.log(`OWNER ADDRESS: ${owner}`);
    console.log(`-----------------------------------------`);
    console.log(`Instructions: You MUST use the private key for the above address to perform the upgrade.`);
  } catch (e) {
    console.error("Could not fetch owner. Is the address correct?");
    console.error(e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
