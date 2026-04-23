import { ethers } from "hardhat";

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmountEnv = process.env.MINT_AMOUNT;

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`Token deployed to: ${address}`);

  if (mintAmountEnv && mintAmountEnv.trim() !== "") {
    const [deployer] = await ethers.getSigners();
    const mintAmount = ethers.parseUnits(mintAmountEnv, 18);
    const tx = await token.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log(`Minted ${mintAmount.toString()} tokens to deployer: ${deployer.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});