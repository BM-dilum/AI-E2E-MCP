import { ethers } from "hardhat";

async function main() {
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const mintToAddress = process.env.MINT_TO_ADDRESS;
  const mintAmount = process.env.MINT_AMOUNT;

  if (!tokenAddress) {
    throw new Error("TOKEN_CONTRACT_ADDRESS is required");
  }

  if (!mintAmount) {
    throw new Error("MINT_AMOUNT is required");
  }

  const [deployer] = await ethers.getSigners();
  const recipient = mintToAddress ?? deployer.address;
  const amount = ethers.parseUnits(mintAmount, 18);
  const token = await ethers.getContractAt("Token", tokenAddress, deployer);

  const tx = await token.mint(recipient, amount);
  await tx.wait();

  console.log(`Minted ${mintAmount} tokens to ${recipient}`);
  console.log(`Token contract: ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});