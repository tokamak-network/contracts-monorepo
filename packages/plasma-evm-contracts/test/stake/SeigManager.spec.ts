import { hre, ethers } from 'hardhat';

import { range } from 'lodash';
import { BigNumber, Contract, utils } from 'ethers';

import { createCurrency, createCurrencyRatio } from '@makerdao/currency';

import { deploy, attach } from '../helpers/deploy';
import { Env } from '../helpers/env';

import * as helpers from '@nomicfoundation/hardhat-network-helpers';

import { marshalString, unmarshalString } from '../helpers/marshal';

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
  // contracts
  const layer2 = await attach('Layer2', layer2Addr);
  const ton = await attach('TON', await seigManager.ton());
  const wton = await attach('WTON', await seigManager.wton());
  const tot = await attach('AutoRefactorCoinage', await seigManager.tot());
  const coinageAddr = await seigManager.coinages(layer2Addr);
  const coinage = await attach('AutoRefactorCoinage', coinageAddr);

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
    const tos = _WTON(await ton.totalSupply(), TON_UNIT)
      .plus(_WTON(await tot.totalSupply(), WTON_UNIT))
      .minus(_WTON(await ton.balanceOf(wton.address), TON_UNIT));

    const stakedSeigs = maxSeig.times(prevTotTotalSupply).div(tos);
    const pseigs = maxSeig.minus(stakedSeigs).times(env.PSEIG_RATE)
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

describe('stake/SeigManager', function () {
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
    v.should.be.bignumber.lte(e);
  }

  /**
   *
   * @param {*} layer2
   * @param {Layer2State} layer2State
   */
  const submitDummyNRE = async (layer2: Contract, layer2State: Layer2State) => {
    const pos1 = makePos(layer2State.currentFork, layer2State.lastEpoch.add(1));
    const pos2 = makePos(layer2State.lastBlock.add(1), layer2State.lastBlock.add(layer2State.NRE_LENGTH));

    //layer2State.lastEpoch += 2; // skip ORE
    layer2State.lastEpoch = layer2State.lastEpoch.add(2) // skip ORE
    //layer2State.lastBlock += layer2State.NRE_LENGTH;
    layer2State.lastBlock = layer2State.lastBlock.add(layer2State.NRE_LENGTH);

    const COST_NRB = await layer2.COST_NRB();

    return await layer2.submitNRE(
      pos1,
      pos2,
      dummyStatesRoot,
      dummyTransactionsRoot,
      dummyReceiptsRoot,
      { value: COST_NRB },
    );
  }

  const submitDummyNREs = async (layer2, layer2State, n) => {
    for (const _ of range(n)) {
      await helpers.time.increase(3);
      await submitDummyNRE(layer2, layer2State);
    }
  }

  const advanceBlocks = async (count) => {
    await helpers.mine(count);
  }

  // deploy contract and instances
  beforeEach(async function () {
    [ operator, tokenOwner1, tokenOwner2 ] = await ethers.getSigners();

    this.env = await Env.new(operator);
  });

  it('minimum deposit amount', async function () {
    const minimumAmount = _WTON('1001');
    await this.env.seigManager.setMinimumAmount(minimumAmount.toFixed(WTON_UNIT));
    await this.env.wton.swapFromTONAndTransfer(operator.address, tokenAmount.toFixed(TON_UNIT));

    await this.env.wton.connect(operator).approve(this.env.depositManager.address, tokenAmount.toFixed(WTON_UNIT));
    await expect(
      this.env.deposit(operator, this.env.layer2s[0].address, tokenAmount.toFixed(WTON_UNIT))
    ).to.be.revertedWith("minimum amount is required");
  });

  describe('when the token owner are the only depositor of each layer2', function () {
    beforeEach(async function () {
      await this.env.wton.swapFromTONAndTransfer(tokenOwner1.address, tokenOwnerInitialBalance.toFixed(TON_UNIT));

      await this.env.wton.connect(tokenOwner1).approve(this.env.depositManager.address, tokenOwnerInitialBalance.toFixed(WTON_UNIT));
    });

    describe('when the token owner equally deposit WTON to all layer2s', function () {
      beforeEach(async function () {
        // deposit from the token owner
        this.env.receipts = await Promise.all(this.env.layer2s.map(
          layer2 => this.env.deposit(tokenOwner1, layer2.address, tokenAmount.toFixed(WTON_UNIT)),
        ));
      });

      afterEach(function () {
        delete this.env.receipts;
      });

      /*it('should emit Deposited event', function () {
        this.env.receipts.forEach(({ logs }, i) => {
          const layer2 = this.env.layer2s[i];
          expectEvent.inLogs(logs, 'Deposited', {
            layer2: layer2.address,
            depositor: tokenOwner1.address,
            amount: tokenAmount.toFixed(WTON_UNIT),
          });
        });
      });*/

      it('WTON balance of the token owner must be zero', async function () {
        expect(await this.env.wton.balanceOf(tokenOwner1.address)).to.be.bignumber.equal('0');
      });

      it('deposit manager should have deposited WTON tokens', async function () {
        expect(await this.env.wton.balanceOf(this.env.depositManager.address))
          .to.be.bignumber.equal(
            tokenAmount.times(4).toFixed(WTON_UNIT), // NUM_ROOTCHAINS
          );
      });

      it('coinage balance of the token owner must be increased by deposited WTON amount', async function () {
        await Promise.all(this.env.coinages.map(
          async (coinage) => {
            expect(await coinage.balanceOf(tokenOwner1.address))
              .to.be.bignumber.equal(tokenAmount.toFixed(WTON_UNIT));
          },
        ));
      });

      it('tot balance of layer2 must be increased by deposited WTON amount', async function () {
        await Promise.all(this.env.layer2s.map(
          async (layer2) => {
            expect(await this.env.tot.balanceOf(layer2.address))
              .to.be.bignumber.equal(tokenAmount.toFixed(WTON_UNIT));
          },
        ));
      });

      // multiple layer2 test
      for (const _i in range(4)) {
        const i = Number(_i);
        const indices = range(0, i + 1);
        const c = indices.map(i => `${i}-th`).join(', ');

        describe(`when ${c} layer2 commits first ORE each`, function () {
          beforeEach(async function () {
            this.env.previousSeigBlock = await this.env.seigManager.lastSeigBlock();

            this.env.totBalancesAtCommit = {}; // track tot balance when layer2 is comitted
            this.env.accSeig = _WTON('0');
            this.env.seigs = [];

            o = '';

            for (const i of indices) {
              const layer2 = this.env.layer2s[i];

              const sb0 = await this.env.seigManager.lastSeigBlock();
              const prevTotTotalSupply = await this.env.tot.totalSupply();

              const prevBalance = await this.env.tot.balanceOf(layer2.address);

              await helpers.time.increase(3);
              const tx = await this.env.commit(layer2);
              const receipt = await tx.wait();

              const sb1 = await this.env.seigManager.lastSeigBlock();
              const curTotTotalSupply = await this.env.tot.totalSupply();

              const curBalance = await this.env.tot.balanceOf(layer2.address);

              this.env.totBalancesAtCommit[layer2.address] = curBalance;

              /*const {
                args: {
                  totalStakedAmount: _totalStakedAmount,
                  totalSupplyOfWTON,
                  prevTotalSupply,
                  nextTotalSupply,
                },
              } = await expectEvent.inTransaction(tx, this.env.seigManager, 'CommitLog1');

              //const { args: { totalSeig, stakedSeig, unstakedSeig, powertonSeig, pseig } } = await expectEvent.inTransaction(tx, this.env.seigManager, 'SeigGiven');

              //const { args: { previous, current } } = await expectEvent.inTransaction(tx, this.env.tot, 'FactorSet');

              //const seig = _WTON(stakedSeig, WTON_UNIT).plus(_WTON(pseig, WTON_UNIT));

              //checkBalance(curTotTotalSupply.sub(prevTotTotalSupply), seig, WTON_UNIT);

              this.env.seigs.push(seig);
              this.env.accSeig = this.env.accSeig.plus(seig);

              // test log....s
              const accSeigAtCommit = this.env.seigs.slice(0, i + 1).reduce((a, b) => a.plus(b));
              const accSeig = this.env.accSeig;

              o += `\n\n\n
    ${'-'.repeat(40)}
    ${i}-th layer2 first commit
    ${'-'.repeat(40)}

    //totalStakedAmount     : ${_WTON(_totalStakedAmount, 'ray').toString().padStart(15)}
    //totalSupplyOfWTON     : ${_WTON(totalSupplyOfWTON, 'ray').toString().padStart(15)}
    //prevTotalSupply       : ${_WTON(prevTotalSupply, 'ray').toString().padStart(15)}
    //nextTotalSupply       : ${_WTON(nextTotalSupply, 'ray').toString().padStart(15)}

    tot.totalSupply       : ${_WTON(await this.env.tot.totalSupply(), 'ray').toString().padStart(15)}

    ${'-'.repeat(40)}

    previous factor       : ${_WTON(previous, 'ray').toString().padStart(15)}
    current factor        : ${_WTON(current, 'ray').toString().padStart(15)}

    ${'-'.repeat(40)}

    prevBalance           : ${_WTON(prevBalance, 'ray').toString().padStart(15)}
    curBalance            : ${_WTON(curBalance, 'ray').toString().padStart(15)}

    ${'-'.repeat(40)}

    previous seig block : ${sb0}
    current seig block  : ${sb1}
    numBlocks           : ${sb1.sub(sb0)}

    seigPerBlock        : ${_WTON(await this.env.seigManager.seigPerBlock(), 'ray').toString().padStart(15)}
    //totalSeig           : ${_WTON(totalSeig, 'ray').toString().padStart(15)}
    stakedSeig          : ${_WTON(stakedSeig, 'ray').toString().padStart(15)}
    unstakedSeig        : ${_WTON(unstakedSeig, 'ray').toString().padStart(15)}
    powertonSeig        : ${_WTON(powertonSeig || 0, 'ray').toString().padStart(15)}

    ${'-'.repeat(40)}

    this.env.seigs          : ${this.env.seigs.toString().padStart(15)}
    this.env.accSeig        : ${this.env.accSeig.toString().padStart(15)}
    accSeigAtCommit     : ${accSeigAtCommit.toString().padStart(15)}
    accSeig             : ${accSeig.toString().padStart(15)}

    ${'='.repeat(40)}
    `;*/
            }

            this.env.currentSeigBlock = await this.env.seigManager.lastSeigBlock();
          });

          // will add test codes that use calculation library(WIP)
          /*for (const _i in indices) {
            const i = Number(_i);
            it(`${i}-th layer2: check amount of total supply, balance, staked amount, uncomitted amount`, async function () {
              const layer2 = this.env.layer2s[i];

              const accSeigAtCommit = this.env.seigs.slice(0, i + 1).reduce((a, b) => a.plus(b));
              const balnceAtCommit = tokenAmount.times(WTON_TON_RATIO)
                .plus(accSeigAtCommit.div(NUM_ROOTCHAINS));

              const accSeig = this.env.accSeig;
              const balanceAtCurrent = tokenAmount.times(WTON_TON_RATIO)
                .plus(accSeig.div(NUM_ROOTCHAINS));

              // tot balance of a layer2
              checkBalance(
                this.env.totBalancesAtCommit[layer2.address],
                balnceAtCommit,
                WTON_UNIT,
              );

              // coinage total supply
              checkBalance(
                await this.env.coinagesByLayer2[layer2.address].totalSupply(),
                balnceAtCommit,
                WTON_UNIT,
              );

              // coinage balance of the tokwn owner
              checkBalance(
                await this.env.coinagesByLayer2[layer2.address].balanceOf(tokenOwner1.address),
                balnceAtCommit,
                WTON_UNIT,
              );

              // staked amount of the token owner
              checkBalance(
                await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address),
                balnceAtCommit,
                WTON_UNIT,
              );

              // uncomitted amount of the tokwn owner
              checkBalance(
                await this.env.seigManager.uncomittedStakeOf(layer2.address, tokenOwner1.address),
                balanceAtCurrent.minus(balnceAtCommit),
                WTON_UNIT,
              );
            });

            it(`${i}-th layer2: the tokwn owner should claim staked amount`, async function () {
              const layer2 = this.env.layer2s[i];
              const coinage = this.env.coinagesByLayer2[layer2.address];

              const precomitted = toBN(
                (
                  this.env.seigs.slice(i + 1).length > 0
                    ? this.env.seigs.slice(i + 1).reduce((a, b) => a.plus(b)).div(NUM_ROOTCHAINS)
                    : _WTON('0')
                ).toFixed(WTON_UNIT),
              );
              const amount = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
              const additionalTotBurnAmount = await this.env.seigManager.additionalTotBurnAmount(layer2.address, tokenOwner1.address, amount);

              // console.log(`
              // amount                     ${amount.toString(10).padStart(30)}
              // precomitted                ${precomitted.toString(10).padStart(30)}
              // additionalTotBurnAmount    ${additionalTotBurnAmount.toString(10).padStart(30)}
              // `);

              const prevWTONBalance = await this.env.wton.balanceOf(tokenOwner1.address);
              const prevCoinageTotalSupply = await coinage.totalSupply();
              const prevCoinageBalance = await coinage.balanceOf(tokenOwner1.address);
              const prevTotTotalSupply = await this.env.tot.totalSupply();
              const prevTotBalance = await this.env.tot.balanceOf(layer2.address);

              // 1. make a withdrawal request
              expect(await this.env.depositManager.pendingUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal('0');
              expect(await this.env.depositManager.accUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal('0');

              const tx = await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(layer2.address, amount);

              expectEvent.inLogs(
                tx.logs,
                'WithdrawalRequested',
                {
                  layer2: layer2.address,
                  depositor: tokenOwner1.address,
                  amount: amount,
                },
              );

              const { args: { coinageBurnAmount, totBurnAmount } } = await expectEvent.inTransaction(tx.tx, this.env.seigManager, 'UnstakeLog');

              // console.log('coinageBurnAmount  ', coinageBurnAmount.toString(10).padStart(35));
              // console.log('totBurnAmount      ', totBurnAmount.toString(10).padStart(35));
              // console.log('diff               ', toBN(totBurnAmount).sub(toBN(coinageBurnAmount)).toString(10).padStart(35));

              expect(await this.env.depositManager.pendingUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal(amount);
              expect(await this.env.depositManager.accUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal('0');

              // 2. process the request
              await expect(
                this.env.depositManager.connect(tokenOwner1).processRequest(layer2.address, false),
              ).to.be.revertedWith('DepositManager: wait for withdrawal delay');

              await Promise.all(range(WITHDRAWAL_DELAY + 1).map(_ => time.advanceBlock()));

              expectEvent(
                await this.env.depositManager.connect(tokenOwner1).processRequest(layer2.address, false),
                'WithdrawalProcessed',
                {
                  layer2: layer2.address,
                  depositor: tokenOwner1.address,
                  amount: amount,
                },
              );

              expect(await this.env.depositManager.pendingUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal('0');
              expect(await this.env.depositManager.accUnstaked(layer2.address, tokenOwner1.address)).to.be.bignumber.equal(amount);

              const curWTONBalance = await this.env.wton.balanceOf(tokenOwner1.address);
              const curCoinageTotalSupply = await coinage.totalSupply();
              const curCoinageBalance = await coinage.balanceOf(tokenOwner1.address);
              const curTotTotalSupply = await this.env.tot.totalSupply();
              const curTotBalance = await this.env.tot.balanceOf(layer2.address);

              // 3. check tokens status
              expect(curWTONBalance.sub(prevWTONBalance))
                .to.be.bignumber.equal(amount);

              expect(curCoinageTotalSupply.sub(prevCoinageTotalSupply))
                .to.be.bignumber.equal(amount.neg());

              expect(curCoinageBalance.sub(prevCoinageBalance))
                .to.be.bignumber.equal(amount.neg());

              checkBalance(
                prevTotTotalSupply.sub(curTotTotalSupply),
                _WTON(amount.add(precomitted), WTON_UNIT),
                WTON_UNIT,
              );

              checkBalance(
                prevTotBalance.sub(curTotBalance),
                _WTON(amount.add(precomitted), WTON_UNIT),
                WTON_UNIT,
              );
            });
          }*/
        });
      }

      describe('when 0-th layer2 commits 10 times', function () {
        const i = 0;
        const n = 10;

        beforeEach(async function () {
          this.env.accSeig = _WTON('0');

          this.env.seigBlocks = [];
          this.env.totTotalSupplies = [];

          for (const _ of range(n)) {
            this.env.seigBlocks.push(await this.env.seigManager.lastSeigBlock());
            this.env.totTotalSupplies.push(await this.env.tot.totalSupply());
            await this.env.commit(this.env.layer2s[i]);
          }
          this.env.seigBlocks.push(await this.env.seigManager.lastSeigBlock());
          this.env.totTotalSupplies.push(await this.env.tot.totalSupply());

          this.env.seigs = [];
          this.env.accSeigs = [];

          for (let i = 1; i < this.env.seigBlocks.length; i++) {
            const seig = _WTON(this.env.totTotalSupplies[i].sub(this.env.totTotalSupplies[i - 1]), WTON_UNIT);

            this.env.seigs.push(seig);
            this.env.accSeig = this.env.accSeig.plus(seig);
            this.env.accSeigs.push(this.env.accSeig);
          }
        });

        /*function behaveWithSeigRate (powertonRate, daoRate, pseigRate) {
          describe('', function () {
          });
        }

        const powertonRates = [
          _WTON('0'),
          _WTON('0.1'),
          _WTON('0.3'),
        ];

        const daoRates = [
          _WTON('0'),
          _WTON('0.3'),
          _WTON('0.5'),
        ];

        const pseigRates = [
          _WTON('0'),
          _WTON('0.3'),
          _WTON('0.1'),
        ];

        for (const j = 0; j < powertonRates.length; j++) {
          (powertonRates[j], daoRates[j], pseigRates[j])
        }*/

        /*it('should mint correct seigniorages for each commit', async function () {
          for (const j of range(this.env.seigBlocks.length - 1)) { // for j-th commit
            //const currentBlock = await web3.eth.getBlockNumber();
            const nBlocks = this.env.seigBlocks[j + 1].sub(this.env.seigBlocks[j]);
            const accSeigBeforeCommit = this.env.accSeigs[j].minus(this.env.seigs[j]);

            const totalStaked = tokenAmount.times(WTON_TON_RATIO)
              .times(NUM_ROOTCHAINS)
              .plus(accSeigBeforeCommit);
            const totTotalSupplyBeforeCommit = TON_INITIAL_SUPPLY.times(WTON_TON_RATIO)
              .plus(accSeigBeforeCommit);

            const maxSeig = SEIG_PER_BLOCK.times(nBlocks);
            const stakedSeig = maxSeig
              .times(totalStaked)
              .div(totTotalSupplyBeforeCommit);
            const pseig = maxSeig.minus(stakedSeig).times(PSEIG_RATE);
            const expectedSeig = stakedSeig.plus(pseig);
              //.times(nBlocks);

            checkBalance(
              toBN(this.env.seigs[j].toFixed(WTON_UNIT)),
              _WTON(expectedSeig.toFixed(WTON_UNIT), WTON_UNIT),
              WTON_UNIT,
            );
          }
        });*/

        it(`${i}-th layer2: check amount of total supply, balance, staked amount`, async function () {
          const layer2 = this.env.layer2s[i];

          const expected = tokenAmount.times(WTON_TON_RATIO).plus(this.env.accSeig.div(4)); // actually not .div(4)...

          // tot total supply is checked in previous test.

          // coinage total supply
          checkBalance(
            await this.env.coinagesByLayer2[layer2.address].totalSupply(),
            expected,
            WTON_UNIT,
          );

          // coinage balance of the tokwn owner
          checkBalance(
            await this.env.coinagesByLayer2[layer2.address].balanceOf(tokenOwner1.address),
            expected,
            WTON_UNIT,
          );

          // staked amount of the token owner
          checkBalance(
            await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address),
            expected,
            WTON_UNIT,
          );
        });

        describe('when the token holder tries to withdraw all stakes', function () {
          let wtonAmount;

          beforeEach(async function () {
            wtonAmount = await this.env.seigManager.stakeOf(this.env.layer2s[i].address, tokenOwner1.address);
          });

          it('should withdraw', async function () {
            const factor0 = await this.env.coinages[0].factor();
            const tokenOwnerWtonBalance0 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance0 = await this.env.wton.balanceOf(this.env.depositManager.address);
            const deposit0 = await this.env.coinages[0].balanceOf(tokenOwner1.address);

            await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, wtonAmount);

            await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

            await this.env.depositManager.connect(tokenOwner1).processRequest(this.env.layer2s[i].address, false);

            const factor1 = await this.env.coinages[0].factor();
            const tokenOwnerWtonBalance1 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance1 = await this.env.wton.balanceOf(this.env.depositManager.address);
            const deposit1 = await this.env.coinages[0].balanceOf(tokenOwner1.address);

            console.log(`
            ###########################################################
            tokenOwnerWtonBalance0 : ${tokenOwnerWtonBalance0}
            tokenOwnerWtonBalance1 : ${tokenOwnerWtonBalance1}
            depositManagerWtonBalance0 : ${depositManagerWtonBalance0}
            depositManagerWtonBalance1 : ${depositManagerWtonBalance1}
            factor0 : ${factor0}
            factor1 : ${factor1}
            ###########################################################
            `);


            let test11 = BigNumber.from('100000000000000000000');
            await this.env.wton.swapFromTONAndTransfer(tokenOwner2.address, test11);
            await this.env.wton.connect(tokenOwner2).approve(this.env.depositManager.address, test11);
            await this.env.deposit(tokenOwner2, this.env.layer2s[0].address, test11);

            //await this.env.wton.swapFromTONAndTransfer(tokenOwner1, toBN('100'));
            await this.env.wton.connect(tokenOwner1).approve(this.env.depositManager.address, test11);
            await this.env.deposit(tokenOwner1, this.env.layer2s[0].address, test11);

            const factor2 = await this.env.coinages[0].factor();
            const tokenOwnerWtonBalance2 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance2 = await this.env.wton.balanceOf(this.env.depositManager.address);
            const deposit2 = await this.env.coinages[0].balanceOf(tokenOwner1.address);
            const deposit3 = await this.env.coinages[0].balanceOf(tokenOwner2.address);
            const coinageTotalSupply0 = await this.env.coinages[0].totalSupply();

            console.log(`
            ###########################################################
            tokenOwnerWtonBalance2 : ${tokenOwnerWtonBalance2}
            depositManagerWtonBalance2 : ${depositManagerWtonBalance2}
            factor2 : ${factor2}

            deposit0 : ${deposit0}
            deposit1 : ${deposit1}
            deposit2 : ${deposit2}
            deposit3 : ${deposit3}
            coinageTotalSupply0 : ${coinageTotalSupply0}
            ###########################################################
            `);

            expect(depositManagerWtonBalance0.sub(depositManagerWtonBalance1)).to.be.bignumber.equal(wtonAmount);
            expect(tokenOwnerWtonBalance1.sub(tokenOwnerWtonBalance0)).to.be.bignumber.equal(wtonAmount);
          });

          it('should re-deposit', async function () {
            const tokenOwnerWtonBalance0 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance0 = await this.env.wton.balanceOf(this.env.depositManager.address);

            await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, wtonAmount);

            await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

            await this.env.depositManager.connect(tokenOwner1).redeposit(this.env.layer2s[i].address);

            const tokenOwnerWtonBalance1 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance1 = await this.env.wton.balanceOf(this.env.depositManager.address);

            expect(depositManagerWtonBalance1).to.be.bignumber.equal(depositManagerWtonBalance0);
            expect(tokenOwnerWtonBalance1).to.be.bignumber.equal(tokenOwnerWtonBalance0);
          });

          describe('after the token holder withdraw all stakes in TON', function () {
            let tonAmount;

            beforeEach(async function () {
              await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, wtonAmount);

              await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

              const tonBalance0 = await this.env.ton.balanceOf(tokenOwner1.address);
              await this.env.depositManager.connect(tokenOwner1).processRequest(this.env.layer2s[i].address, true);
              const tonBalance1 = await this.env.ton.balanceOf(tokenOwner1.address);

              tonAmount = tonBalance1.sub(tonBalance0);
            });

            it('the layer2 can commit next epochs', async function () {
              await this.env.multiCommit(this.env.layer2s[i], 10);
            });

            it('the token holder can deposit again', async function () {
              const data = marshalString(
                [this.env.depositManager.address, this.env.layer2s[i].address]
                  .map(str => unmarshalString(utils.hexZeroPad(str, 32)))
                  .join(''),
              );

              await this.env.ton.connect(tokenOwner1).approveAndCall(
                this.env.wton.address,
                tonAmount,
                data,
              );
            });

            describe('after the layer2 commits 10 epochs', function () {
              beforeEach(async function () {
                await this.env.multiCommit(this.env.layer2s[i], 10);
              });

              it('the token holder can deposit again', async function () {
                const data = marshalString(
                  [this.env.depositManager.address, this.env.layer2s[i].address]
                    .map(str => unmarshalString(utils.hexZeroPad(str, 32)))
                    .join(''),
                );

                await this.env.ton.connect(tokenOwner1).approveAndCall(
                  this.env.wton.address,
                  tonAmount,
                  data,
                );
              });
            });
          });

          describe('when the token holder make withdrawal request', async function () {
            beforeEach(async function () {
              await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, wtonAmount);
            });

            it('the token owner can re-deposit', async function () {
              await expect(
                this.env.depositManager.connect(tokenOwner1).redeposit(this.env.layer2s[i].address)
              ).to.emit(this.env.depositManager, 'Deposited')
              .withArgs(this.env.layer2s[i].address, tokenOwner1.address, wtonAmount);
            });

            describe('after the token holder withdraw all stakes in WTON', function () {
              beforeEach(async function () {
                await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

                await this.env.depositManager.connect(tokenOwner1).processRequest(this.env.layer2s[i].address, false);
              });

              it('the layer2 can commit next epochs', async function () {
                await Promise.all(range(10).map(_ => this.env.commit(this.env.layer2s[i])));
              });

              it('the token holder can deposit again', async function () {
                await this.env.wton.connect(tokenOwner1).approve(this.env.depositManager.address, wtonAmount);
                await this.env.deposit(tokenOwner1, this.env.layer2s[i].address, wtonAmount);
              });

              describe('after the layer2 commits 10 epochs', function () {
                beforeEach(async function () {
                  await Promise.all(range(10).map(_ => this.env.commit(this.env.layer2s[i])));
                });

                it('the token holder can deposit again', async function () {
                  await this.env.wton.connect(tokenOwner1).approve(this.env.depositManager.address, wtonAmount);
                  await this.env.deposit(tokenOwner1, this.env.layer2s[i].address, wtonAmount);
                });
              });
            });
          });
        });

        describe('when the token holder tries to withdraw 10% of staked WTON 10 times', function () {
          const n = 10;
          const nBN = BigNumber.from(n);
          let amount;

          beforeEach(async function () {
            amount = (await this.env.seigManager.stakeOf(this.env.layer2s[i].address, tokenOwner1.address)).div(nBN);
          });

          it('should withdraw', async function () {
            const tokenOwnerWtonBalance0 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance0 = await this.env.wton.balanceOf(this.env.depositManager.address);

            await Promise.all(range(n).map(_ => this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, amount)));

            await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

            await Promise.all(range(n).map(_ => this.env.depositManager.connect(tokenOwner1).processRequest(this.env.layer2s[i].address, false)));

            const tokenOwnerWtonBalance1 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance1 = await this.env.wton.balanceOf(this.env.depositManager.address);

            expect(depositManagerWtonBalance0.sub(depositManagerWtonBalance1)).to.be.bignumber.equal(amount.mul(nBN));
            expect(tokenOwnerWtonBalance1.sub(tokenOwnerWtonBalance0)).to.be.bignumber.equal(amount.mul(nBN));
          });

          it('should re-deposit', async function () {
            const tokenOwnerWtonBalance0 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance0 = await this.env.wton.balanceOf(this.env.depositManager.address);

            await Promise.all(range(n).map(_ => this.env.depositManager.connect(tokenOwner1).requestWithdrawal(this.env.layer2s[i].address, amount)));

            await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

            await Promise.all(range(n).map(_ => this.env.depositManager.connect(tokenOwner1).redeposit(this.env.layer2s[i].address)));

            const tokenOwnerWtonBalance1 = await this.env.wton.balanceOf(tokenOwner1.address);
            const depositManagerWtonBalance1 = await this.env.wton.balanceOf(this.env.depositManager.address);

            expect(depositManagerWtonBalance1).to.be.bignumber.equal(depositManagerWtonBalance0);
            expect(tokenOwnerWtonBalance1).to.be.bignumber.equal(tokenOwnerWtonBalance0);
          });
        });

        function behaveWhenPausedOrNot () {
          it('commit should not be reverted', async function () {
            await this.env.commit(this.env.layer2s[i]);
          });

          it('deposit should not be reverted', async function () {
            const from = tokenOwner1;
            const balance = (await this.env.wton.balanceOf(from.address)).div(4); // NUM_ROOTCHAINS
            await Promise.all(this.env.layer2s.map(
              (layer2) =>
                this.env.deposit(from, layer2.address, balance),
            ));
          });

          it('withdrawal should not be reverted', async function () {
            await Promise.all(
              this.env.layer2s.map(async (layer2) => {
                const staked = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
                if (staked.gt(BigNumber.from(0))) {
                  return this.env.depositManager.connect(tokenOwner1).requestWithdrawal(layer2.address, staked);
                }
              }),
            );

            await helpers.mine(this.env.WITHDRAWAL_DELAY + 1);

            await Promise.all(
              this.env.layer2s.map(async (layer2) => {
                const numPendingRequests = await this.env.depositManager.numPendingRequests(layer2.address, tokenOwner1.address);

                if (numPendingRequests.gt(BigNumber.from('0'))) {
                  await this.env.depositManager.connect(tokenOwner1).processRequests(layer2.address, numPendingRequests, false);
                }

                const staked = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
                expect(staked).to.be.bignumber.equal('0');
              }),
            );
          });
        }

        describe('after seig manager is paused', function () {
          const NUM_WITHDRAWN_ROOTCHAINS = 2; // NUM_ROOTCHAINS / 2

          async function makeWithdrawalRequest (env, n) {
            await Promise.all(
              this.env.layer2s.slice(0, n).map(async (layer2) => {
                const staked = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
                const amount = staked.div(2);
                if (amount.gt(BigNumber.from('0'))) {
                  return this.env.depositManager.connect(tokenOwner1).requestWithdrawal(layer2.address, amount);
                }
              }),
            );
          }

          beforeEach(async function () {
            await makeWithdrawalRequest.call(this, this.env, NUM_WITHDRAWN_ROOTCHAINS);
            await this.env.seigManager.pause();
          });

          it('seigniorage must not be given', async function () {
            const totTotalSupply1 = await this.env.tot.totalSupply();
            await this.env.commit(this.env.layer2s[i]);
            const totTotalSupply2 = await this.env.tot.totalSupply();

            expect(totTotalSupply2).to.be.bignumber.equal(totTotalSupply1);
          });

          behaveWhenPausedOrNot();

          describe('after seig manager is unpaused', function () {
            beforeEach(async function () {
              await makeWithdrawalRequest.call(this, this.env, NUM_WITHDRAWN_ROOTCHAINS);
              await this.env.seigManager.unpause();
            });

            // TODO: check seig amount
            it('seigniorage must be given', async function () {
              const totTotalSupply1 = await this.env.tot.totalSupply();
              await this.env.commit(this.env.layer2s[i]);
              const totTotalSupply2 = await this.env.tot.totalSupply();

              expect(totTotalSupply2).to.be.bignumber.gt(totTotalSupply1);
            });
          });
        });
      });

      describe('when 0-th layer2 changes commission rate with operator deposit', function () {
        const i = 0;
        const n = 1;

        function behaveWithCommissionRate (operatorRate, commissionRate, isCommissionRateNegative) {
          //const operatorRateNr = operatorRate.toNumber();
          //const commissionPercent = commissionRate.toNumber() * 100;
          const operatorRateNr = operatorRate;
          const commissionPercent = commissionRate * 100;
          const commissionRateSignStr = isCommissionRateNegative ? 'negative' : 'positive';

          describe(`when the operator deposits ${operatorRateNr} times as much as the token owner did`, function () {
            let operatorAmount = 0;
            beforeEach(async function () {
              if (operatorRateNr === 0) return;

              operatorAmount = tokenAmount.times(operatorRateNr);

              console.log(`
              tokenOwner1 balance : ${await this.env.ton.balanceOf(tokenOwner1.address)}
              operator balance : ${await this.env.ton.balanceOf(operator.address)}
              operatorAmount : ${operatorAmount}

              operatorRate : ${operatorRate}
              commissionRate : ${commissionRate}
              isCommissionRateNegative : ${isCommissionRateNegative}
              `);

              await this.env.wton.swapFromTONAndTransfer(operator.address, operatorAmount.times(4).toFixed(TON_UNIT)); // NUM_ROOTCHAINS
              await this.env.wton.connect(operator).approve(this.env.depositManager.address, operatorAmount.times(4).toFixed(WTON_UNIT)); // NUM_ROOTCHAINS
            });

            describe(`when 0-th layer2 has ${commissionRateSignStr} commission rate of ${commissionPercent}%`, function () {
              it(`the layer2 can commit next ${n} epochs`, async function () {
                await this.env.multiCommit(this.env.layer2s[i], n);
              });

              beforeEach(async function () {
                await this.env.seigManager.setCommissionRate(this.env.layer2s[i].address, commissionRate.toFixed(WTON_UNIT), isCommissionRateNegative);

                await Promise.all(this.env.layer2s.map(
                  layer2 => this.env.deposit(operator, layer2.address, operatorAmount.toFixed(WTON_UNIT)),
                ));
              });

              describe('when the layer2 commits once', function () {
                it('exact amount of seig must be given to token owner and operator', async function () {
                  const layer2Addr = this.env.layer2s[i].address;

                  const {
                    operatorSeigs: expectedOperatorSeigs,
                    userSeigs: expectedTokenOwnerSeigs,
                  } = await expectedSeigs(this.env, this.env.seigManager, layer2Addr, tokenOwner1.address);

                  const beforeOperatorStake = await this.env.seigManager.stakeOf(layer2Addr, operator.address);
                  const beforeTokenOwnerStake = await this.env.seigManager.stakeOf(layer2Addr, tokenOwner1.address);

                  await this.env.commit(this.env.layer2s[i]);

                  const afterOperatorStake = await this.env.seigManager.stakeOf(layer2Addr, operator.address);
                  const afterTokenOwnerStake = await this.env.seigManager.stakeOf(layer2Addr, tokenOwner1.address);

                  /*console.log(`
                  beforeOperatorStake                 : ${beforeOperatorStake}
                  beforeTokenOwnerStake         : ${beforeTokenOwnerStake}

                  afterOperatorStake  : ${afterOperatorStake}
                  afterTokenOwnerStake                      : ${afterTokenOwnerStake}
                    `);*/

                  checkBalance(afterTokenOwnerStake.sub(beforeTokenOwnerStake), expectedTokenOwnerSeigs, WTON_UNIT);
                  checkBalance(afterOperatorStake.sub(beforeOperatorStake), expectedOperatorSeigs, WTON_UNIT);
                });
              });

              describe('when the layer2 commits multiple times', async function () {
                let beforeCoinageTotalSupply;
                let afterCoinageTotalSupply;

                let beforeOperatorStake;
                let afterOperatorStake;

                let beforeCommitBlock;
                let afterCommitBlock;

                beforeEach(async function () {
                  beforeCoinageTotalSupply = await this.env.coinages[i].totalSupply();
                  beforeOperatorStake = await this.env.seigManager.stakeOf(this.env.layer2s[i].address, operator.address);
                  beforeCommitBlock = await this.env.seigManager.lastCommitBlock(this.env.layer2s[i].address);

                  //console.log('beforeOperatorStake', toWTONString(beforeOperatorStake));

                  await this.env.multiCommit(this.env.layer2s[i], n);

                  afterCoinageTotalSupply = await this.env.coinages[i].totalSupply();
                  afterOperatorStake = await this.env.seigManager.stakeOf(this.env.layer2s[i].address, operator.address);
                  afterCommitBlock = await this.env.seigManager.lastCommitBlock(this.env.layer2s[i].address);

                  //console.log('afterOperatorStake', toWTONString(afterOperatorStake));
                });

                if (!isCommissionRateNegative) {
                  // if commission rate is positive
                  it(`operator should receive ${commissionPercent}% of seigniorages`, async function () {
                    const seigs = afterCoinageTotalSupply.sub(beforeCoinageTotalSupply);
                    const operatorSeigs = afterOperatorStake.sub(beforeOperatorStake);

                    const expectedOperatorSeigsWithoutCommission = _WTON(seigs, WTON_UNIT)
                      .times(operatorRateNr).div(1 + operatorRateNr);
                    const expectedCommission = _WTON(seigs, WTON_UNIT).minus(expectedOperatorSeigsWithoutCommission).times(commissionRate);

                    const expectedOperatorSeigs = expectedOperatorSeigsWithoutCommission.plus(expectedCommission);

                    expect(seigs).to.be.bignumber.gt('0');
                    checkBalance(operatorSeigs, expectedOperatorSeigs, WTON_UNIT);
                  });
                } else {
                  // if commission rate is negative
                  it(`operator should receive ${100 - commissionPercent}% of seigniorages`, async function () {
                    const seigs = afterCoinageTotalSupply.sub(beforeCoinageTotalSupply);
                    const operatorSeigs = afterOperatorStake.sub(beforeOperatorStake);

                    const expectedOperatorSeigsWithoutCommission = _WTON(seigs, WTON_UNIT)
                      .times(operatorRateNr).div(1 + operatorRateNr);
                    const expectedCommission = expectedOperatorSeigsWithoutCommission.times(commissionRate);

                    const expectedOperatorSeigs = expectedOperatorSeigsWithoutCommission.gte(expectedCommission)
                      ? expectedOperatorSeigsWithoutCommission.minus(expectedCommission)
                      : _WTON('0');

                    expect(seigs).to.be.bignumber.gt('0');
                    checkBalance(operatorSeigs, expectedOperatorSeigs, WTON_UNIT);
                  });
                }
              });
            });
          });
        }

        const operatorRates = [
          0,
          //_WTON('0'),
          //_WTON('0.01'),
          /*_WTON('0.1'),
          _WTON('0.3'),
          _WTON('0.5'),
          _WTON('0.8'),
          _WTON('1'),
          _WTON('1.5'),
          _WTON('2'),
          _WTON('10'),
          _WTON('100'),*/
        ];

        const commissionRates = [
          0.0,
          //_WTON('0.0'),
          //_WTON('0.1'),
          /*_WTON('0.3'),
          _WTON('0.5'),
          _WTON('0.9'),
          _WTON('0.99'),
          _WTON('1.0'),*/
        ];

        const isCommissionRateNegatives = [
          //false,
          true,
        ];

        operatorRates.forEach(or => commissionRates.forEach(cr => isCommissionRateNegatives.forEach(ng => behaveWithCommissionRate.call(this, or, cr, ng))));
      });
    });
  });

  describe('when 2 token owners deposit to each layer2s', async function () {
    beforeEach(async function () {
      await Promise.all([tokenOwner1, tokenOwner2].map(async (tokenOwner) => {
        await this.env.wton.swapFromTONAndTransfer(tokenOwner.address, tokenOwnerInitialBalance.toFixed(TON_UNIT));
        await this.env.wton.connect(tokenOwner).approve(this.env.depositManager.address, tokenOwnerInitialBalance.toFixed(WTON_UNIT));
      }));
    });

    function behaveWhenTokensAreConcentratedOnOneSide (commissionRate, isCommissionRateNegative) {
      const commissionPercent = commissionRate.toNumber() * 100;
      const commissionRateSignStr = isCommissionRateNegative ? 'negative' : 'positive';

      describe(`when all layer2s have ${commissionRateSignStr} commission rate of ${commissionPercent}%`, function () {
        beforeEach(async function () {
          if (commissionPercent > 0) {
            await Promise.all(this.env.layer2s.map(
              layer2 => this.env.seigManager.setCommissionRate(layer2.address, commissionRate.toFixed(WTON_UNIT), isCommissionRateNegative),
            ));
          }
        });

        describe('when the first owner deposit 95% of his balance to 0-th layer2, and the second one deposits 5% of his balance', function () {
          const amount1 = tokenOwnerInitialBalance.div(20).times(19).div(4); // NUM_ROOTCHAINS
          const amount2 = tokenOwnerInitialBalance.div(20).div(4); // NUM_ROOTCHAINS

          beforeEach(async function () {
            await Promise.all(this.env.layer2s.map(layer2 => this.env.deposit(tokenOwner1, layer2.address, amount1.toFixed(WTON_UNIT))));
            await Promise.all(this.env.layer2s.map(layer2 => this.env.deposit(tokenOwner2, layer2.address, amount2.toFixed(WTON_UNIT))));
          });

          it('the first owner can make a withdraw request with all staked tokens', async function () {
            const from = tokenOwner1;

            await Promise.all(this.env.layer2s.map(async (layer2) => {
              const staked = await this.env.seigManager.stakeOf(layer2.address, from.address);

              await this.env.depositManager.connect(from).requestWithdrawal(layer2.address, staked);
            }));
          });

          it('the second owner can make a withdraw request with all staked tokens', async function () {
            const from = tokenOwner2;

            await Promise.all(this.env.layer2s.map(async (layer2) => {
              const staked = await this.env.seigManager.stakeOf(layer2.address, from.address);

              await this.env.depositManager.connect(from).requestWithdrawal(layer2.address, staked);
            }));
          });

          describe('when 0-th layer2 commits multiple times', function () {
            const i = 0;
            const n = 50;

            beforeEach(async function () {
              const layer2 = this.env.layer2s[i];
              await this.env.multiCommit(layer2, n);
            });

            it('the first owner can make a withdraw request with all staked tokens from all layer2s', async function () {
              const from = tokenOwner1;

              await Promise.all(this.env.layer2s.map(async (layer2, j) => {
                const staked = await this.env.seigManager.stakeOf(layer2.address, from.address);

                // NOTE: error found here
                await this.env.depositManager.connect(from).requestWithdrawal(layer2.address, staked);
              }));
            });

            it('the second owner can make a withdraw request with all staked tokens from all layer2s', async function () {
              const from = tokenOwner2;

              await Promise.all(this.env.layer2s.map(async (layer2, j) => {
                const staked = await this.env.seigManager.stakeOf(layer2.address, from.address);

                await this.env.depositManager.connect(from).requestWithdrawal(layer2.address, staked);
              }));
            });

            it('both owners can make withdraw requests with all staked tokens from all layer2s', async function () {
              await Promise.all(this.env.layer2s.map(async (layer2, j) => {
                const staked1 = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
                const staked2 = await this.env.seigManager.stakeOf(layer2.address, tokenOwner2.address);

                await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(layer2.address, staked1);
                await this.env.depositManager.connect(tokenOwner2).requestWithdrawal(layer2.address, staked2);
              }));
            });

            describe('when all layer2s commit multiple times', function () {
              beforeEach(async function () {
                for (const _ of range(1)) {
                  await helpers.time.increase(100);
                  await helpers.mine(10);

                  await Promise.all(this.env.layer2s.map((layer2) => this.env.multiCommit(layer2, 10)));
                }
              });

              it('both owners can make withdraw requests with all staked tokens from all layer2s', async function () {
                await Promise.all(this.env.layer2s.map(async (layer2, j) => {
                  const staked1 = await this.env.seigManager.stakeOf(layer2.address, tokenOwner1.address);
                  const staked2 = await this.env.seigManager.stakeOf(layer2.address, tokenOwner2.address);

                  await this.env.depositManager.connect(tokenOwner1).requestWithdrawal(layer2.address, staked1);
                  await this.env.depositManager.connect(tokenOwner2).requestWithdrawal(layer2.address, staked2);
                }));
              });
            });
          });
        });
      });
    }

    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.0'), false);
    /*behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.3'), false);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.5'), false);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.6'), false);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.9'), false);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('1.0'), false);

    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.0'), true);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.3'), true);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.5'), true);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.6'), true);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('0.9'), true);
    behaveWhenTokensAreConcentratedOnOneSide(_WTON('1.0'), true);*/
  });
});
