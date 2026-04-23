import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT;
  const mintToAddress = process.env.MINT_TO_ADDRESS;

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount && mintToAddress) {
    const tx = await token.mint(mintToAddress, BigInt(mintAmount));
    await tx.wait();
    console.log(`Minted ${mintAmount} tokens to ${mintToAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});