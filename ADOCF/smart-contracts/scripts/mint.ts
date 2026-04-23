import { ethers } from "hardhat";

function isValidPositiveNumericValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  try {
    const parsed = ethers.parseUnits(trimmed, 18);
    return parsed > 0n;
  } catch {
    return false;
  }
}

async function main() {
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const mintToAddress = process.env.MINT_TO_ADDRESS;
  const mintAmount = process.env.MINT_AMOUNT;

  if (!tokenAddress) {
    throw new Error("TOKEN_CONTRACT_ADDRESS is required. Set it to the deployed token contract address before running this script.");
  }

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`TOKEN_CONTRACT_ADDRESS must be a valid EVM address. Received: ${tokenAddress}`);
  }

  if (!mintToAddress) {
    throw new Error("MINT_TO_ADDRESS is required. Set it to the recipient's EVM address before running this script.");
  }

  if (!ethers.isAddress(mintToAddress)) {
    throw new Error(`MINT_TO_ADDRESS must be a valid EVM address. Received: ${mintToAddress}`);
  }

  if (!mintAmount) {
    throw new Error("MINT_AMOUNT is required. Set it to a strictly positive token amount before running this script.");
  }

  if (!isValidPositiveNumericValue(mintAmount)) {
    throw new Error(`MINT_AMOUNT must be a strictly positive numeric value. Received: ${mintAmount}`);
  }

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("Token", tokenAddress, deployer);

  const parsedMintAmount = ethers.parseUnits(mintAmount.trim(), 18);
  const tx = await token.mint(mintToAddress, parsedMintAmount);
  await tx.wait();

  console.log(`Minted ${mintAmount} tokens to ${mintToAddress}`);
  console.log(`Transaction hash: ${tx.hash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});