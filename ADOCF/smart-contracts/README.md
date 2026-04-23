# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for ADOCF (AI-Driven On-Chain Finance).

## Overview

### Token.sol
An ERC20 token contract with burn and owner-controlled minting capabilities.

- Inherits from OpenZeppelin:
  - ERC20
  - ERC20Burnable
  - Ownable
- Custom functions:
  - `mint(address to, uint256 amount)` — owner-only minting
  - `burnTokens(uint256 amount)` — burn tokens from caller balance
  - `transferTokens(address to, uint256 amount)` — transfer tokens from caller to recipient
- Custom events:
  - `Minted(address indexed to, uint256 amount)`
  - `Burned(address indexed from, address indexed to, uint256 amount)`
  - `TokenTransferred(address indexed from, address indexed to, uint256 amount)`

Deployment targets:
- Sepolia: XAU token
  - Name: `XAU Dollar`
  - Symbol: `XAU$`
- Polygon Amoy: XUS token
  - Name: `XUS Dollar`
  - Symbol: `XUS$`

### LoggingContract.sol
A lightweight on-chain logging contract for storing AI session logs.

- Stores session logs grouped by session ID
- Supports paginated retrieval of sessions in reverse chronological order
- Tracks all session IDs
- Emits an event whenever logs are uploaded

Data model:
- `ToolCall`
- `LogEntry`
- `SessionDataEntry`

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Install

From the `ADOCF/smart-contracts` directory:

npm install

## Compile

npm run compile

## Test

npm test

## Environment Setup

Copy `.env.example` to `.env` and fill in the values:

cp .env.example .env

## Deploy Token

### Deploy to Sepolia

Set:
- `TOKEN_NAME=XAU Dollar`
- `TOKEN_SYMBOL=XAU$`

Then run:

npm run deploy:sepolia

### Deploy to Polygon Amoy

Set:
- `TOKEN_NAME=XUS Dollar`
- `TOKEN_SYMBOL=XUS$`

Then run:

npm run deploy:polygon

### Optional mint on deployment

If `MINT_AMOUNT` is set, the token deployment script can mint tokens to the deployer wallet after deployment.

## Deploy LoggingContract

### Deploy to Sepolia

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens to a specific address using an already deployed Token contract:

1. Set:
   - `TOKEN_CONTRACT_ADDRESS`
   - `MINT_TO_ADDRESS`
   - `MINT_AMOUNT`

2. Run:

npm run deploy:mint

If your package scripts are configured to use the mint script directly, you can also execute it with Hardhat:

npx hardhat run scripts/mint.ts --network sepolia

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | RPC endpoint for Sepolia | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_RPC_URL` | RPC endpoint for Polygon Amoy | `https://polygon-amoy.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | 0x-prefixed 32-byte hex private key used for deployment; must be 64 hex characters after `0x` (for example, `0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`) | `0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| `TOKEN_NAME` | Token name used by deployment script | `XAU Dollar` |
| `TOKEN_SYMBOL` | Token symbol used by deployment script | `XAU$` |
| `MINT_AMOUNT` | Amount to mint in deployment/mint scripts | `1000000` |
| `MINT_TO_ADDRESS` | Recipient address for minting | `0x...` |
| `TOKEN_CONTRACT_ADDRESS` | Deployed Token contract address | `0x...` |

## Notes

- The Token contract uses OpenZeppelin ownership controls, so only the deployer/owner can mint.
- The LoggingContract stores session logs on-chain and returns them in reverse order for easier access to the newest sessions first.
- Ensure the deployer wallet has enough native token balance to pay gas on the selected network.