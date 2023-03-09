import 'ethers';
import { getContractFactoryPlasmaEvm } from '@tokamak-network/plasma-evm-contracts'

export const deploy = async (
  packageName:string,
  name: string,
  opts?: {
    args?: any[]
    signer?: any
  }
) => {
  let factory;
  if (packageName == "plasma-evm-contracts") {
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  }
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
  let factory;
  if (packageName == "plasma-evm-contracts") {
    factory = getContractFactoryPlasmaEvm(name, opts?.signer)
  }
  return factory.attach(address);
}
