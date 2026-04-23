# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for the ADOCF (AI-Driven On-Chain Finance) system.

## Contracts

### Token.sol
An ERC20 token with burn and owner-controlled minting.

Features:
- OpenZeppelin ERC20
- OpenZeppelin ERC20Burnable
- OpenZeppelin Ownable
- Custom events for mint, burn, and transfer actions
- Deployable as:
  - XAU Dollar (`XAU$`) on Sepolia
  - XUS Dollar (`XUS$`) on Polygon Amoy

### LoggingContract.sol
A lightweight on-chain logging contract for storing AI/session logs.

Features:
- Stores session logs with tool calls
- Supports paginated retrieval
- Returns session IDs
- Emits an event when logs are uploaded

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Installation

From the `ADOCF/smart-contracts` directory:

npm install

## Compile

npm run compile

## Deploy Token

### Deploy to Sepolia

Set the environment variables in a local `.env` file based on `.env.example`, then run:

npm run deploy:sepolia

This deploys the Token contract using:
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

If `MINT_AMOUNT` is set, the deploy script can optionally mint tokens to the deployer wallet after deployment.

### Deploy to Polygon Amoy

npm run deploy:polygon

This deploys the Token contract to Polygon Amoy using the same token name and symbol environment variables.

## Deploy LoggingContract

### Deploy to Sepolia

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens to a specific address on an already deployed Token contract:

1. Set:
   - `TOKEN_CONTRACT_ADDRESS`
   - `MINT_TO_ADDRESS`
   - `MINT_AMOUNT`

2. Run:

npm run mint

The mint script connects to the deployed Token contract and mints the specified amount to the target address.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

### Required

- `SEPOLIA_RPC_URL`  
  RPC endpoint for Sepolia.

- `POLYGON_RPC_URL`  
  RPC endpoint for Polygon Amoy.

- `DEPLOYER_PRIVATE_KEY`  
  Private key for the deployer wallet.

- `TOKEN_NAME`  
  Token name used by the deployment script.

- `TOKEN_SYMBOL`  
  Token symbol used by the deployment script.

### Optional

- `MINT_AMOUNT`  
  Amount to mint during deployment or via the mint script.

- `MINT_TO_ADDRESS`  
  Recipient address for minting.

- `TOKEN_CONTRACT_ADDRESS`  
  Deployed Token contract address used by `scripts/mint.ts`.

## Project Structure

- `contracts/Token.sol` - ERC20 token contract
- `contracts/LoggingContract.sol` - session logging contract
- `scripts/1_token.ts` - deploy Token
- `scripts/2_loggingContract.ts` - deploy LoggingContract
- `scripts/mint.ts` - mint tokens to an address
- `hardhat.config.ts` - Hardhat configuration
- `package.json` - project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Notes

- Solidity version: `0.8.28`
- Hardhat is configured with `@nomicfoundation/hardhat-toolbox`
- The project uses TypeScript and ethers.js v6 through Hardhat Toolbox
- Ensure the deployer wallet has enough native token balance to pay gas on the target network