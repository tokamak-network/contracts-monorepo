const range = require('lodash/range');
const { hre, ethers } = require('hardhat');
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

const chai = require('chai');
const { expect } = chai;
chai.should();

const RAY_UNIT = ethers.BigNumber.from(1e9);

describe('AutoRefactorCoinage', function () {
	let tokenOwner

  const factor = ethers.BigNumber.from(1e9);
  const initialSupply = ethers.BigNumber.from(10000e9);

  async function deploy () {
		const Factory__AutoRefactorCoinage = await ethers.getContractFactory('AutoRefactorCoinage')
    return await Factory__AutoRefactorCoinage.deploy(
      'AutoRefactorCoinage Test',
      'CAT',
      factor.mul(RAY_UNIT)
    );
  }

  beforeEach(async function () {
		[tokenOwner] = await ethers.getSigners()
    this.coinage = await deploy();
  });


  async function advanceRandomBlock (min, max = 0) {
    const n1 = (Math.floor(Math.random() * 20) + (min || 1));
    const n = max ? n1 % max + 1 : n1;

		await mine(n);
    return n;
  }
  async function advanceBlocks (n) {
		return await mine(n);
  }

  /**
   * @param {Promise} balanceProm
   * @param {CAG} expected
   */
  async function checkBalanceProm (balanceProm, expected) {
    return checkBalance(await balanceProm, expected);
  }

  function checkBalance (balanceBN, expected) {
    const balance = CAG(balanceBN, CAG_UNIT);
    toBN(balance.mul(RAY_UNIT)).sub(toBN(expected.mul(RAY_UNIT))).abs()
      .should.be.bignumber.lte(e);
  }

  describe('#factor', function () {
    const amount = initialSupply;
    const newFactor = factor.mul(2);

    describe('when total supply is zero', function () {
      describe('when new factor is set to half of previous factor', function () {
        beforeEach(async function () {
          this.setReceipt = await this.coinage.setFactor(newFactor.mul(RAY_UNIT));
        });

        afterEach(function () {
          delete this.setReceipt;
        });

        it('should have correct new factor', async function () {
          expect(await this.coinage.factor()).to.equal(newFactor.mul(RAY_UNIT));
        });

        /*it('should emit event', async function () {
          const { logs } = this.setReceipt;
          expectEvent.inLogs(logs, 'FactorSet', {
            previous: factor.mul(RAY_UNIT),
            current: newFactor.mul(RAY_UNIT),
          });
        });*/
      });
    });

    describe('when total supply is non-zero', function () {
      beforeEach(async function () {
        await advanceRandomBlock(4);
        await this.coinage.mint(tokenOwner.address, amount.mul(RAY_UNIT));
        await advanceRandomBlock(4);
      });

      describe('before new factor is set', function () {
        it('factor should not change', async function () {
          expect(await this.coinage.factor()).to.equal(factor.mul(RAY_UNIT));
        });

        it('total supply should not change', async function () {
          expect(await this.coinage.totalSupply()).to.equal(amount.mul(RAY_UNIT));
        });

        it('balance should not change', async function () {
          expect(await this.coinage.balanceOf(tokenOwner.address)).to.equal(amount.mul(RAY_UNIT));
        });
      });

      describe('after new factor is set to double of previous factor', function () {
        beforeEach(async function () {
          await this.coinage.setFactor(newFactor.mul(RAY_UNIT));
        });

        it('factor should be double of the previous value', async function () {
          expect(await this.coinage.factor()).to.equal(factor.mul(2).mul(RAY_UNIT));
        });

        it('total supply should be double of the previous value', async function () {
          expect(await this.coinage.totalSupply()).to.equal(amount.mul(2).mul(RAY_UNIT));
        });

        it('balance should be double of the previous value', async function () {
          expect(await this.coinage.balanceOf(tokenOwner.address)).to.equal(amount.mul(2).mul(RAY_UNIT));
        });
      });
    });

    describe('large factor', function () {
      beforeEach(async function () {
        let newFactor = factor;
        const c = ethers.BigNumber.from(amount.mul(RAY_UNIT)).mul(10);
        newFactor = newFactor.mul(c);
        await this.coinage.setFactor(newFactor.mul(RAY_UNIT));
      });
      describe('mint', function () {
        beforeEach(async function () {
          await this.coinage.mint(tokenOwner.address, amount.mul(RAY_UNIT));
        });
        it('balance should be correct', async function () {
          const balance = await this.coinage.balanceOf(tokenOwner.address);
          balance.should.equal(amount.mul(RAY_UNIT));
        });
        it('totalSupply should be correct', async function () {
          const supply = await this.coinage.totalSupply();
          supply.should.equal(amount.mul(RAY_UNIT));
        });
      });
      describe('burn', function () {
        beforeEach(async function () {
          await this.coinage.mint(tokenOwner.address, amount.mul(RAY_UNIT));
          await this.coinage.burnFrom(tokenOwner.address, amount.mul(RAY_UNIT));
        });
        it('balance should be correct', async function () {
          const balance = await this.coinage.balanceOf(tokenOwner.address);
          balance.should.equal(toBN('0'));
        });
        it('totalSupply should be correct', async function () {
          const supply = await this.coinage.totalSupply();
          supply.should.equal(toBN('0'));
        });
      });
    });
  });
});
