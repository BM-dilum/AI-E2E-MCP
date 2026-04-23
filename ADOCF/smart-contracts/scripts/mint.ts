import { ethers } from "hardhat";

async function main() {
  const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const mintAmount = process.env.MINT_AMOUNT;
  const mintToAddress = process.env.MINT_TO_ADDRESS;

  if (!tokenContractAddress) {
    throw new Error("TOKEN_CONTRACT_ADDRESS is required");
  }

  if (!mintAmount) {
    throw new Error("MINT_AMOUNT is required");
  }

  if (!mintToAddress) {
    throw new Error("MINT_TO_ADDRESS is required");
  }

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("Token", tokenContractAddress, deployer);

  const tx = await token.mint(mintToAddress, mintAmount);
  await tx.wait();

  console.log(`Minted ${mintAmount} tokens to ${mintToAddress}`);
  console.log(`Token contract: ${tokenContractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});