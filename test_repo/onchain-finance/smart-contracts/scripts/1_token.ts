import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmountEnv = process.env.MINT_AMOUNT;
  const mintAmount = mintAmountEnv ? ethers.parseUnits(mintAmountEnv, 18) : 0n;

  const [deployer] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount > 0n) {
    const mintTx = await token.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log(`Minted ${mintAmount.toString()} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});