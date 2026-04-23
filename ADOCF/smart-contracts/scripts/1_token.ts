import { ethers } from "hardhat";

async function main() {
  const tokenName = process.env.TOKEN_NAME ?? "XAU Dollar";
  const tokenSymbol = process.env.TOKEN_SYMBOL ?? "XAU$";
  const mintAmount = process.env.MINT_AMOUNT;

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(tokenName, tokenSymbol);

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`Token deployed to: ${address}`);

  if (mintAmount && mintAmount.trim() !== "") {
    const deployer = await ethers.getSigner();
    const amount = ethers.parseUnits(mintAmount, 18);
    const tx = await token.connect(deployer).mint(await deployer.getAddress(), amount);
    await tx.wait();
    console.log(`Minted ${mintAmount} tokens to deployer: ${await deployer.getAddress()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});