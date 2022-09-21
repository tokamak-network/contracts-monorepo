import { hre, ethers } from 'hardhat';

const { createCurrency } = require('@makerdao/currency');

import { deploy } from '../helpers/deploy';

import chai = require('chai');
const { expect } = chai;
chai.should();

const _TON = createCurrency('TON');
const _WTON = createCurrency('WTON');

const TON_UNIT = 'wei';
const WTON_UNIT = 'ray';

const dummyStatesRoot = '0xdb431b544b2f5468e3f771d7843d9c5df3b4edcf8bc1c599f18f0b4ea8709bc3';
const dummyTransactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const dummyReceiptsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

const tokenAmount = _TON('1000');

describe('stake/WTON', function () {
  let defaultSender: SignerWithAddress;
  let receiver: SignerWithAddress;

  beforeEach(async function () {
    [ defaultSender, receiver ] = await ethers.getSigners();

    this.ton = await deploy('TON');
    this.wton = await deploy('WTON', {
      args: [this.ton.address]
    });
  });

  beforeEach(async function () {
    await this.ton.approve(this.wton.address, tokenAmount.toFixed(TON_UNIT));
  });

  describe('when swap TON to WTON', function () {
    beforeEach(async function () {
      await this.ton.mint(defaultSender.address, tokenAmount.toFixed(TON_UNIT));
    });

    it('should swap TON to WTON', async function () {
      expect(await this.ton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(TON_UNIT));
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal('0');

      await this.wton.swapFromTON(tokenAmount.toFixed(TON_UNIT));

      expect(await this.ton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));
    });

    it('should swap TON to WTON with transferring swapped WTON', async function () {
      expect(await this.ton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(TON_UNIT));
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(receiver.address)).to.equal('0');

      await this.wton.swapFromTONAndTransfer(receiver.address, tokenAmount.toFixed(TON_UNIT));

      expect(await this.ton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(receiver.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));
    });
  });

  describe('when swap WTON to TON', function () {
    beforeEach(async function () {
      await this.ton.mint(defaultSender.address, tokenAmount.toFixed(TON_UNIT));
      await this.wton.swapFromTON(tokenAmount.toFixed(TON_UNIT));
    });

    it('should swap WTON to TON', async function () {
      expect(await this.ton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));

      await this.wton.swapToTON(tokenAmount.toFixed(WTON_UNIT));

      expect(await this.ton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(TON_UNIT));
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal('0');
    });

    it('should swap WTON to TON with transferring swapped TON', async function () {
      expect(await this.ton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal(tokenAmount.toFixed(WTON_UNIT));
      expect(await this.ton.balanceOf(receiver.address)).to.equal('0');

      await this.wton.swapToTONAndTransfer(receiver.address, tokenAmount.toFixed(WTON_UNIT));

      expect(await this.ton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.wton.balanceOf(defaultSender.address)).to.equal('0');
      expect(await this.ton.balanceOf(receiver.address)).to.equal(tokenAmount.toFixed(TON_UNIT));
    });
  });
});
