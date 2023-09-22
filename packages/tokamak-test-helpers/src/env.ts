import { range } from 'lodash';
import { BigNumber, Contract, utils, Wallet } from 'ethers'

import { parseTon, parseWton, tonUnitToWtonUnit, wtonUnitToTonUnit } from './unit';
import { deploy, attach } from './deploy';

import * as helpers from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const TON_INITIAL_SUPPLY = parseTon('50000000');

const dummyStatesRoot = '0xdb431b544b2f5468e3f771d7843d9c5df3b4edcf8bc1c599f18f0b4ea8709bc3';
const dummyTransactionsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const dummyReceiptsRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

const development = true;


class Layer2State {
  currentFork: BigNumber
  lastEpoch: BigNumber
  lastBlock: BigNumber
  NRE_LENGTH: BigNumber

  constructor (NRE_LENGTH) {
    this.currentFork = BigNumber.from(0);
    this.lastEpoch = BigNumber.from(0);
    this.lastBlock = BigNumber.from(0);
    this.NRE_LENGTH = NRE_LENGTH;
  }
}

export class Env {
  owner: Wallet

  NUM_ROOTCHAINS: Number
  NRE_LENGTH: Number
  WITHDRAWAL_DELAY: Number
  SEIG_PER_BLOCK: BigNumber
  POWERTON_SEIG_RATE: BigNumber
  DAO_SEIG_RATE: BigNumber
  PSEIG_RATE: BigNumber
  ROUND_DURATION: Number

  ton: Contract
  wton: Contract
  etherToken: Contract
  epochHandler: Contract
  submitHandler: Contract
  layer2s: Array<Contract>
  layer2State: any
  registry: Contract
  depositManager: Contract
  factory: Contract
  daoVault: Contract
  seigManager: Contract
  powerton: Contract
  tot: Contract
  coinages: Array<Contract>
  coinagesByLayer2: any

  daoV1Proxy: Contract
  daoV2Proxy: Contract
  daoV2Contract: Contract

  daoAgendaManager: Contract
  candidateFactory: Contract

  daoCommitteV1: Contract
  daoCommitteV2: Contract

  daoProxyLogic1: Contract
  daoProxyLogic2: Contract

  seigManagerV2Logic: Contract
  seigManagerV2Proxy: Contract
  seigManagerV2: Contract

  LibOptimism_: Contract
  libOptimism: Contract  

  LibOperator_: Contract
  libOperator: Contract

  Layer2Manager_: Contract
  Layer2ManagerLogic_: Contract
  Layer2ManagerProxy_: Contract
  layer2ManagerProxy: Contract

  layer2Manager: Contract

  OptimismSequencer_: Contract
  OptimismSequencerLogic_: Contract
  OptimismSequencerProxy_: Contract
  optimismSequencerProxy: Contract
  optimismSequencer: Contract

  Candidate_: Contract
  CandidateLogic: Contract
  CandidateProxy_: Contract
  candidateProxy: Contract
  candidate: Contract

  Lib_AddressManager: Contract
  addressManager: Contract

  MockL1Messenger: Contract
  l1Messenger: Contract

  MockL2Messenger: Contract
  l2Messenger: Contract

  MockL1Bridge: Contract
  l1Bridge: Contract

  MockL2Bridge: Contract
  l2Bridge: Contract

  TestERC20: Contract
  l2ton: Contract

  constructor(args: any) {
    this.owner = args.owner;

    this.NUM_ROOTCHAINS = 4;
    this.NRE_LENGTH = 2;
    this.WITHDRAWAL_DELAY = 10;
    this.SEIG_PER_BLOCK = parseWton('3.92');
    this.POWERTON_SEIG_RATE = parseWton('0.1');
    this.DAO_SEIG_RATE = parseWton('0.5');
    this.PSEIG_RATE = parseWton('0.4');
    this.ROUND_DURATION = 60;
  }

  static async new(owner: SignerWithAddress): Promise<Env> {
    let env = new Env({
      owner: owner
    });
    env.ton = await deploy('plasma-evm-contracts', 'TON', { signer: owner });
    env.wton = await deploy('plasma-evm-contracts', 'WTON', {
      args: [env.ton.address],
      signer: owner
    });

    env.etherToken = await deploy('plasma-evm-contracts', 'EtherToken', {
      args: [true, env.ton.address, true],
      signer: owner
    });

    env.epochHandler = await deploy('plasma-evm-contracts', 'EpochHandler', { signer: owner });
    env.submitHandler = await deploy('plasma-evm-contracts', 'SubmitHandler', {
      args: [env.epochHandler.address],
      signer: owner
    });

    env.layer2s = [];
    await Promise.all(range(env.NUM_ROOTCHAINS).map(_ => env.deployLayer2(owner)));

    // layer2 state in local
    env.layer2State = {};
    for (const layer2 of env.layer2s) {
      env.layer2State[layer2.address] = new Layer2State(env.NRE_LENGTH);
    }

    env.registry = await deploy('plasma-evm-contracts', 'Layer2Registry', { signer: owner });

    env.depositManager = await deploy('plasma-evm-contracts', 'DepositManager', {
      args: [
        env.wton.address,
        env.registry.address,
        env.WITHDRAWAL_DELAY,
      ],
      signer: owner
    });

    env.factory = await deploy('plasma-evm-contracts', 'CoinageFactory', { signer: owner });
    env.daoVault = await deploy('plasma-evm-contracts', 'DAOVault', {
      args: [env.ton.address, 0],
      signer: owner
    });

    env.seigManager = await deploy('plasma-evm-contracts', 'SeigManager', {
      args: [
        env.ton.address,
        env.wton.address,
        env.registry.address,
        env.depositManager.address,
        env.SEIG_PER_BLOCK,
        env.factory.address
      ],
      signer: owner
    });

    env.powerton = await deploy('plasma-evm-contracts', 'PowerTON', {
      args: [
        env.seigManager.address,
        env.wton.address,
        env.ROUND_DURATION,
      ],
      signer: owner
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
    await env.ton.mint(env.owner.address, TON_INITIAL_SUPPLY);
    await env.ton.approve(env.wton.address, TON_INITIAL_SUPPLY);

    // load tot token and coinage tokens
    env.tot = await attach('plasma-evm-contracts', 'AutoRefactorCoinage', await env.seigManager.tot(), { signer: owner });
    const coinageAddrs = await Promise.all(
      env.layer2s.map(layer2 => env.seigManager.coinages(layer2.address)),
    );

    env.coinages = [];
    env.coinagesByLayer2 = {};
    for (const addr of coinageAddrs) {
      const i = coinageAddrs.findIndex(a => a === addr);
      env.coinages[i] = await attach('plasma-evm-contracts', 'AutoRefactorCoinage', addr, { signer: owner });
      env.coinagesByLayer2[env.layer2s[i].address] = env.coinages[i];
    }

    env.seigManager.setPowerTONSeigRate(env.POWERTON_SEIG_RATE);
    env.seigManager.setDaoSeigRate(env.DAO_SEIG_RATE);
    env.seigManager.setPseigRate(env.PSEIG_RATE);


    //DAOv2 Part
    env.daoAgendaManager = await deploy(
      'tokamak-daov2-contracts', 
      'DAOAgendaManager', 
      { signer: owner }
    );

    env.candidateFactory = await deploy(
      'tokamak-daov2-contracts', 
      'CandidateFactory', 
      { signer: owner }
    );

    env.daoV2Proxy = await deploy(
      'tokamak-daov2-contracts', 
      'DAOCommitteeProxyV2', 
      { signer: owner }
    );

    env.daoV1Proxy = await deploy(
      'tokamak-daov2-contracts', 
      'DAOCommitteeProxy', 
    {
      args: [
        env.ton.address,
        env.daoV2Proxy.address,
        env.seigManager.address,
        env.registry.address,
        env.daoAgendaManager.address,
        env.candidateFactory.address,
        env.daoVault.address
      ],
      signer: owner
    })

    env.daoCommitteV1 = await deploy(
      'tokamak-daov2-contracts', 
      'DAOv2CommitteeV1', 
      { signer: owner }
    )

    env.daoCommitteV2 = await deploy(
      'tokamak-daov2-contracts', 
      'DAOv2CommitteeV2', 
      { signer: owner }
    )

    return env;
  }

  async deployLayer2(
    owner: any
  ): Promise<void> {
    const newLayer2 = await deploy('plasma-evm-contracts', 'Layer2', {
      args: [
        this.epochHandler.address,
        this.submitHandler.address,
        this.etherToken.address,
        development,
        this.NRE_LENGTH,
        dummyStatesRoot,
        dummyTransactionsRoot,
        dummyReceiptsRoot,
      ],
      signer: owner
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

    layer2State.lastEpoch = layer2State.lastEpoch.add(2) // skip ORE
    layer2State.lastBlock = layer2State.lastBlock.add(layer2State.NRE_LENGTH);

    const COST_NRB = await layer2.COST_NRB();

    return layer2.submitNRE(
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
      await helpers.time.increase(1);
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
