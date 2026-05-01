# Smart Contracts

Hardhat + TypeScript project for an AI-driven on-chain finance system.

## Overview

This project includes two Solidity contracts:

### Token
An ERC20 token with burn and owner-controlled minting capabilities.

Features:
- ERC20 standard token
- Burnable by token holders
- Owner-only minting
- Convenience transfer function
- Events for mint, burn, and transfer actions

### LoggingContract
A lightweight on-chain logging contract for storing AI/session activity.

Features:
- Stores session logs with user requests, responses, and tool calls
- Tracks session IDs
- Supports paginated retrieval of stored logs
- Emits events when logs are uploaded

## Project Structure

- contracts/Token.sol
- contracts/LoggingContract.sol
- scripts/1_token.ts
- scripts/2_loggingContract.ts
- scripts/mint.ts
- hardhat.config.ts
- package.json
- tsconfig.json
- .env.example

## Installation

Install dependencies:

npm install

## Compile

Compile the contracts:

npm run compile

## Deploy Token to Sepolia

1. Set environment variables in a local .env file based on .env.example
2. Ensure SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY are configured
3. Deploy the token:

npm run deploy:sepolia

The deployment script uses:
- TOKEN_NAME
- TOKEN_SYMBOL

If MINT_AMOUNT is set, the deploy script will mint that amount to the deployer address after deployment.

## Deploy Token to Polygon Amoy

1. Set environment variables in a local .env file based on .env.example
2. Ensure POLYGON_RPC_URL and DEPLOYER_PRIVATE_KEY are configured
3. Deploy the token:

npm run deploy:polygon

The deployment script uses:
- TOKEN_NAME
- TOKEN_SYMBOL

If MINT_AMOUNT is set, the deploy script will mint that amount to the deployer address after deployment.

## Deploy LoggingContract

Deploy the logging contract to Sepolia:

npm run deploy:logging:sepolia

Deploy the logging contract to Polygon Amoy:

npm run deploy:logging:polygon

## Mint Tokens

Mint tokens to a recipient using an already deployed Token contract:

1. Set:
- TOKEN_CONTRACT_ADDRESS
- MINT_TO_ADDRESS
- MINT_AMOUNT

2. Run the mint script:

npx hardhat run scripts/mint.ts --network sepolia

Or use the appropriate network for your deployment.

## Environment Variables Reference

### Required for deployment
- SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
- POLYGON_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_KEY
- DEPLOYER_PRIVATE_KEY=your_private_key

### Token deployment
- TOKEN_NAME=XAU Dollar
- TOKEN_SYMBOL=XAU$
- MINT_AMOUNT=1000000
- MINT_TO_ADDRESS=0x...

### Mint script
- TOKEN_CONTRACT_ADDRESS=0x...

## Notes

- Solidity version: 0.8.28
- Framework: Hardhat with TypeScript
- Libraries: @openzeppelin/contracts, ethers.js v6, @nomicfoundation/hardhat-toolbox