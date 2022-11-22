import { hre, ethers } from 'hardhat';
import { range } from 'lodash';
import { BigNumber, Contract, utils, Wallet } from 'ethers'

import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { deploy, attach } from './deploy';
import { marshalString, unmarshalString } from './marshal';

import { time } from '@openzeppelin/test-helpers';
import * as helpers from '@nomicfoundation/hardhat-network-helpers';

const _TON = createCurrency('TON');
const _WTON = createCurrency('WTON');
const _WTON_TON = createCurrencyRatio(_WTON, _TON);

const TON_UNIT = 'wei';
const WTON_UNIT = 'ray';
const WTON_TON_RATIO = _WTON_TON('1');

const TON_INITIAL_SUPPLY = _TON('50000000');

const dummyStatesRoot = '0xdb431b544b2f5468e3f771d7843d9c5df3b4edcf8bc1c599f18f0b4ea8709bc3';
const dummyTransactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const dummyReceiptsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

const development = true;


class Layer2State {
  constructor (NRE_LENGTH) {
    this.currentFork = BigNumber.from(0);
    this.lastEpoch = BigNumber.from(0);
    this.lastBlock = BigNumber.from(0);
    this.NRE_LENGTH = Number(NRE_LENGTH);
  }
}

export class Env {
  owner: Wallet

  constructor(args: any) {
    this.owner = args.owner;

    this.NUM_ROOTCHAINS = 4;
    this.NRE_LENGTH = 2;
    this.WITHDRAWAL_DELAY = 10;
    this.SEIG_PER_BLOCK = _WTON('3.92'); // 100 (W)TON / block
    this.POWERTON_SEIG_RATE = _WTON('0.1');
    this.DAO_SEIG_RATE = _WTON('0.5');
    this.PSEIG_RATE = _WTON('0.4');
    this.ROUND_DURATION = time.duration.minutes(1);
  }

  static async new(owner: SignerWithAddress): Promise<Env> {
    let env = new Env({
      owner: owner
    });
    env.ton = await deploy('TON');
    env.wton = await deploy('WTON', {
      args: [env.ton.address]
    });

    env.etherToken = await deploy('EtherToken', {
      args: [true, env.ton.address, true]
    });

    env.epochHandler = await deploy('EpochHandler');
    env.submitHandler = await deploy('SubmitHandler', {
      args: [env.epochHandler.address]
    });

    env.layer2s = [];
    await Promise.all(range(env.NUM_ROOTCHAINS).map(_ => env.deployLayer2()));

    // layer2 state in local
    env.layer2State = {};
    for (const layer2 of env.layer2s) {
      env.layer2State[layer2.address] = new Layer2State(env.NRE_LENGTH);
    }

    env.registry = await deploy('Layer2Registry');

    env.depositManager = await deploy('DepositManager', {
      args: [
        env.wton.address,
        env.registry.address,
        env.WITHDRAWAL_DELAY,
      ]
    });

    env.factory = await deploy('CoinageFactory');
    env.daoVault = await deploy('DAOVault', {
      args: [env.ton.address, 0]
    });

    env.seigManager = await deploy('SeigManager', {
      args: [
        env.ton.address,
        env.wton.address,
        env.registry.address,
        env.depositManager.address,
        env.SEIG_PER_BLOCK.toFixed(WTON_UNIT),
        env.factory.address
      ]
    });

    env.powerton = await deploy('PowerTON', {
      args: [
        env.seigManager.address,
        env.wton.address,
        env.ROUND_DURATION.toNumber(),
      ]
    });

    await env.powerton.init();

    await env.seigManager.setPowerTON(env.powerton.address);
    await env.powerton.start();
    await env.seigManager.setDao(env.daoVault.address);

    // add minter roles
    await env.wton.addMinter(env.seigManager.address);
    await env.ton.addMinter(env.wton.address);

    // set seig manager to contracts
    await Promise.all([
      env.depositManager,
      env.wton,
    ].map(contract => contract.setSeigManager(env.seigManager.address)));
    await Promise.all(env.layer2s.map(layer2 => layer2.setSeigManager(env.seigManager.address)));

    // register layer2 and deploy coinage
    await Promise.all(env.layer2s.map(layer2 => env.registry.registerAndDeployCoinage(layer2.address, env.seigManager.address)));

    // mint TON to accounts
    await env.ton.mint(env.owner.address, TON_INITIAL_SUPPLY.toFixed(TON_UNIT));
    await env.ton.approve(env.wton.address, TON_INITIAL_SUPPLY.toFixed(TON_UNIT));

    // load tot token and coinage tokens
    env.tot = await attach('AutoRefactorCoinage', await env.seigManager.tot());
    const coinageAddrs = await Promise.all(
      env.layer2s.map(layer2 => env.seigManager.coinages(layer2.address)),
    );

    env.coinages = [];
    env.coinagesByLayer2 = {};
    for (const addr of coinageAddrs) {
      const i = coinageAddrs.findIndex(a => a === addr);
      env.coinages[i] = await attach('AutoRefactorCoinage', addr);
      env.coinagesByLayer2[env.layer2s[i].address] = env.coinages[i];
    }

    env.seigManager.setPowerTONSeigRate(env.POWERTON_SEIG_RATE.toFixed(WTON_UNIT));
    env.seigManager.setDaoSeigRate(env.DAO_SEIG_RATE.toFixed(WTON_UNIT));
    env.seigManager.setPseigRate(env.PSEIG_RATE.toFixed(WTON_UNIT));

    return env;
  }

  async deployLayer2(
  ): Promise<void> {
    const newLayer2 = await deploy('Layer2', {
      args: [
        this.epochHandler.address,
        this.submitHandler.address,
        this.etherToken.address,
        development,
        this.NRE_LENGTH,
        dummyStatesRoot,
        dummyTransactionsRoot,
        dummyReceiptsRoot,
      ]
    });

    this.layer2s.push(newLayer2);
  }

  async deposit(
    from: SignerWithAddress,
    to: String,
    amount: BigNumber
  ): Promise<void> {
    await this.depositManager.connect(from).deposit(to, amount);
  }

  makePos(
    v1: BigNumber,
    v2: BigNumber
  ): BigNumber {
    return v1.shl(128).add(v2);
  }

  async submitDummyNRE(
    layer2: Contract,
    layer2State: Layer2State
  ): Promise<void> {
    const pos1 = this.makePos(layer2State.currentFork, layer2State.lastEpoch.add(1));
    const pos2 = this.makePos(layer2State.lastBlock.add(1), layer2State.lastBlock.add(layer2State.NRE_LENGTH));

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

  async commit(
    layer2: Contract,
  ): Promise<void> {
    await this.submitDummyNRE(layer2, this.layer2State[layer2.address]);
  }

  async submitDummyNREs(
    layer2: Contract,
    layer2State: Layer2State,
    n: BigNumber
  ): Promise<void> {
    for (const _ of range(n)) {
      await helpers.time.increase(3);
      await this.submitDummyNRE(layer2, layer2State);
    }
  }

  async multiCommit(
    layer2: Contract,
    n: BigNumber
  ): Promise<void> {
    await this.submitDummyNREs(layer2, this.layer2State[layer2.address], n);
  }

}
