const expectEvent = require('openzeppelin-solidity/test/helpers/expectEvent');
const { expectThrow } = require('openzeppelin-solidity/test/helpers/expectThrow');
const { padLeft, padRight } = require('./helpers/pad');

const RequestableERC20Wrapper = artifacts.require('./RequestableERC20Wrapper.sol');
const ERC20Mintable = artifacts.require('./ERC20Mintable.sol');

require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('RequestableERC20Wrapper', (accounts) => {
  const [
    owner,
    user,
  ] = accounts;

  const tokenAmount = 10000;
  const requestAmount = 100;

  let token, wrapper;

  before(async () => {
    token = await ERC20Mintable.deployed();
    wrapper = await RequestableERC20Wrapper.deployed();

    console.log(`
      token:    ${token.address}
      wrapper:  ${wrapper.address}
    `);

    await wrapper.init(owner);
    await token.mint(user, tokenAmount);
  });

  describe('deposit and withdraw', async () => {
    it('user can deposit token', async () => {
      (await token.balanceOf(user)).should.be.bignumber.equal(tokenAmount);

      await token.approve(wrapper.address, tokenAmount, { from: user });

      await wrapper.deposit(tokenAmount, { from: user });
      (await token.balanceOf(user)).should.be.bignumber.equal(0);
      (await wrapper.balanceOf(user)).should.be.bignumber.equal(tokenAmount);
    });

    it('user can withdraw token', async () => {
      await wrapper.withdraw(requestAmount, { from: user });
      (await token.balanceOf(user)).should.be.bignumber.equal(requestAmount);
      (await wrapper.balanceOf(user)).should.be.bignumber.equal(tokenAmount - requestAmount);
    });
  });

  describe('request on token balance', () => {
    let requestId = 0;
    let trieKey;
    const trieValue = padLeft(requestAmount);

    before(async () => {
      trieKey = await wrapper.getBalanceTrieKey(user);
    });

    describe('#Enter', () => {
      const isExit = false;

      it('cannot make an enter request over his balance', async () => {
        const overTokenAmount = 1e19;
        const overTrieValue = padLeft(overTokenAmount);

        await expectThrow(
          wrapper.applyRequestInRootChain(isExit, requestId++, user, trieKey, overTrieValue),
        );
      });

      it('can make an enter request', async () => {
        const balance0 = await wrapper.balanceOf(user);

        await wrapper.applyRequestInRootChain(isExit, requestId++, user, trieKey, trieValue);

        const balance1 = await wrapper.balanceOf(user);

        (balance1.sub(balance0)).should.be.bignumber.equal(-requestAmount);
      });

      it('balance in child chain should be updated', async () => {
        const balance0 = await wrapper.balanceOf(user);

        await wrapper.applyRequestInChildChain(isExit, requestId++, user, trieKey, trieValue);

        const balance1 = await wrapper.balanceOf(user);

        (balance1.sub(balance0)).should.be.bignumber.equal(requestAmount);
        // don't need to restore balance
      });
    });

    describe('#Exit', () => {
      const isExit = true;

      it('cannot make an exit request over his balance', async () => {
        const overTokenAmount = 1e19;
        const overTrieValue = padLeft(overTokenAmount);

        await expectThrow(
          wrapper.applyRequestInChildChain(isExit, requestId++, user, trieKey, overTrieValue),
        );
      });

      it('can make an exit request', async () => {
        const balance0 = await wrapper.balanceOf(user);

        await wrapper.applyRequestInChildChain(isExit, requestId++, user, trieKey, trieValue);

        const balance1 = await wrapper.balanceOf(user);
        (balance1.sub(balance0)).should.be.bignumber.equal(-requestAmount);
      });

      it('balance in root chain should be updated', async () => {
        const balance0 = await wrapper.balanceOf(user);

        await wrapper.applyRequestInRootChain(isExit, requestId++, user, trieKey, trieValue);

        const balance1 = await wrapper.balanceOf(user);
        (balance1.sub(balance0)).should.be.bignumber.equal(requestAmount);
      });
    });
  });
});
