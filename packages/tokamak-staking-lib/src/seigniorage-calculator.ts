import BN from "bn.js";
const { toBN } = require("web3-utils");

const RAY = toBN("1000000000000000000000000000"); // 1e+27

const SEIG_PER_BLOCK = toBN("3920000000000000000000000000"); // 3.92 in ray
const DEFAULT_PSEIG_RATE = toBN("400000000000000000000000000"); // 0.4 in ray
const DEFAULT_TOTALSUPPLY_OF_TON = toBN("50000000000000000000000000000000000"); // 50,000,000 in ray

export const calculateExpectedSeig = (
  fromBlockNumber: BN,
  toBlockNumber: BN,
  userStakedAmount: BN,
  totalStakedAmount: BN,
  totalSupplyOfTON: BN,
  pseigRate: BN
): BN => {
  const seigPerBlock = SEIG_PER_BLOCK;
  const blockNumbers = toBlockNumber.sub(fromBlockNumber);

  const totalMaxSeig = seigPerBlock.mul(blockNumbers);
  const totalBasicSeig = totalMaxSeig.mul(totalStakedAmount).div(totalSupplyOfTON);
  const unstakedSeig = totalMaxSeig.sub(totalBasicSeig);
  const totalPseig = unstakedSeig.mul(pseigRate).div(RAY);

  const userBasicSeig = totalBasicSeig.mul(userStakedAmount).div(totalStakedAmount);
  const userPseig = totalPseig.mul(userStakedAmount).div(totalStakedAmount);

  return userBasicSeig.add(userPseig);
};

export const calculateExpectedSeigWithCommission = (
  fromBlockNumber: BN,
  toBlockNumber: BN,
  userStakedAmount: BN,
  totalStakedAmount: BN,
  totalSupplyOfTON: BN,
  pseigRate: BN,
  commissionRate: BN,
  isCommissionRateNegative: boolean,
  operatorStakedAmount: BN,
  totalStakedAmountOnLayer2: BN,
  isOperator: boolean
): BN => {
  if (fromBlockNumber === toBlockNumber ||
    totalStakedAmount === toBN("0") ||
    totalStakedAmountOnLayer2 === toBN("0")) {
    return toBN("0");
  }

  if (commissionRate === new BN("0")) {
    const userSeig = calculateExpectedSeig(
      fromBlockNumber,
      toBlockNumber,
      userStakedAmount,
      totalStakedAmount,
      totalSupplyOfTON,
      pseigRate
    );

    return userSeig;
  }

  const seigPerBlock = SEIG_PER_BLOCK;
  const blockNumbers = toBlockNumber.sub(fromBlockNumber);

  const totalMaxSeig = seigPerBlock.mul(blockNumbers);
  const totalBasicSeig = totalMaxSeig.mul(totalStakedAmount).div(totalSupplyOfTON);
  const unstakedSeig = totalMaxSeig.sub(totalBasicSeig);
  const totalPseig = unstakedSeig.mul(pseigRate).div(RAY);

  const totalSeigOnLayer2 = calculateExpectedSeig(
    fromBlockNumber,
    toBlockNumber,
    totalStakedAmountOnLayer2,
    totalStakedAmount,
    totalSupplyOfTON,
    pseigRate
  );

  if (isCommissionRateNegative === false) {
    const commission = totalSeigOnLayer2.mul(commissionRate).div(RAY);
    const restSeig = totalSeigOnLayer2.sub(commission);

    if (isOperator === true) {
      return restSeig.mul(operatorStakedAmount).div(totalStakedAmountOnLayer2).add(commission);
    } else {
      return restSeig.mul(userStakedAmount).div(totalStakedAmountOnLayer2);
    }
  } else {
    const operatorRate = operatorStakedAmount.mul(RAY).div(totalStakedAmountOnLayer2);
    const commission = totalSeigOnLayer2.mul(operatorRate).div(RAY).mul(commissionRate).div(RAY);
    const delegatorSeigs = operatorRate === RAY
      ? commission
      : commission.mul(RAY).div(RAY.sub(operatorRate));
    const burnAmount = operatorRate === RAY
      ? commission
      : commission.add(delegatorSeigs.mul(operatorRate).div(RAY));

    if (isOperator === true) {
      return totalSeigOnLayer2.add(delegatorSeigs).mul(operatorStakedAmount).div(totalStakedAmountOnLayer2).sub(burnAmount);
    } else {
      return totalStakedAmountOnLayer2.add(totalSeigOnLayer2).add(delegatorSeigs).mul(userStakedAmount).div(totalStakedAmountOnLayer2).sub(userStakedAmount);
    }
  }
};

export class Calculator {
  seigPerBlock: BN;
  pseigRate: BN;
  totalSupplyOfTON: BN;
  totalStakedAmount: BN;

  constructor() {
    this.seigPerBlock = SEIG_PER_BLOCK;
    this.pseigRate = DEFAULT_PSEIG_RATE;
    this.totalSupplyOfTON = DEFAULT_TOTALSUPPLY_OF_TON;
  }

  public setSeigPerBlock(seig: BN) {
    this.seigPerBlock = seig;
  }

  public setPseigRate(rate: BN) {
    this.pseigRate = rate;
  }

  public setTotalSupplyOfTON(totalSupply: BN) {
    this.totalSupplyOfTON = totalSupply;
  }

  public setTotalStakedAmount(amount: BN) {
    this.totalStakedAmount = amount;
  }

  public getExpectedSeig(
    fromBlockNumber: BN,
    toBlockNumber: BN,
    userStakedAmount: BN
  ): BN {
    return calculateExpectedSeig(fromBlockNumber, toBlockNumber, userStakedAmount, this.totalStakedAmount, this.totalSupplyOfTON, this.pseigRate);
  }
}