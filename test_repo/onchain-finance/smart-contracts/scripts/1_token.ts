import { ethers } from "hardhat";

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT;

  const [deployer] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);
  console.log(`Deployer: ${deployer.address}`);

  if (mintAmount && mintAmount.trim() !== "") {
    const tx = await token.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log(`Minted ${mintAmount} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});