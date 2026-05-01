# Smart Contracts

This package contains the Hardhat smart contracts project for the AI-Driven On-Chain Finance system.

## Overview

### Token.sol
An ERC20 token with burn and owner-controlled minting capabilities.

Features:
- ERC20 standard token
- Burnable by token holders
- Owner-only minting
- Custom events for mint, burn, and transfers

### LoggingContract.sol
A lightweight on-chain logging contract for storing session-based AI interaction logs.

Features:
- Stores session logs with user requests, responses, and tool calls
- Supports paginated retrieval of stored sessions
- Tracks uploaded session IDs
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

From this directory:

```bash
npm install
```

## Compile

```bash
npm run compile
```

## Deploy Token to Sepolia

Set the required environment variables in a local `.env` file, then run:

```bash
npm run deploy:sepolia
```

The deployment script will:
- deploy the Token contract using `TOKEN_NAME` and `TOKEN_SYMBOL`
- print the deployed contract address
- optionally mint `MINT_AMOUNT` tokens to the deployer if `MINT_AMOUNT` is set

## Deploy Token to Polygon Amoy

```bash
npm run deploy:polygon
```

## Deploy LoggingContract

Deploy to Sepolia:

```bash
npm run deploy:logging:sepolia
```

Deploy to Polygon Amoy:

```bash
npm run deploy:logging:polygon
```

## Mint Tokens

After deploying the Token contract, mint tokens to an address with:

```bash
npm run mint
```

Required environment variables:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`

## Environment Variables Reference

Copy `.env.example` to `.env` and fill in the values.

- `SEPOLIA_RPC_URL` - RPC endpoint for Sepolia
- `POLYGON_RPC_URL` - RPC endpoint for Polygon Amoy
- `DEPLOYER_PRIVATE_KEY` - private key for the deployer wallet
- `TOKEN_NAME` - token name used during deployment
- `TOKEN_SYMBOL` - token symbol used during deployment
- `MINT_AMOUNT` - amount to mint during deployment or mint script
- `MINT_TO_ADDRESS` - recipient address for minting
- `TOKEN_CONTRACT_ADDRESS` - deployed Token contract address for minting script

## Notes

- Solidity version: 0.8.28
- Framework: Hardhat with TypeScript
- Libraries: OpenZeppelin Contracts, ethers.js v6, Hardhat Toolbox