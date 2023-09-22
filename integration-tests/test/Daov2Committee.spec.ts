import { hre, ethers } from 'hardhat';

import { range } from 'lodash';
import { BigNumber, Contract, utils } from 'ethers';

import { createCurrency, createCurrencyRatio } from '@makerdao/currency';

import { Env, attach, marshalString, unmarshalString } from '@tokamak-network/tokamak-test-helpers';

import * as helpers from '@nomicfoundation/hardhat-network-helpers';

import chai = require('chai');
import { solidity } from 'ethereum-waffle'
chai.use(solidity)
const { expect } = chai;
chai.should();

const LOGTX = process.env.LOGTX || false;
const VERBOSE = process.env.VERBOSE || false;

const log = (...args) => LOGTX && console.log(...args);

let o;
process.on('exit', function () {
  console.log(o);
});
const development = true;

const _TON = createCurrency('TON');
const _WTON = createCurrency('WTON');
const TON_UNIT = 'wei';
const WTON_UNIT = 'ray';
const _WTON_TON = createCurrencyRatio(_WTON, _TON);
const WTON_TON_RATIO = _WTON_TON('1');

const e = BigNumber.from('1000000000000000000');

const tokenAmount = _TON('1000'); // 1000 TON
const tokenOwnerInitialBalance = _TON('4000'); // 200000 TON

const totalStakedAmount = tokenOwnerInitialBalance; // 200000 TON
const totalUnstakedAmount = utils.parseEther('49800000'); // 49800000 TON

function toWTONString (bn, d = 10) {
  let isNeg = false;
  if (bn.isNeg()) {
    bn = bn.neg();
    isNeg = true;
  }

  const negSign = isNeg ? '-' : '';

  return negSign + _WTON(toBN(bn), WTON_UNIT).toString(d);
}

/**
 *
 * @param {Contract} seigManager
 * @param {String} layer2Addr
 * @param {String} userAddr
 * @returns {Object.operatorSeigs}
 * @returns {Object.userSeigs}
 */
async function expectedSeigs (env, seigManager, layer2Addr, userAddr) {
  const layer2 = await attach('plasma-evm-contracts', 'Layer2', layer2Addr, { signer: env.owner });
  const tot = await attach('plasma-evm-contracts', 'AutoRefactorCoinage', await seigManager.tot(), { signer: env.owner });
  const coinageAddr = await seigManager.coinages(layer2Addr);
  const coinage = await attach('plasma-evm-contracts', 'AutoRefactorCoinage', coinageAddr, { signer: env.owner });

  // storages
  const operator = await layer2.operator();
  const seigPerBlock = _WTON(await seigManager.seigPerBlock(), WTON_UNIT);
  const prevTotTotalSupply = _WTON(await tot.totalSupply(), WTON_UNIT);
  const prevTotBalance = _WTON(await tot.balanceOf(layer2Addr), WTON_UNIT);
  const prevCoinageTotalSupply = _WTON(await coinage.totalSupply(), WTON_UNIT);
  const prevCoinageOperatorBalance = _WTON(await coinage.balanceOf(operator), WTON_UNIT);
  const prevCoinageUsersBalance = prevCoinageTotalSupply.minus(prevCoinageOperatorBalance);
  const prevCoinageUserBalance = _WTON(await coinage.balanceOf(userAddr), WTON_UNIT);
  const commissioniRate = _WTON(await seigManager.commissionRates(layer2Addr), WTON_UNIT);
  const isCommissionRateNegative = await seigManager.isCommissionRateNegative(layer2Addr);

  // helpers
  const calcNumSeigBlocks = async () => {
    if (await seigManager.paused()) return 0;

    const blockNumber = Number((await ethers.provider.getBlock('latest')).number)
    const lastSeigBlock = Number(await seigManager.lastSeigBlock());
    const unpausedBlock = Number(await seigManager.unpausedBlock());
    const pausedBlock = Number(await seigManager.pausedBlock());

    const span = blockNumber - lastSeigBlock + 1; // + 1 for new block

    if (unpausedBlock < lastSeigBlock) {
      return span;
    }

    return span - (unpausedBlock - pausedBlock);
  }

  const increaseTot = async (env: Env) => {
    const maxSeig = seigPerBlock.times(await calcNumSeigBlocks());
    const tos = _WTON(await env.ton.totalSupply(), TON_UNIT)
      .plus(_WTON(await tot.totalSupply(), WTON_UNIT))
      .minus(_WTON(await env.ton.balanceOf(env.wton.address), TON_UNIT));

    const stakedSeigs = maxSeig.times(prevTotTotalSupply).div(tos);
    const pseigs = maxSeig.minus(stakedSeigs).times(_WTON(env.PSEIG_RATE, WTON_UNIT))
    return {stakedSeigs, pseigs};
  }

  const {stakedSeigs, pseigs} = await increaseTot(env);
  const layer2Seigs = stakedSeigs.plus(pseigs).times(prevTotBalance).div(prevTotTotalSupply);

  const operatorSeigs = layer2Seigs.times(prevCoinageOperatorBalance).div(prevCoinageTotalSupply);
  const usersSeigs = layer2Seigs.times(prevCoinageUsersBalance).div(prevCoinageTotalSupply);

  const _calcSeigsDistribution = () => {
    let operatorSeigsWithCommissionRate = operatorSeigs;
    let usersSeigsWithCommissionRate = usersSeigs;

    if (commissioniRate.toFixed(WTON_UNIT) === '0') {
      return {
        operatorSeigsWithCommissionRate,
        usersSeigsWithCommissionRate,
      };
    }

    if (!isCommissionRateNegative) {
      const commissionFromUsers = usersSeigs.times(commissioniRate);

      operatorSeigsWithCommissionRate = operatorSeigsWithCommissionRate.plus(commissionFromUsers);
      usersSeigsWithCommissionRate = usersSeigsWithCommissionRate.minus(commissionFromUsers);
      return {
        operatorSeigsWithCommissionRate,
        usersSeigsWithCommissionRate,
      };
    }

    if (prevCoinageTotalSupply.toFixed(WTON_UNIT) === '0' ||
      prevCoinageOperatorBalance.toFixed(WTON_UNIT) === '0') {
      return {
        operatorSeigsWithCommissionRate,
        usersSeigsWithCommissionRate,
      };
    }

    const commissionFromOperator = operatorSeigs.times(commissioniRate);

    operatorSeigsWithCommissionRate = operatorSeigsWithCommissionRate.minus(commissionFromOperator);
    usersSeigsWithCommissionRate = usersSeigsWithCommissionRate.plus(commissionFromOperator);

    return {
      operatorSeigsWithCommissionRate,
      usersSeigsWithCommissionRate,
    };
  }

  const {
    operatorSeigsWithCommissionRate,
    usersSeigsWithCommissionRate,
  } = _calcSeigsDistribution();

  const userSeigsWithCommissionRate = usersSeigsWithCommissionRate.times(prevCoinageUserBalance).div(prevCoinageUsersBalance);

  return {
    operatorSeigs: operatorSeigsWithCommissionRate,
    userSeigs: userSeigsWithCommissionRate,
    layer2Seigs: layer2Seigs,
    usersSeigs: usersSeigs,
  };
}

describe('DAOV2Committee Test', function () {
  let operator: SignerWithAddress
  let tokenOwner1: SignerWithAddress
  let tokenOwner2: SignerWithAddress

  const makePos = (v1: BigNumber, v2: BigNumber) => { return v1.shl(128).add(v2); }

  const checkBalanceProm = async (balanceProm, expected, unit) => {
    return checkBalance(await balanceProm, expected, unit);
  }

  const checkBalance = (balanceBN, expected, unit) => {
    const v = balanceBN.sub(BigNumber.from(expected.toFixed(unit))).abs();
    // if (v.cmp(e) > 0) {
    //   console.error(`
    //     actual   : ${balanceBN.toString().padStart(40)}
    //     expected : ${expected.toFixed(unit).padStart(40)}
    //     diff     : ${v.toString().padStart(40)}
    //     e        : ${e.toString().padStart(40)}

    //   `);
    // }
    //v.should.be.bignumber.lte(e);
    expect(v.lte(e))
  }

  /**
   *
   * @param {*} layer2
   * @param {Layer2State} layer2State
   */

  // deploy contract and instances
  beforeEach(async function () {
    [ operator, tokenOwner1, tokenOwner2 ] = await ethers.getSigners();

    this.env = await Env.new(operator);


    console.log("-----------------------------------------")
    console.log("-----------------------------------------")
    console.log("-----------------------------------------")
    console.log("------------------INPUT------------------")
    console.log("-----------------------------------------")
    console.log("-----------------------------------------")
    console.log("-----------------------------------------")
  });

  it('check wtonMinter role', async function () {
    let tx = await this.env.wton.isMinter(this.env.seigManager.address);
    expect(tx).to.be.equal(true)

    await this.env.seigManager.renounceWTONMinter()
    let tx2 = await this.env.wton.isMinter(this.env.seigManager.address);
    expect(tx2).to.be.equal(false)
  });

});
