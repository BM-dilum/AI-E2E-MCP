# Smart Contracts

Hardhat + TypeScript smart contracts project for the AI-Driven On-Chain Finance system.

## Overview

This project includes two Solidity contracts:

### Token
An ERC20 token with burn and owner-controlled minting support.

- Inherits from OpenZeppelin `ERC20`, `ERC20Burnable`, and `Ownable`
- Supports:
  - `mint(address to, uint256 amount)` for owner-only minting
  - `burnTokens(uint256 amount)` for burning from the caller
  - `transferTokens(address to, uint256 amount)` for transferring from the caller
- Emits:
  - `Minted`
  - `Burned`
  - `TokenTransferred`

Deployment targets:
- Sepolia: `XAU Dollar` / `XAU$`
- Polygon Amoy: `XUS Dollar` / `XUS$`

### LoggingContract
A session-based on-chain logging contract for storing AI interaction logs.

- Stores session logs with tool call metadata
- Supports paginated retrieval of sessions
- Returns sessions in reverse chronological order
- Emits `LogsUploaded` on upload

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet private key
- RPC URLs for Sepolia and Polygon Amoy

## Install

From this directory:

npm install

## Compile

npm run compile

## Deploy Token

### Sepolia

Set environment variables in a local `.env` file based on `.env.example`, then run:

npm run deploy:sepolia

This deploys the Token contract using:
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

If `MINT_AMOUNT` is set, the deploy script can mint to the deployer wallet after deployment.

### Polygon Amoy

npm run deploy:polygon

This deploys the Token contract to Polygon Amoy using the same token name and symbol environment variables.

## Deploy LoggingContract

### Sepolia

npm run deploy:logging:sepolia

### Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens to a specific address on an already deployed Token contract:

1. Set:
   - `TOKEN_CONTRACT_ADDRESS`
   - `MINT_TO_ADDRESS`
   - `MINT_AMOUNT`

2. Run:

npm run mint

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

### Required

- `SEPOLIA_RPC_URL` - RPC endpoint for Sepolia
- `POLYGON_RPC_URL` - RPC endpoint for Polygon Amoy
- `DEPLOYER_PRIVATE_KEY` - Private key for deployment wallet

### Token Deployment

- `TOKEN_NAME` - ERC20 token name
- `TOKEN_SYMBOL` - ERC20 token symbol
- `MINT_AMOUNT` - Optional mint amount used by deployment/mint scripts
- `MINT_TO_ADDRESS` - Address to receive minted tokens
- `TOKEN_CONTRACT_ADDRESS` - Deployed Token contract address for minting

## Project Scripts

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:sepolia` - Deploy Token to Sepolia
- `npm run deploy:polygon` - Deploy Token to Polygon Amoy
- `npm run deploy:logging:sepolia` - Deploy LoggingContract to Sepolia
- `npm run deploy:logging:polygon` - Deploy LoggingContract to Polygon Amoy
- `npm run mint` - Mint tokens to a target address

## Notes

- Solidity version: `0.8.28`
- Hardhat is configured with TypeScript
- Uses `ethers.js v6` via Hardhat Toolbox
- Uses OpenZeppelin Contracts for secure token implementation