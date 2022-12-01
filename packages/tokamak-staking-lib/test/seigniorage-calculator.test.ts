import { calculateExpectedSeig, calculateExpectedSeigWithCommission, Calculator } from "../src";
// This relative path is used to specify 'bn.js', not '@types/bn.js', because '@types/bn.js' is not injected to 'chai'.
import { BN } from "../node_modules/bn.js";
const { toBN } = require("web3-utils");
const chai = require("chai");
chai.use(require("chai-bn")(BN)).should();

const RAY: BN = toBN("1000000000000000000000000000"); // 1e+27
const tolerance: BN = toBN("1000000000000000000");

const checkNumber = (
  a: BN,
  b: BN
) => {
  const v: BN = a.sub(b).abs();
  v.should.be.bignumber.lte(tolerance);
};

describe("calculateExpectedSeig function", function () {
  it("should get correct value", function () {
    const fromBlockNumber: BN = new BN("1");
    const toBlockNumber: BN = new BN("10000");
    const userStakedAmount: BN = toBN("1000").mul(RAY);
    const totalStakedAmount: BN = toBN("2000000").mul(RAY);
    const totalSupplyOfTON: BN = toBN("50000000").mul(RAY);
    const pseigRate: BN = toBN("4").mul(RAY).div(toBN("10"));

    const result: BN = calculateExpectedSeig(fromBlockNumber, toBlockNumber, userStakedAmount, totalStakedAmount, totalSupplyOfTON, pseigRate);

    const expected: BN = toBN("8309568960000000000000000000");
    result.should.be.bignumber.equal(expected);
  });
});

describe("calculateExpectedSeigWithCommission function", function () {
  it("should get correct value", function () {
    const result: BN = calculateExpectedSeigWithCommission(
      toBN("1"),
      toBN("10000"),
      toBN("5000").mul(RAY),
      toBN("2000000").mul(RAY),
      toBN("50000000").mul(RAY),
      toBN("4").mul(RAY).div(toBN("10")),
      toBN("7").mul(RAY).div(toBN("10")),
      true,
      toBN("500000").mul(RAY),
      toBN("1000000").mul(RAY),
      false
    );

    const expected: BN = toBN("70631336160001000000000000000");
    checkNumber(result, expected);
  });
});

describe("Calculator class", function () {
  let calculator = new Calculator();
  beforeEach(async function () {
    calculator.setTotalStakedAmount(toBN("2000000").mul(RAY));
  });
  it("should get correct value", function () {
    const fromBlockNumber: BN = new BN("1");
    const toBlockNumber: BN = new BN("10000");
    const userStakedAmount: BN = toBN("1000").mul(RAY);

    const result: BN = calculator.getExpectedSeig(fromBlockNumber, toBlockNumber, userStakedAmount);

    const expected: BN = toBN("8309568960000000000000000000");
    result.should.be.bignumber.equal(expected);
  });
});