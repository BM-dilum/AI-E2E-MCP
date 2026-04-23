# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for ADOCF, an AI-Driven On-Chain Finance system.

## Contracts

### Token.sol
An ERC20 token with burn and owner-controlled minting.

Features:
- OpenZeppelin ERC20
- OpenZeppelin ERC20Burnable
- OpenZeppelin Ownable
- `mint(address to, uint256 amount)` for owner-only minting
- `burnTokens(uint256 amount)` for burning from the caller
- `transferTokens(address to, uint256 amount)` for transferring from the caller

Deployment targets:
- Sepolia: XAU Dollar (`XAU$`)
- Polygon Amoy: XUS Dollar (`XUS$`)

### LoggingContract.sol
A session-based logging contract for storing AI/tool interaction logs on-chain.

Features:
- Stores session logs with tool call details
- Paginated retrieval in reverse chronological order
- Session ID listing
- Emits upload events for indexing and auditability

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Setup

Install dependencies:

npm install

Copy the environment example and fill in your values:

cp .env.example .env

## Environment Variables

| Variable | Description |
| --- | --- |
| `SEPOLIA_RPC_URL` | RPC URL for Sepolia |
| `POLYGON_RPC_URL` | RPC URL for Polygon Amoy |
| `DEPLOYER_PRIVATE_KEY` | Private key used for deployment and minting |
| `TOKEN_NAME` | Token name used by the deployment script |
| `TOKEN_SYMBOL` | Token symbol used by the deployment script |
| `MINT_AMOUNT` | Optional mint amount used by deployment and mint scripts |
| `MINT_TO_ADDRESS` | Recipient address for minting |
| `TOKEN_CONTRACT_ADDRESS` | Deployed Token contract address for minting |

## Compile

Compile the contracts:

npm run compile

## Deploy Token

The token deployment script deploys `Token.sol` using `TOKEN_NAME` and `TOKEN_SYMBOL`.

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

If `MINT_AMOUNT` is set, the token deployment script will mint that amount to the deployer wallet after deployment.

## Deploy LoggingContract

Deploy the logging contract to Sepolia:

npm run deploy:logging:sepolia

Deploy the logging contract to Polygon Amoy:

npm run deploy:logging:polygon

## Mint Tokens

Use the mint script to mint tokens from the owner account to a recipient address.

Required environment variables:
- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`

Run:

npm run mint

## Scripts

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:sepolia` - Deploy Token to Sepolia
- `npm run deploy:polygon` - Deploy Token to Polygon Amoy
- `npm run deploy:logging:sepolia` - Deploy LoggingContract to Sepolia
- `npm run deploy:logging:polygon` - Deploy LoggingContract to Polygon Amoy
- `npm run mint` - Mint tokens to a recipient

## Notes

- The deploy scripts use `ethers` from Hardhat.
- Ensure the deployer wallet has enough native token balance to pay gas fees.
- The token contract owner is the deployer address used at deployment time.