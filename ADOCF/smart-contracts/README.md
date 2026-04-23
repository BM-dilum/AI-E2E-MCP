# ADOCF Smart Contracts

This package contains the Hardhat smart contracts project for ADOCF (AI-Driven On-Chain Finance).

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
- Sepolia: XAU Dollar (`XAU$`)
- Polygon Amoy: XUS Dollar (`XUS$`)

### LoggingContract.sol
A session-based logging contract for storing AI/tool interaction logs on-chain.

Features:
- Stores session logs with tool call details
- Paginated retrieval of sessions in reverse chronological order
- Session ID listing
- Emits an event when logs are uploaded

## Prerequisites

- Node.js 18+ recommended
- npm
- A funded deployer wallet for the target network
- RPC URLs for Sepolia and Polygon Amoy

## Setup

Install dependencies:

npm install

Create your local environment file from the example:

cp .env.example .env

Fill in the required values in `.env`.

## Compile

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

npm run deploy:logging:sepolia

### Deploy to Polygon Amoy

npm run deploy:logging:polygon

## Mint Tokens

To mint tokens to a specific address after deployment, set:

- `TOKEN_CONTRACT_ADDRESS`
- `MINT_TO_ADDRESS`
- `MINT_AMOUNT`

Then run:

npm run mint

`MINT_AMOUNT` is a human-readable whole-token amount. The mint script converts it with `parseUnits(mintAmount, 18)` before calling the contract, so for an 18-decimal token, `1` means 1 token and `1000000` means 1,000,000 tokens.

If `MINT_AMOUNT` is also set during token deployment, the deploy script may mint to the deployer wallet automatically depending on the script configuration.

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | RPC endpoint for Sepolia | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `POLYGON_RPC_URL` | RPC endpoint for Polygon Amoy | `https://polygon-amoy.infura.io/v3/YOUR_KEY` |
| `DEPLOYER_PRIVATE_KEY` | Private key used for deployment | `your_private_key` |
| `TOKEN_NAME` | ERC20 token name | `XAU Dollar` |
| `TOKEN_SYMBOL` | ERC20 token symbol | `XAU$` |
| `MINT_AMOUNT` | Human-readable whole-token amount to mint; converted with `parseUnits(mintAmount, 18)` | `1000000` |
| `MINT_TO_ADDRESS` | Recipient address for minting | `0x...` |
| `TOKEN_CONTRACT_ADDRESS` | Deployed token contract address | `0x...` |

## Notes

- The token contract owner is the deployer address.
- Only the owner can mint new tokens.
- Burning and transfers are available to token holders through helper functions.
- Logging data is stored on-chain and can be queried in pages using `getLogs(page, pageSize)`.