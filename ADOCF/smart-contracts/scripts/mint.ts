import { ethers } from "hardhat";

async function main() {
  const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const mintAmountInput = process.env.MINT_AMOUNT;
  const mintToAddress = process.env.MINT_TO_ADDRESS;

  if (!tokenContractAddress) {
    throw new Error("TOKEN_CONTRACT_ADDRESS is required");
  }

  if (!mintAmountInput) {
    throw new Error("MINT_AMOUNT is required");
  }

  if (!mintToAddress) {
    throw new Error("MINT_TO_ADDRESS is required");
  }

  if (!ethers.isAddress(mintToAddress)) {
    throw new Error(`MINT_TO_ADDRESS is not a valid EVM address: ${mintToAddress}`);
  }

  if (!ethers.isAddress(tokenContractAddress)) {
    throw new Error(`TOKEN_CONTRACT_ADDRESS is not a valid EVM address: ${tokenContractAddress}`);
  }

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("Token", tokenContractAddress, deployer);

  let decimals: bigint;
  try {
    decimals = await token.decimals();
  } catch (error) {
    throw new Error(`Failed to read token decimals from contract ${tokenContractAddress}: ${(error as Error).message}`);
  }

  let mintAmount: bigint;
  try {
    const normalizedAmount = mintAmountInput.trim();
    if (normalizedAmount.length === 0) {
      throw new Error("MINT_AMOUNT cannot be empty");
    }
    mintAmount = ethers.parseUnits(normalizedAmount, Number(decimals));
  } catch (error) {
    throw new Error(`Invalid MINT_AMOUNT "${mintAmountInput}": ${(error as Error).message}`);
  }

  if (mintAmount <= 0n) {
    throw new Error(`MINT_AMOUNT must be greater than 0: ${mintAmountInput}`);
  }

  const tx = await token.mint(mintToAddress, mintAmount);
  await tx.wait();

  console.log(`Minted ${mintAmount.toString()} base units to ${mintToAddress}`);
  console.log(`Token contract: ${tokenContractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});