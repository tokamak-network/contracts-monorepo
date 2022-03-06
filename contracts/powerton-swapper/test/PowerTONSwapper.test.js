const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Signer, Contract, BigNumber } = require("ethers");

const UniswapEnv = require("./uniswap/uniswap-env")

describe('stake/PowerTONSwapper', function () {
  let owner;
  let addr1;

  let ton;
  let wton;
  let tos;
  let powerTonSwapper;

  let uniswapEnv;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("mockERC20");
    const powerTonSwapperFactory = await ethers.getContractFactory("PowerTONSwapper");

    wton = await erc20Factory.deploy("WTON", "WTON");
    tos = await erc20Factory.deploy("TOS", "TOS");

    await wton.mint(owner.address, ethers.utils.parseUnits("100000000", 18));
    await tos.mint(owner.address, ethers.utils.parseUnits("100000000", 18));

    uniswapEnv = new UniswapEnv(owner);
    await uniswapEnv.deploy();

    await uniswapEnv.createPool(wton.address, tos.address);
    await uniswapEnv.createAndInitializePoolIfNecessary(wton.address, tos.address);

    powerTonSwapper = await powerTonSwapperFactory.deploy(
      wton.address,
      tos.address,
      uniswapEnv.deployedUniswap.swapRouter.address
    );

    await wton
      .approve(
        uniswapEnv.deployedUniswap.nftPositionManager.address,
        ethers.utils.parseUnits("9999999999", 18)
      );

    await tos
      .approve(
        uniswapEnv.deployedUniswap.nftPositionManager.address,
        ethers.utils.parseUnits("9999999999", 18)
      );

    await uniswapEnv.addPool(wton.address, tos.address);
  });

  describe('check uniswap', function () {
    it('swap', async function () {
      const wtonBalance1 = await wton.balanceOf(owner.address);
      const tosBalance1 = await tos.balanceOf(owner.address);

      const amount = ethers.utils.parseUnits("10", 18)
      await wton
        .approve(
          uniswapEnv.deployedUniswap.swapRouter.address,
          amount
        );

      await uniswapEnv.swap(wton.address, tos.address, amount);

      const wtonBalance2 = await wton.balanceOf(owner.address);
      const tosBalance2 = await tos.balanceOf(owner.address);

      expect(amount).to.not.equal(0);
      expect(wtonBalance1).to.equal(wtonBalance2.add(amount));
      expect(tosBalance2).to.above(tosBalance1);
    });
  });

  describe('PowerTONSwapper', function () {
    before(async function () {
    });

    it('swap', async function () {
      const tosBalance1 = await tos.balanceOf(powerTonSwapper.address);

      const wtonAmount = ethers.utils.parseUnits("100", 18);
      await wton.transfer(powerTonSwapper.address, wtonAmount);

      const wtonBalance1 = await wton.balanceOf(powerTonSwapper.address);
      expect(wtonBalance1).to.not.equal(0);
      expect(tosBalance1).to.equal(0);

      await powerTonSwapper.approveToUniswap();
      await powerTonSwapper.swap(
        3000,
        1000,
        0,
        0
      );

      const wtonBalance2 = await wton.balanceOf(powerTonSwapper.address);

      const tosBalance2 = await tos.balanceOf(powerTonSwapper.address);

      expect(wtonAmount).to.not.equal(0);
      expect(wtonBalance2).to.equal(0);
      expect(tosBalance2).to.equal(0);
    });
  });
});
