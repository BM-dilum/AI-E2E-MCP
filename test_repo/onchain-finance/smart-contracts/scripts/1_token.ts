import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

function parseMintAmount(value: string | undefined): bigint | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return ethers.parseUnits(trimmed, 18);
  } catch {
    throw new Error(`Invalid MINT_AMOUNT value: ${value}`);
  }
}

async function main(): Promise<void> {
  const tokenName = process.env.TOKEN_NAME?.trim() || "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL?.trim() || "XAU$";

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  const mintAmount = parseMintAmount(process.env.MINT_AMOUNT);
  if (mintAmount !== null && mintAmount > 0n) {
    const [deployer] = await ethers.getSigners();
    const mintTx = await token.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log(`Minted ${mintAmount.toString()} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});