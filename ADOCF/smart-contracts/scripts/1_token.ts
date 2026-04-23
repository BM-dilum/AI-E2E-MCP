import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main(): Promise<void> {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT;
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying Token with deployer: ${deployer.address}`);
  console.log(`Token name: ${tokenName}`);
  console.log(`Token symbol: ${tokenSymbol}`);

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount && mintAmount.trim() !== "") {
    const amount = BigInt(mintAmount);
    const mintTx = await token.mint(deployer.address, amount);
    await mintTx.wait();
    console.log(`Minted ${amount.toString()} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});