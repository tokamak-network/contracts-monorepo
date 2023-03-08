import { BigNumber, utils } from 'ethers'

export function parseTon(value: string): BigNumber {
  return utils.parseEther(value);
}

export function parseWton(value: string): BigNumber {
  return tonUnitToWtonUnit(utils.parseEther(value));
}

export function tonUnitToWtonUnit(value: BigNumber): BigNumber {
  return BigNumber.from(value).mul(1000000000);
}

export function wtonUnitToTonUnit(value: BigNumber): BigNumber {
  if (value.lt('1000000000')) {
    return BigNumber.from(0);
  }
  return BigNumber.from(value).div(1000000000);
}

