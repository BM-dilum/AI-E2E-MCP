import { ethers } from "hardhat";

async function main() {
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const mintToAddress = process.env.MINT_TO_ADDRESS;
  const mintAmount = process.env.MINT_AMOUNT;

  if (!tokenAddress) {
    throw new Error("TOKEN_CONTRACT_ADDRESS is required");
  }

  if (!mintToAddress) {
    throw new Error("MINT_TO_ADDRESS is required");
  }

  if (!mintAmount) {
    throw new Error("MINT_AMOUNT is required");
  }

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("Token", tokenAddress, deployer);
  const amount = ethers.parseUnits(mintAmount, 18);

  const tx = await token.mint(mintToAddress, amount);
  await tx.wait();

  console.log(`Minted ${mintAmount} tokens to ${mintToAddress}`);
  console.log(`Transaction hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});