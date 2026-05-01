# Smart Contracts

This package contains a Hardhat-based smart contracts project for an AI-driven on-chain finance system.

## Overview

### Token
`contracts/Token.sol` is an ERC20 token with burn and owner-controlled minting support.

Features:
- ERC20 standard token
- Burnable by token holders
- Owner-only minting
- Custom events for mint, burn, and transfer actions

Deployment intent:
- Sepolia: `XAU Dollar` / `XAU$`
- Polygon Amoy: `XUS Dollar` / `XUS$`

### LoggingContract
`contracts/LoggingContract.sol` stores structured session logs on-chain.

Features:
- Stores session logs with nested tool call data
- Tracks session IDs
- Supports paginated retrieval in reverse chronological order
- Emits an event when logs are uploaded

## Project Structure

- `contracts/Token.sol` — ERC20 token contract
- `contracts/LoggingContract.sol` — on-chain logging contract
- `scripts/1_token.ts` — deploy Token contract
- `scripts/2_loggingContract.ts` — deploy LoggingContract
- `scripts/mint.ts` — mint tokens to a specified address
- `hardhat.config.ts` — Hardhat configuration
- `package.json` — project dependencies and scripts
- `tsconfig.json` — TypeScript configuration
- `.env.example` — environment variable template

## Installation

1. Install dependencies:
   npm install

2. Copy the environment template:
   cp .env.example .env

3. Fill in the required values in `.env`

## Compile

Run:

npm run compile

## Deploy Token to Sepolia

Set the following environment variables in `.env`:
- `SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

Optional:
- `MINT_AMOUNT`

Deploy:

npm run deploy:sepolia

If `MINT_AMOUNT` is set, the deployment script will mint that amount to the deployer wallet after deployment.

## Deploy Token to Polygon Amoy

Set the following environment variables in `.env`:
- `POLYGON_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

Optional:
- `MINT_AMOUNT`

Deploy:

npm run deploy:polygon

If `MINT_AMOUNT` is set, the deployment script will mint that amount to the deployer wallet after deployment.

## Deploy LoggingContract

### Sepolia
npm run deploy:logging:sepolia

### Polygon Amoy
npm run deploy:logging:polygon

## Mint Tokens

To mint tokens to a specific address, set:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`
- `DEPLOYER_PRIVATE_KEY`
- the appropriate RPC URL for the target network

Then run:

### Sepolia
npm run mint:sepolia

### Polygon Amoy
npm run mint:polygon

## Environment Variables Reference

| Variable | Description | Example |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | RPC URL for Sepolia | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_RPC_URL` | RPC URL for Polygon Amoy | `https://polygon-amoy.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | Private key for deployment and minting | `your_private_key` |
| `TOKEN_NAME` | Token name used during deployment | `XAU Dollar` |
| `TOKEN_SYMBOL` | Token symbol used during deployment | `XAU$` |
| `MINT_AMOUNT` | Amount to mint in deployment or mint scripts | `1000000` |
| `MINT_TO_ADDRESS` | Recipient address for minting | `0x...` |
| `TOKEN_CONTRACT_ADDRESS` | Deployed Token contract address | `0x...` |

## Notes

- Do not commit real private keys or secrets.
- Ensure the deployer wallet has sufficient native token balance for gas on the target network.
- The Token contract owner is the deployer address used during deployment.