import { ethers } from "hardhat";

async function main() {
  const LoggingContract = await ethers.getContractFactory("LoggingContract");
  const loggingContract = await LoggingContract.deploy();

  await loggingContract.waitForDeployment();

  const address = await loggingContract.getAddress();
  console.log(`LoggingContract deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});