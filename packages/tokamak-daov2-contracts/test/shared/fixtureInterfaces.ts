
import { ethers } from 'hardhat'
// import { BigNumber } from 'ethers'
import {  Wallet, Signer } from 'ethers'

// import { DAOv2CommitteeProxy } from '../../typechain-types/contracts/dao/DAOv2CommitteeProxy' 
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

interface Layer2Fixture  {
    addressManager: string,
    l1Messenger: string,
    l2Messenger: string,
    l1Bridge: string,
    l2Bridge: string,
    l2ton: string
}

interface DAOStakingV2Fixture  {
    seigManagerV2Proxy: SeigManagerV2Proxy
    seigManagerV2: SeigManagerV2
    layer2ManagerProxy: Layer2ManagerProxy
    layer2Manager: Layer2Manager
    optimismSequencerProxy: OptimismSequencerProxy
    optimismSequencer: OptimismSequencer
    candidateProxy: CandidateProxy
    candidate: Candidate
    ton: TON,
    deployer: Signer,
    addr1: Signer,
    addr2: Signer,
    sequencer1: Signer,
    candidate1: Signer,
    candidate2: Signer,
    candidate3: Signer,
    tonAdmin: Signer,
    addressManager: Lib_AddressManager,
    l1Messenger: MockL1Messenger,
    l2Messenger: MockL2Messenger,
    l1Bridge: MockL1Bridge,
    l2Bridge: MockL2Bridge,
    l2ton: TestERC20,
    dao: string,
    stosDistribute: Signer,
    DAOContract: Signer,
    // daov2committeeProxy: DAOv2CommitteeProxy,
    daov2committee: DAOv2Committee,
    daov2committeeV2: DAOv2CommitteeV2,
    daoagendaManager: DAOAgendaManager,
    daovault: DAOVault,
    daoPrivateOwner: Signer
}

// interface DAOV2Fixture {
//     daov2committeeProxy: DAOv2CommitteeProxy,
//     daov2committee: DAOv2Committee,
//     daoagendaManager: DAOAgendaManager,
//     daovault: DAOVault
// }

export { Layer2Fixture, DAOStakingV2Fixture }