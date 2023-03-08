import 'ethers';
//import { getContractFactory } from './contract-artifacts'
import { getContractFactoryPlasmaEvm } from '@tokamak-network/plasma-evm-contracts'

export const deploy = async (
  packageName:string,
  name: string,
  opts?: {
    args?: any[]
    signer?: any
  }
) => {
  //const factory = await ethers.getContractFactory(name, opts?.signer)
  let factory;
  if (packageName == "plasma-evm-contracts") {
    //console.log(`name: ${name}`)
    //const temp = getContractFactoryPlasmaEvm(name)
    //console.log(`temp: ${JSON.stringify(temp)}`)
    //factory = getContractArtifactPlasmaEvm(name).connect(opts?.signer)
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  }
  //console.log(`###deploy::TEST 1`)
  return factory.deploy(...(opts?.args || []))
}

export const attach = async (
  packageName:string,
  name: string,
  address: string,
  opts?: {
    signer?: any
  }
) => {
  //const factory = await ethers.getContractFactory(name, opts?.signer)
  //const factory = getContractFactory(packageName, name).connect(opts?.signer)
  let factory;
  if (packageName == "plasma-evm-contracts") {
    //factory = getContractArtifactPlasmaEvm(name).connect(opts?.signer)
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  }
  return factory.attach(address);
}
