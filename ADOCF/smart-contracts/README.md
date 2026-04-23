# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for ADOCF, an AI-Driven On-Chain Finance system.

## Contracts

### Token.sol
An ERC20 token with burn and owner-controlled minting.

Features:
- OpenZeppelin ERC20
- OpenZeppelin ERC20Burnable
- OpenZeppelin Ownable
- `mint(address to, uint256 amount)` for the owner
- `burnTokens(uint256 amount)` for token holders
- `transferTokens(address to, uint256 amount)` for token holders
- Events for minting, burning, and transfers

Deployment targets:
- Sepolia: XAU token
  - Name: `XAU Dollar`
  - Symbol: `XAU$`
- Polygon Amoy: XUS token
  - Name: `XUS Dollar`
  - Symbol: `XUS$`

### LoggingContract.sol
A session-based logging contract for storing AI interaction logs on-chain.

Features:
- Stores session logs with user requests, responses, and tool calls
- Supports paginated retrieval of sessions in reverse chronological order
- Tracks all session IDs
- Emits an event when logs are uploaded

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet private key
- RPC URLs for Sepolia and Polygon Amoy

## Setup

1. Install dependencies:
   npm install

2. Copy the environment example:
   cp .env.example .env

3. Fill in the values in `.env`

## Compile

Run:

npm run compile

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

## Deploy LoggingContract

### Deploy to Sepolia
Run:

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy
Run:

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens after deployment, set:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`

Then run:

npm run mint

The mint script connects to the deployed Token contract and mints the specified amount to the target address.

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | RPC URL for Sepolia | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_RPC_URL` | RPC URL for Polygon Amoy | `https://polygon-amoy.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | Private key for deployment wallet | `your_private_key` |
| `TOKEN_NAME` | Token name used by deployment script | `XAU Dollar` |
| `TOKEN_SYMBOL` | Token symbol used by deployment script | `XAU$` |
| `MINT_AMOUNT` | Amount to mint in deployment/mint scripts | `1000000` |
| `MINT_TO_ADDRESS` | Recipient address for minting | `0x...` |
| `TOKEN_CONTRACT_ADDRESS` | Deployed Token contract address | `0x...` |

## Project Structure

- `contracts/Token.sol` - ERC20 token contract
- `contracts/LoggingContract.sol` - on-chain logging contract
- `scripts/1_token.ts` - deploy Token contract
- `scripts/2_loggingContract.ts` - deploy LoggingContract
- `scripts/mint.ts` - mint tokens to a target address
- `hardhat.config.ts` - Hardhat configuration
- `package.json` - project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Notes

- The Token contract uses OpenZeppelin access control via `Ownable`.
- Only the owner can mint new tokens.
- Burning and transferring are available to token holders through helper functions.
- The LoggingContract stores structured session data and supports paginated reads for efficient retrieval.