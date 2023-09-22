import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { expect } from './expect'
import { Contract, BigNumber, ContractTransaction } from 'ethers'

export default async function snapshotGasCost(
  x:
    | TransactionResponse
    | Promise<TransactionResponse>
    | ContractTransaction
    | Promise<ContractTransaction>
    | TransactionReceipt
    | Promise<BigNumber>
    | BigNumber
    | Contract
    | Promise<Contract>
): Promise<void> {
  const resolved = await x
  if ('deployTransaction' in resolved) {
    const receipt = await resolved.deployTransaction.wait()
    // console.log('gasUsed : ',receipt.gasUsed.toNumber())

    // expect(receipt.gasUsed.toNumber()).toMatchSnapshot()
  } else if ('wait' in resolved) {
    const waited = await resolved.wait()
    // expect(waited.gasUsed.toNumber()).toMatchSnapshot()

    // console.log('gasUsed : ',waited.gasUsed.toNumber())
  } else if (BigNumber.isBigNumber(resolved)) {
    // expect(resolved.toNumber()).toMatchSnapshot()

    // console.log('gasUsed : ',resolved.gasUsed.toNumber())
  }
}
