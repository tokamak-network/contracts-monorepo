
import { ethers } from 'hardhat'
import {  Wallet, Signer } from 'ethers'

// import { DAOv2CommitteeProxy } from '../../typechain-types/contracts/dao/DAOv2CommitteeProxy.' 
import { DAOv2Committee } from '../../typechain-types/contracts/dao/DAOv2Committee.sol' 
import { DAOv2CommitteeV2 } from '../../typechain-types/contracts/dao/DAOv2CommitteeV2.sol' 
import { DAOAgendaManager } from '../../typechain-types/contracts/test/DAOAgendaManager' 
import { DAOVault } from '../../typechain-types/contracts/test/DAOVault' 

import { SeigManagerV2Proxy } from '../../typechain-types/contracts/proxy/SeigManagerV2Proxy'
import { SeigManagerV2 } from '../../typechain-types/contracts/test/SeigManagerV2.sol'
import { Layer2ManagerProxy } from '../../typechain-types/contracts/proxy/Layer2ManagerProxy'
import { Layer2Manager } from '../../typechain-types/contracts/test/Layer2Manager.sol'

import { OptimismSequencerProxy } from '../../typechain-types/contracts/proxy/OptimismSequencerProxy'
import { OptimismSequencer } from '../../typechain-types/contracts/test/OptimismSequencer'
import { CandidateProxy } from '../../typechain-types/contracts/proxy/CandidateProxy'
import { Candidate } from '../../typechain-types/contracts/test/Candidate'

import { TON } from '../../typechain-types/contracts/test/TON.sol'
import { Lib_AddressManager } from '../../typechain-types/contracts/test/Lib_AddressManager'
import { MockL1Messenger } from '../../typechain-types/contracts/test/MockL1Messenger'
import { MockL2Messenger } from '../../typechain-types/contracts/test/MockL2Messenger'
import { MockL1Bridge } from '../../typechain-types/contracts/test/MockL1Bridge.sol'
import { MockL2Bridge } from '../../typechain-types/contracts/test/MockL2Bridge'
import { TestERC20 } from '../../typechain-types/contracts/test/TestERC20'

import { LibOperator } from '../../typechain-types/contracts/libraries/LibOperator'
import { LibOptimism } from '../../typechain-types/contracts/libraries/LibOptimism'

import TON_ABI from '../../artifacts/contracts/test/TON.sol/TON.json'
import { Layer2Fixture, DAOStakingV2Fixture } from './fixtureInterfaces'

import DAOAgendaManger_ABI from '../../abi/DAOAgendaManager.json'
import DAOVault_ABI from '../../artifacts/contracts/test/DAOVault.sol/DAOVault.json'

// mainnet
let tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
let wtonAddress = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
let tonAdminAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26";
let daoCommitteProxyAddress = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26"; //DAOCommitteProxy Address
let daoAgendaMangerAddress = "0xcD4421d082752f363E1687544a09d5112cD4f484"; //DAOAgendaManager Address
let daoVaultAddress = "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" ;    //DAOVault Address

// export const daoV2Fixtures = async function (): Promise<DAOV2Fixture> {
//     const [deployer] = await ethers.getSigners();

//     const daov2comLogic_ = await ethers.getContractFactory('DAOv2Committee');
//     const daov2comLogic = (await daov2comLogic_.connect(deployer).deploy()) as DAOv2Committee

//     const daov2committeProxy_ = await ethers.getContractFactory('DAOv2CommitteeProxy');
//     const daov2committeProxy = (await daov2committeProxy_.connect(deployer).deploy()) as DAOv2CommitteeProxy
//     await daov2committeProxy.connect(deployer).upgradeTo(daov2comLogic.address);

//     const daov2commitee = daov2comLogic.attach(daov2committeProxy.address) as DAOv2Committee

//     const daoagenda_ = await ethers.getContractFactory('DAOAgendaManager');
//     const daoagenda = (await daoagenda_.connect(deployer).deploy()) as DAOAgendaManager
    
//     const daovault_ = await ethers.getContractFactory('DAOVault');
//     const daovault = (await daovault_.connect(deployer).deploy(tonAddress,wtonAddress)) as DAOVault

//     return  {
//         daov2committeeProxy: daov2committeProxy,
//         daov2committee: daov2commitee,
//         daoagendaManager: daoagenda,
//         daovault: daovault
//     }
// }

export const daostakingV2Fixtures = async function (): Promise<DAOStakingV2Fixture> {
    const [deployer, addr1, addr2, sequencer1, stosDistribute, daoPrivateOwner, candidate1, candidate2, candidate3 ] = await ethers.getSigners();
    console.log(deployer.address);
    await ethers.provider.send("hardhat_impersonateAccount",[daoCommitteProxyAddress]);
    const DAOContract = await ethers.getSigner(daoCommitteProxyAddress);
    const tonAdmin = await ethers.getSigner(tonAdminAddress);
    
    const factoryLogic = await ethers.getContractFactory('SeigManagerV2')
    const seigManagerV2Logic = (await factoryLogic.connect(deployer).deploy()) as SeigManagerV2
    
    const factoryProxy = await ethers.getContractFactory('SeigManagerV2Proxy')
    const seigManagerV2Proxy = (await factoryProxy.connect(deployer).deploy()) as SeigManagerV2Proxy
    await seigManagerV2Proxy.connect(deployer).upgradeTo(seigManagerV2Logic.address);
    const seigManagerV2 = seigManagerV2Logic.attach(seigManagerV2Proxy.address) as SeigManagerV2
    
    // LibOptimism.sol
    const LibOptimism_ = await ethers.getContractFactory('LibOptimism');
    const libOptimism = (await LibOptimism_.connect(deployer).deploy()) as LibOptimism

    // LibOperator.sol
    const LibOperator_ = await ethers.getContractFactory('LibOperator');
    const libOperator = (await LibOperator_.connect(deployer).deploy()) as LibOperator
    //
    const Layer2Manager_ = await ethers.getContractFactory('Layer2Manager', {
        signer: deployer, libraries: { LibOptimism: libOptimism.address, LibOperator: libOperator.address }
    })
    const Layer2ManagerLogic_ = (await Layer2Manager_.connect(deployer).deploy()) as Layer2Manager

    const Layer2ManagerProxy_ = await ethers.getContractFactory('Layer2ManagerProxy')
    const layer2ManagerProxy = (await Layer2ManagerProxy_.connect(deployer).deploy()) as Layer2ManagerProxy
    await layer2ManagerProxy.connect(deployer).upgradeTo(Layer2ManagerLogic_.address);

    const layer2Manager = Layer2ManagerLogic_.attach(layer2ManagerProxy.address) as Layer2Manager

    const OptimismSequencer_ = await ethers.getContractFactory('OptimismSequencer', {
        signer: deployer, libraries: { LibOptimism: libOptimism.address }
    })
    const OptimismSequencerLogic_ = (await OptimismSequencer_.connect(deployer).deploy()) as OptimismSequencer
    const OptimismSequencerProxy_ = await ethers.getContractFactory('OptimismSequencerProxy')
    const optimismSequencerProxy = (await OptimismSequencerProxy_.connect(deployer).deploy()) as OptimismSequencerProxy
    await optimismSequencerProxy.connect(deployer).upgradeTo(OptimismSequencerLogic_.address);
    const optimismSequencer = OptimismSequencerLogic_.attach(optimismSequencerProxy.address) as OptimismSequencer

    //
    const Candidate_ = await ethers.getContractFactory('Candidate' , {
        signer: deployer, libraries: { LibOperator: libOperator.address }
    })
    // const Candidate_ = await ethers.getContractFactory('Candidate')
    const CandidateLogic_ = (await Candidate_.connect(deployer).deploy()) as Candidate
    const CandidateProxy_ = await ethers.getContractFactory('CandidateProxy')
    const candidateProxy = (await CandidateProxy_.connect(deployer).deploy()) as CandidateProxy
    await candidateProxy.connect(deployer).upgradeTo(CandidateLogic_.address);
    const candidate = CandidateLogic_.attach(candidateProxy.address) as Candidate
    //
    const ton = (await ethers.getContractAt(TON_ABI.abi, tonAddress, deployer)) as TON

    //
    await ethers.provider.send("hardhat_setBalance", [
        DAOContract.address,
        "0x8ac7230489e80000",
      ]);
    await ton.connect(DAOContract).addMinter(seigManagerV2Proxy.address);
    //--------
    const Lib_AddressManager = await ethers.getContractFactory('Lib_AddressManager')
    const addressManager = (await Lib_AddressManager.connect(deployer).deploy()) as Lib_AddressManager

    await addressManager.connect(deployer).setAddress("OVM_Sequencer", sequencer1.address);
    //---
    const MockL1Messenger = await ethers.getContractFactory('MockL1Messenger')
    const l1Messenger = (await MockL1Messenger.connect(deployer).deploy()) as MockL1Messenger
    const MockL2Messenger = await ethers.getContractFactory('MockL2Messenger')
    const l2Messenger = (await MockL2Messenger.connect(deployer).deploy()) as MockL2Messenger
    const MockL1Bridge = await ethers.getContractFactory('MockL1Bridge')
    const l1Bridge = (await MockL1Bridge.connect(deployer).deploy()) as MockL1Bridge
    const MockL2Bridge = await ethers.getContractFactory('MockL1Bridge')
    const l2Bridge = (await MockL2Bridge.connect(deployer).deploy()) as MockL2Bridge

    await l1Bridge.connect(deployer).setAddress(l1Messenger.address, l2Bridge.address);

    await addressManager.connect(deployer).setAddress("OVM_L1CrossDomainMessenger", l1Messenger.address);
    await addressManager.connect(deployer).setAddress("Proxy__OVM_L1StandardBridge", l1Bridge.address);
    const TestERC20 = await ethers.getContractFactory('TestERC20')
    const l2ton = (await TestERC20.connect(deployer).deploy()) as TestERC20

    const daov2comLogic_ = await ethers.getContractFactory('DAOv2CommitteeV1');
    const daov2comLogic = (await daov2comLogic_.connect(deployer).deploy()) as DAOv2Committee

    const daov2comLogicV2_ = await ethers.getContractFactory('DAOv2CommitteeV2');
    const daov2comLogicV2 = (await daov2comLogicV2_.connect(deployer).deploy()) as DAOv2CommitteeV2

    // const daov2committeProxy_ = await ethers.getContractFactory('DAOv2CommitteeProxy');
    // const daov2committeProxy = (await daov2committeProxy_.connect(deployer).deploy()) as DAOv2CommitteeProxy
    // await daov2committeProxy.connect(deployer).upgradeTo(daov2comLogic.address);

    const daov2commitee = (await daov2comLogic_.connect(deployer).deploy()) as DAOv2Committee
    const daov2commiteeV2 = (await daov2comLogicV2_.connect(deployer).deploy()) as DAOv2CommitteeV2
    // const daov2commitee = daov2comLogic.attach(daov2committeProxy.address) as DAOv2Committee
    
    const daoagenda = (await ethers.getContractAt(DAOAgendaManger_ABI.abi, daoAgendaMangerAddress, deployer)) as DAOAgendaManager
    // const daovault_ = await ethers.getContractFactory('DAOAgendaManager');
    // const daoagenda = (await daoagenda_.connect(deployer).deploy()) as DAOAgendaManager
    
    const daovault = (await ethers.getContractAt(DAOVault_ABI.abi, daoVaultAddress, deployer)) as DAOVault
    // const daovault_ = await ethers.getContractFactory('DAOVault');
    // const daovault = (await daovault_.connect(deployer).deploy(tonAddress,wtonAddress)) as DAOVault

    const dao = daovault.address;

    return  {
        seigManagerV2Proxy: seigManagerV2Proxy,
        seigManagerV2: seigManagerV2,
        layer2ManagerProxy: layer2ManagerProxy,
        layer2Manager: layer2Manager,
        optimismSequencerProxy: optimismSequencerProxy,
        optimismSequencer: optimismSequencer,
        candidateProxy: candidateProxy,
        candidate: candidate,
        ton: ton,
        deployer: deployer,
        addr1: addr1,
        addr2: addr2,
        sequencer1: sequencer1,
        candidate1: candidate1,
        candidate2: candidate2,
        candidate3: candidate3,
        tonAdmin: tonAdmin,
        addressManager: addressManager,
        l1Messenger: l1Messenger,
        l2Messenger: l2Messenger,
        l1Bridge: l1Bridge,
        l2Bridge: l2Bridge,
        l2ton: l2ton,
        dao: dao,
        stosDistribute: stosDistribute,
        DAOContract: DAOContract,
        // daov2committeeProxy: daov2committeProxy,
        daov2committee: daov2commitee,
        daov2committeeV2: daov2commiteeV2,
        daoagendaManager: daoagenda,
        daovault: daovault,
        daoPrivateOwner: daoPrivateOwner
    }
}

export const getLayerKey = async function (info: Layer2Fixture): Promise<string> {
    const constructorArgumentsEncoded = ethers.utils.concat([
            ethers.utils.arrayify(info.addressManager),
            ethers.utils.arrayify(info.l1Bridge),
            ethers.utils.arrayify(info.l2Bridge),
            ethers.utils.arrayify(info.l2ton)
        ]
      )
   return ethers.utils.keccak256(constructorArgumentsEncoded) ;
}