import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT?.trim();
  const mintToAddress = process.env.MINT_TO_ADDRESS?.trim();

  if ((mintAmount && !mintToAddress) || (!mintAmount && mintToAddress)) {
    throw new Error("Both MINT_AMOUNT and MINT_TO_ADDRESS must be provided together.");
  }

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount && mintToAddress) {
    if (!ethers.isAddress(mintToAddress)) {
      throw new Error(`Invalid MINT_TO_ADDRESS: ${mintToAddress}`);
    }

    if (!mintAmount) {
      throw new Error("MINT_AMOUNT must be provided.");
    }

    const decimals = await token.decimals();
    const parsedAmount = ethers.parseUnits(mintAmount, decimals);

    const tx = await token.mint(mintToAddress, parsedAmount);
    await tx.wait();
    console.log(`Minted ${mintAmount} tokens to ${mintToAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});