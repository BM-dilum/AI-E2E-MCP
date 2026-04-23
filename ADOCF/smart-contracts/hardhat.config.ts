import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "";
const polygonRpcUrl = process.env.POLYGON_RPC_URL ?? "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
    polygonAmoy: {
      url: polygonRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;