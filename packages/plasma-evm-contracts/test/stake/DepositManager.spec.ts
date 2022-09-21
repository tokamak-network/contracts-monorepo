import { hre, ethers } from 'hardhat';
import { Contract, utils } from 'ethers'
import { range } from 'lodash';

import { createCurrency } from '@makerdao/currency';

import { time } from '@openzeppelin/test-helpers';
import { mine } from '@nomicfoundation/hardhat-network-helpers';

const { marshalString, unmarshalString } = require('../helpers/marshal');

import { deploy, attach } from '../helpers/deploy';

import chai = require('chai');
import { solidity } from 'ethereum-waffle'

chai.use(solidity)
const { expect } = chai;
chai.should();

const LOGTX = process.env.LOGTX || false;
const VERBOSE = process.env.VERBOSE || false;

const development = true;

const _TON = createCurrency('TON');
const _WTON = createCurrency('WTON');

const TON_UNIT = 'wei';
const WTON_UNIT = 'ray';

const dummyStatesRoot = '0xdb431b544b2f5468e3f771d7843d9c5df3b4edcf8bc1c599f18f0b4ea8709bc3';
const dummyTransactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const dummyReceiptsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

const initialSupply = _WTON('1000');
const tokenAmount = initialSupply.div(100);
const WITHDRAWAL_DELAY = 10;

const ROUND_DURATION = time.duration.minutes(1);

describe('stake/DepositManager', function () {
  let operator: SignerWithAddress;
  let tokenOwner: SignerWithAddress;

  beforeEach(async function () {
    [ operator, tokenOwner ] = await ethers.getSigners();

    this.ton = await deploy('TON');
    this.wton = await deploy('WTON', {
      args: [this.ton.address],
    });

    this.etherToken = await deploy('EtherToken', {
      args: [true, this.ton.address, true],
    });

    const epochHandler = await deploy('EpochHandler');
    const submitHandler = await deploy('SubmitHandler', {
      args: [epochHandler.address],
    });

    this.layer2 = await deploy('Layer2', {
      args: [
        epochHandler.address,
        submitHandler.address,
        this.etherToken.address,
        development,
        1,
        dummyStatesRoot,
        dummyTransactionsRoot,
        dummyReceiptsRoot,
      ]
    });

    this.registry = await deploy('Layer2Registry');

    this.depositManager = await deploy('DepositManager', {
      args: [
        this.wton.address,
        this.registry.address,
        WITHDRAWAL_DELAY,
      ],
    });

    this.factory = await deploy('CoinageFactory');

    this.seigManager = await deploy('SeigManager', {
      args: [
        this.ton.address,
        this.wton.address,
        this.registry.address,
        this.depositManager.address,
        _WTON('100').toFixed(WTON_UNIT),
        this.factory.address
      ],
    });

    this.powerton = await deploy('PowerTON', {
      args: [
        this.seigManager.address,
        this.wton.address,
        ROUND_DURATION.toNumber(),
      ],
    });

    await this.powerton.init();

    await this.seigManager.setPowerTON(this.powerton.address);
    await this.powerton.start();

    // add minter roles
    await this.wton.addMinter(this.seigManager.address);
    await this.ton.addMinter(this.wton.address);

    // set seig manager to contracts
    await Promise.all([
      this.depositManager,
      this.wton,
    ].map(contract => contract.setSeigManager(this.seigManager.address)));
    await this.layer2.setSeigManager(this.seigManager.address);

    // register layer2 and deploy coinage
    await this.registry.registerAndDeployCoinage(this.layer2.address, this.seigManager.address);

    // mint WTON to account
    await this.wton.mint(tokenOwner.address, initialSupply.toFixed(WTON_UNIT));

    // load coinage and tot
    this.coinage = await attach('AutoRefactorCoinage', await this.seigManager.coinages(this.layer2.address));
    this.tot = await attach('AutoRefactorCoinage', await this.seigManager.tot());
  });

  describe('when the token owner tries to deposit', function () {
    describe('after the token holder approve WTON', function () {
      beforeEach(async function () {
        await this.wton.connect(tokenOwner).approve(this.depositManager.address, tokenAmount.toFixed(WTON_UNIT));
      });

      it('should deposit WTON', async function () {
        const wtonBalance0 = await this.wton.balanceOf(tokenOwner.address);

        await expect(
          this.depositManager.connect(tokenOwner).deposit(
            this.layer2.address,
            tokenAmount.toFixed(WTON_UNIT)
          )
        ).to.emit(this.depositManager, 'Deposited')
        .withArgs(this.layer2.address, tokenOwner.address, tokenAmount.toFixed(WTON_UNIT));
        const wtonBalance1 = await this.wton.balanceOf(tokenOwner.address);

        expect(await this.seigManager.stakeOf(this.layer2.address, tokenOwner.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));
        expect(wtonBalance0.sub(wtonBalance1)).to.equal(tokenAmount.toFixed(WTON_UNIT));
      });
    });

    describe('when the token owner tries to deposit with TON.approveAndCall', async function () {
      beforeEach(async function () {
        await this.ton.mint(tokenOwner.address, tokenAmount.toFixed(TON_UNIT));
      });

      it('should deposit WTON from TON', async function () {
        const tonBalance0 = await this.ton.balanceOf(tokenOwner.address);

        const data = marshalString(
          [this.depositManager.address, this.layer2.address]
            .map(str => unmarshalString(utils.hexZeroPad(str, 32)))
            .join(''),
        );

        await expect(
          this.ton.connect(tokenOwner).approveAndCall(
            this.wton.address,
            tokenAmount.toFixed(TON_UNIT),
            data,
          )
        ).to.emit(this.depositManager, 'Deposited')
        .withArgs(this.layer2.address, tokenOwner.address, tokenAmount.toFixed(WTON_UNIT));
        const tonBalance1 = await this.ton.balanceOf(tokenOwner.address);

        expect(await this.seigManager.stakeOf(this.layer2.address, tokenOwner.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));
        expect(tonBalance0.sub(tonBalance1)).to.equal(tokenAmount.toFixed(TON_UNIT));
      });
    });
  });

  describe('after the token owner deposits tokens', function () {
    beforeEach(async function () {
      await this.wton.connect(tokenOwner).approve(this.depositManager.address, tokenAmount.toFixed(WTON_UNIT));
      await this.depositManager.connect(tokenOwner).deposit(this.layer2.address, tokenAmount.toFixed(WTON_UNIT));
    });

    describe('when the token owner tries to withdraw', function () {
      it('should make a withdrawal request', async function () {
        await this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, tokenAmount.toFixed(WTON_UNIT));
      });

      it('should get request data', async function () {
        const n = 10;
        for (const index of range(n)) {
          await this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, tokenAmount.div(n).toFixed(WTON_UNIT));

          const request = await this.depositManager.withdrawalRequest(this.layer2.address, tokenOwner.address, index);
          expect(request.amount).to.equal(tokenAmount.div(n).toFixed(WTON_UNIT));

          expect(await this.depositManager.numRequests(this.layer2.address, tokenOwner.address))
            .to.equal(index + 1);
          expect(await this.depositManager.numPendingRequests(this.layer2.address, tokenOwner.address))
            .to.equal(index + 1);
        }
      });

      describe('withdrawal delay', function () {
        function behaveWithDelay(globalValue, chainValue) {
          it(`global delay ${globalValue}, chain delay ${chainValue}`, async function () {
            await this.depositManager.setGlobalWithdrawalDelay(globalValue);
            await this.depositManager.setWithdrawalDelay(this.layer2.address, chainValue);

            const actualDelay = globalValue > chainValue ? globalValue : chainValue;

            await this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, tokenAmount.toFixed(WTON_UNIT));

            for (var i = 0; i < actualDelay - 1; i++) {
              await expect(
                this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, false)
              ).to.be.revertedWith('DepositManager: wait for withdrawal delay');
            }

            await expect(
              this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, true)
            ).to.emit(this.ton, 'Transfer')
            .withArgs(this.wton.address, tokenOwner.address, tokenAmount.toFixed(TON_UNIT));
          });
        }

        const globalValue = [5, 7];
        const chainValue = [6, 8];

        globalValue.forEach(gv => chainValue.forEach(cv => behaveWithDelay(gv, cv)));
      });

      describe('before WITHDRAWAL_DELAY blocks are mined', function () {
        beforeEach(async function () {
          await this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, tokenAmount.toFixed(WTON_UNIT));
        });

        it('should not process withdrawal request', async function () {
          await expect(
            this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, false)
          ).to.be.revertedWith('DepositManager: wait for withdrawal delay');
        });

        it('should be able to re-deposit pending request', async function () {
          await this.depositManager.connect(tokenOwner).redeposit(this.layer2.address);
        });
      });

      describe('after WITHDRAWAL_DELAY blocks are mined', function () {
        beforeEach(async function () {
          await this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, tokenAmount.toFixed(WTON_UNIT));
          await mine(WITHDRAWAL_DELAY + 1);
        });

        it('should withdraw deposited WTON to the token owner', async function () {
          await expect(
            this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, false)
          ).to.emit(this.wton, 'Transfer')
          .withArgs(this.depositManager.address, tokenOwner.address, tokenAmount.toFixed(WTON_UNIT));
        });

        it('should withdraw deposited WTON to the token owner in TON', async function () {
          await expect(
            this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, true)
          ).to.emit(this.ton, 'Transfer')
          .withArgs(this.wton.address, tokenOwner.address, tokenAmount.toFixed(TON_UNIT));
        });

        it('should be able to re-deposit pending request', async function () {
          await this.depositManager.connect(tokenOwner).redeposit(this.layer2.address);
        });
      });

      describe('when the token owner make 2 requests', function () {
        const amount = tokenAmount.div(2);
        const n = 2;

        beforeEach(async function () {
          await Promise.all(range(n).map(_ =>
            this.depositManager.connect(tokenOwner).requestWithdrawal(this.layer2.address, amount.toFixed(WTON_UNIT)),
          ));
        });

        describe('before WITHDRAWAL_DELAY blocks are mined', function () {
          it('should not process withdrawal request', async function () {
            await expect(
              this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, false)
            ).to.be.revertedWith('DepositManager: wait for withdrawal delay');
          });

          it('should be able to re-deposit all pending request', async function () {
            await Promise.all(range(n).map(
              _ => this.depositManager.connect(tokenOwner).redeposit(this.layer2.address),
            ));
            // await this.depositManager.redeposit(this.layer2.address, { from: tokenOwner.address });
            // await this.depositManager.redeposit(this.layer2.address, { from: tokenOwner.address });
          });

          it('should be able to re-deposit all pending request in a single transaction', async function () {
            await this.depositManager.connect(tokenOwner).redepositMulti(this.layer2.address, 2);
          });
        });

        describe('after WITHDRAWAL_DELAY blocks are mined', function () {
          beforeEach(async function () {
            await mine(WITHDRAWAL_DELAY + 1);
          });

          it('should process 2 requests', async function () {
            for (const _ of range(2)) {
              await expect(
                this.depositManager.connect(tokenOwner).processRequest(this.layer2.address, false)
              ).to.emit(this.wton, 'Transfer')
              .withArgs(this.depositManager.address, tokenOwner.address, amount.toFixed(WTON_UNIT));
            }
          });

          it('should be able to re-deposit all pending request', async function () {
            await Promise.all(range(n).map(
              _ => this.depositManager.connect(tokenOwner).redeposit(this.layer2.address),
            ));
          });

          it('should be able to re-deposit all pending request in a single transaction', async function () {
            await this.depositManager.connect(tokenOwner).redepositMulti(this.layer2.address, 2);
          });
        });
      });
    });
  });
});
