# Smart Contracts

This package contains the Hardhat smart contracts project for the AI-Driven On-Chain Finance system.

## Contracts

### Token
`contracts/Token.sol`

An ERC20 token with burn and owner-only mint functionality.

Features:
- OpenZeppelin ERC20
- OpenZeppelin ERC20Burnable
- OpenZeppelin Ownable
- Custom events for mint, burn, and transfer actions
- Deployable as multiple token instances

Planned deployments:
- XAU on Sepolia
  - Name: `XAU Dollar`
  - Symbol: `XAU$`
- XUS on Polygon Amoy
  - Name: `XUS Dollar`
  - Symbol: `XUS$`

### LoggingContract
`contracts/LoggingContract.sol`

A session-based logging contract for storing AI interaction logs on-chain.

Features:
- Stores session logs with tool call details
- Supports paginated retrieval
- Returns session IDs
- Emits upload events for indexing and monitoring

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Setup

Install dependencies:

npm install

Copy the example environment file:

cp .env.example .env

Fill in the required values in `.env`.

## Compile

npm run compile

## Deploy Token

### Deploy to Sepolia

npm run deploy:sepolia

This uses:
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

Optional:
- `MINT_AMOUNT` to mint tokens to the deployer after deployment

### Deploy to Polygon Amoy

npm run deploy:polygon

This uses:
- `TOKEN_NAME`
- `TOKEN_SYMBOL`

Optional:
- `MINT_AMOUNT` to mint tokens to the deployer after deployment

## Deploy LoggingContract

### Deploy to Sepolia

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens on an already deployed Token contract:

npm run mint

Required environment variables:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_AMOUNT`
- `MINT_TO_ADDRESS`

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | RPC endpoint for Sepolia | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_RPC_URL` | RPC endpoint for Polygon Amoy | `https://polygon-amoy.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | Private key for deployment wallet | `your_private_key` |
| `TOKEN_NAME` | Token name used by deployment scripts | `XAU Dollar` |
| `TOKEN_SYMBOL` | Token symbol used by deployment scripts | `XAU$` |
| `MINT_AMOUNT` | Amount to mint in deployment/mint scripts | `1000000` |
| `MINT_TO_ADDRESS` | Recipient address for minting | `0x...` |
| `TOKEN_CONTRACT_ADDRESS` | Deployed Token contract address | `0x...` |

## Project Structure

- `contracts/Token.sol` - ERC20 token contract
- `contracts/LoggingContract.sol` - on-chain logging contract
- `scripts/1_token.ts` - deploy Token contract
- `scripts/2_loggingContract.ts` - deploy LoggingContract
- `scripts/mint.ts` - mint tokens to a recipient
- `hardhat.config.ts` - Hardhat configuration
- `package.json` - project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Notes

- The deployment scripts use `ethers` from `hardhat`.
- Ensure the deployer wallet has enough native token balance for gas on the selected network.
- The Token contract owner is the deployer account used during deployment.