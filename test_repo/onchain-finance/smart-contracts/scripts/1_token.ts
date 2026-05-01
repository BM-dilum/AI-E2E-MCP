import { ethers } from "hardhat";

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT;
  const mintToAddress = process.env.MINT_TO_ADDRESS;

  const [deployer] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`Token deployed to: ${tokenAddress}`);

  if (mintAmount) {
    const recipient = mintToAddress ?? deployer.address;
    const amount = ethers.parseUnits(mintAmount, 18);
    const mintTx = await token.mint(recipient, amount);
    await mintTx.wait();
    console.log(`Minted ${mintAmount} tokens to ${recipient}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});