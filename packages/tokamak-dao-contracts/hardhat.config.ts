import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from 'dotenv'
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";

import 'hardhat-deploy';

dotenv.config()

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      live: false,
      saveDeployments: false,
    },
    goerli: {
      live: true,
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      "goerli": process.env.DEPLOYER_GOERLI,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
