import { ethers } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as types from 'hardhat/internal/core/params/argumentTypes'

task('deploy-swap-proxy')
  .setAction(
    async (args: any, hre: HardhatRuntimeEnvironment) => {
      const { deploy } = hre.deployments
      const { deployer } = await hre.getNamedAccounts()

      console.log('Deploying SwapProxy')
      const deployedContract = await deploy('SwapProxy', {
        from: deployer,
        waitConfirmations: 6,
      })

      if (hre.network.live === true) {
        console.log('Verifying SwapProxy')
        await hre.run("verify", {
          address: deployedContract.address,
          network: hre.network.name,
        });
      }
      console.log('Done.')
    }
  )
