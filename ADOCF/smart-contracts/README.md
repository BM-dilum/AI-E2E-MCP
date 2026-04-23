# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for ADOCF, an AI-Driven On-Chain Finance system.

## Contracts

### Token.sol
An ERC20 token with burn and owner-controlled minting.

Features:
- Built on OpenZeppelin ERC20, ERC20Burnable, and Ownable
- Owner-only minting
- Self-service burning from caller balance
- Self-service token transfers with event emission

Deployment targets:
- XAU: `XAU Dollar` / `XAU$` on Sepolia
- XUS: `XUS Dollar` / `XUS$` on Polygon Amoy

### LoggingContract.sol
A session-based on-chain logging contract for AI tool usage and response tracking.

Features:
- Stores session logs with tool call details
- Supports paginated retrieval in reverse chronological order
- Tracks all session IDs
- Emits events when logs are uploaded

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Setup

Install dependencies:

npm install

Copy the example environment file and fill in your values:

cp .env.example .env

## Environment Variables

- `SEPOLIA_RPC_URL` - RPC endpoint for Sepolia
- `POLYGON_RPC_URL` - RPC endpoint for Polygon Amoy
- `DEPLOYER_PRIVATE_KEY` - Private key for deployment and minting
- `TOKEN_NAME` - Token name used by the deployment script
- `TOKEN_SYMBOL` - Token symbol used by the deployment script
- `MINT_AMOUNT` - Optional mint amount used by deployment or mint scripts
- `MINT_TO_ADDRESS` - Address to receive minted tokens in `mint.ts`
- `TOKEN_CONTRACT_ADDRESS` - Deployed Token contract address for minting

## Compile

Compile the contracts:

npm run compile

## Deploy Token

### Deploy to Sepolia

Set the desired token values in your environment file, then run:

npm run deploy:sepolia

This deploys the Token contract using `TOKEN_NAME` and `TOKEN_SYMBOL`.

If `MINT_AMOUNT` is set, the deploy script may mint that amount to the deployer wallet after deployment.

### Deploy to Polygon Amoy

Set the desired token values in your environment file, then run:

npm run deploy:polygon

This deploys the Token contract using `TOKEN_NAME` and `TOKEN_SYMBOL`.

If `MINT_AMOUNT` is set, the deploy script may mint that amount to the deployer wallet after deployment.

## Deploy LoggingContract

### Deploy to Sepolia

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

Use the mint script to mint tokens from an already deployed Token contract:

npm run mint

Required environment variables:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`

The caller must be the owner of the Token contract.

## Project Structure

- `contracts/Token.sol` - ERC20 token contract
- `contracts/LoggingContract.sol` - session logging contract
- `scripts/1_token.ts` - deploy Token
- `scripts/2_loggingContract.ts` - deploy LoggingContract
- `scripts/mint.ts` - mint tokens on an existing Token contract
- `hardhat.config.ts` - Hardhat configuration
- `package.json` - project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Notes

- Solidity version: `0.8.28`
- Hardhat is configured with TypeScript
- Uses OpenZeppelin Contracts and ethers.js v6 via Hardhat Toolbox
- Ensure the deployer wallet has enough native gas token for the target network before deploying