import 'ethers';
import { getContractFactoryPlasmaEvm } from '@tokamak-network/plasma-evm-contracts'
import { getContractFactoryTokamakDaoV2 } from '@tokamak-network/tokamak-daov2-contracts'

export const deploy = async (
  packageName:string,
  name: string,
  opts?: {
    args?: any[]
    signer?: any
    libraries?: {}
  }
) => {
  let factory;
  if (packageName == "plasma-evm-contracts") {
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  } else if ( packageName == "tokamak-daov2-contracts") {
    factory = getContractFactoryTokamakDaoV2(name, opts?.signer)
  }
  return factory.deploy(...(opts?.args || []))
}

export const attach = async (
  packageName:string,
  name: string,
  address: string,
  opts?: {
    signer?: any
    libraries?: {}
  }
) => {
  let factory;
  if (packageName == "plasma-evm-contracts") {
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  } else if ( packageName == "tokamak-daov2-contracts") {
    factory = getContractFactoryTokamakDaoV2(name, opts?.signer)
  }
  return factory.attach(address);
}
