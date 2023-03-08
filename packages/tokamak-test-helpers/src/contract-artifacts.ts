import { ethers } from 'ethers'
import path from 'path'
import glob from 'glob'

/**
 * Gets the hardhat artifact for the given contract name.
 * Will throw an error if the contract artifact is not found.
 *
 * @param name Contract name.
 * @returns The artifact for the given contract name.
 */
/*
export const getContractDefinition = (name: string): any => {
  // We import this using `require` because hardhat tries to build this file when compiling
  // the contracts, but we need the contracts to be compiled before the contract-artifacts.ts
  // file can be generated.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getContractArtifact } = require('./contract-artifacts')
  const artifact = getContractArtifact(name)
  if (artifact === undefined) {
    throw new Error(`Unable to find artifact for contract: ${name}`)
  }
  return artifact
}
*/

export const getContractArtifact = (
  packageName: string,
  name: string
): any => {
  const contractArtifactsFolder = path.resolve(
    __dirname,
    `../node_modules/@tokamak-network/${packageName}/artifacts/contracts`
  )

  const artifactPath = glob
    .sync(`${contractArtifactsFolder}/**/${name}.json`)
    /*.filter((match) => {
      // Filter out the debug outputs.
      return !match.endsWith('.dbg.json')
    })*/

    const artifact = require(artifactPath[0])
}

/**
 * Gets the deployed hardhat artifact for the given contract name.
 * Will throw an error if the contract artifact is not found.
 *
 * @param name Contract name.
 * @param network Network name.
 * @returns The artifact for the given contract name.
 */
export const getDeployedContractDefinition = (
  name: string,
  network: string
): {
  address: string
  abi: any
} => {
  const {
    getDeployedContractArtifact,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./contract-deployed-artifacts')
  const artifact = getDeployedContractArtifact(name, network)
  if (artifact === undefined) {
    throw new Error(
      `Unable to find artifact for contract on network ${network}: ${name}`
    )
  }
  return artifact
}

/**
 * Gets an ethers Interface instance for the given contract name.
 *
 * @param name Contract name.
 * @returns The interface for the given contract name.
 */
/*
export const getContractInterface = (packageName: string, name: string): ethers.utils.Interface => {
  const definition = getContractArtifact(packageName, name)
  return new ethers.utils.Interface(definition.abi)
}
*/

/**
 * Gets an ethers ContractFactory instance for the given contract name.
 *
 * @param name Contract name.
 * @param signer The signer for the ContractFactory to use.
 * @returns The contract factory for the given contract name.
 */
export const getContractFactory = (
  packageName: string,
  name: string,
  signer?: ethers.Signer
): ethers.ContractFactory => {
  const artifact = getContractArtifact(packageName, name)
  //const contractInterface = getContractInterface(packageName, name)
  return new ethers.ContractFactory(
    new ethers.utils.Interface(artifact.abi),
    artifact.bytecode,
    signer
  )
}

