import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-waffle';
import '@nomicfoundation/hardhat-chai-matchers';
import 'hardhat-typechain';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';
import '@openzeppelin/hardhat-access-list';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 20000,
  },
  typechain: {
    outDir: './typechain',
    alwaysGenerateOverloads: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  coverageReporter: {
    directory: './coverage',
    reporter: ['text', 'lcov', 'clover'],
  },
};

export default config;