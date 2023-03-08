import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from 'dotenv'
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";

import 'hardhat-deploy';
//import './tasks'

dotenv.config()

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      live: false,
      saveDeployments: false,
    }
  },
  solidity: {
    version: '0.5.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  },
  mocha: {
    timeout: 10000000
  }
};

export default config;
