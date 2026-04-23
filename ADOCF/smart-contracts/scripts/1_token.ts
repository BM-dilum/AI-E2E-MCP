import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main(): Promise<void> {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmountEnv = process.env.MINT_AMOUNT;
  const mintAmount = mintAmountEnv ? ethers.parseUnits(mintAmountEnv, 18) : undefined;

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying Token with account: ${deployer.address}`);
  console.log(`Token name: ${tokenName}`);
  console.log(`Token symbol: ${tokenSymbol}`);

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount !== undefined) {
    const tx = await token.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log(`Minted ${mintAmount.toString()} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});