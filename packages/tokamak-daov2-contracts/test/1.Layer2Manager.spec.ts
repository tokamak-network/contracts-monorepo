import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
import {daostakingV2Fixtures} from './shared/fixtures'
import { DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

describe('Layer2Manager', () => {
    let deployer: Signer, addr1: Signer, sequencer1:Signer

    let deployed: DAOStakingV2Fixture

    // mainnet
    let seigManagerInfo = {
        ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
        wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
        tot: "0x6FC20Ca22E67aAb397Adb977F092245525f7AeEf",
        seigManagerV1: "0x710936500aC59e8551331871Cbad3D33d5e0D909",
        layer2Manager: "",
        seigPerBlock: ethers.BigNumber.from("3920000000000000000"),
        minimumBlocksForUpdateSeig: 300,
    }

    let layer2ManagerInfo = {
        minimumDepositForSequencer: ethers.utils.parseEther("100"),
        minimumDepositForCandidate: ethers.utils.parseEther("200"),
        delayBlocksForWithdraw: 300,
        ratioSecurityDepositOfTvl: 2000
    }

    before('create fixture loader', async () => {
        // deployed = await loadFixture(stakingV2Fixtures)

        deployed = await daostakingV2Fixtures()
        deployer = deployed.deployer;
        addr1 = deployed.addr1;
        sequencer1 = deployed.sequencer1;
    })

    describe('# initialize', () => {

        it('initialize can not be executed by not owner', async () => {
            await expect(
                deployed.layer2ManagerProxy.connect(addr1).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.optimismSequencerProxy.address,
                    deployed.candidateProxy.address,
                    layer2ManagerInfo.minimumDepositForSequencer,
                    layer2ManagerInfo.minimumDepositForCandidate,
                    layer2ManagerInfo.delayBlocksForWithdraw
                )
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('initialize can be executed by only owner', async () => {
            await snapshotGasCost(deployed.layer2ManagerProxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.optimismSequencerProxy.address,
                    deployed.candidateProxy.address,
                    layer2ManagerInfo.minimumDepositForSequencer,
                    layer2ManagerInfo.minimumDepositForCandidate,
                    layer2ManagerInfo.delayBlocksForWithdraw
                ))

            expect(await deployed.layer2ManagerProxy.ton()).to.eq(seigManagerInfo.ton)
            expect(await deployed.layer2ManagerProxy.seigManagerV2()).to.eq(deployed.seigManagerV2Proxy.address)
            expect(await deployed.layer2ManagerProxy.optimismSequencer()).to.eq(deployed.optimismSequencerProxy.address)
            expect(await deployed.layer2ManagerProxy.candidate()).to.eq(deployed.candidateProxy.address)

            expect(await deployed.layer2ManagerProxy.minimumDepositForSequencer()).to.eq(layer2ManagerInfo.minimumDepositForSequencer)
            expect(await deployed.layer2ManagerProxy.minimumDepositForCandidate()).to.eq(layer2ManagerInfo.minimumDepositForCandidate)

            expect(await deployed.layer2ManagerProxy.delayBlocksForWithdraw()).to.eq(layer2ManagerInfo.delayBlocksForWithdraw)
        })

        it('can execute only once.', async () => {
            await expect(
                deployed.layer2ManagerProxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    deployed.seigManagerV2Proxy.address,
                    deployed.optimismSequencerProxy.address,
                    deployed.candidateProxy.address,
                    layer2ManagerInfo.minimumDepositForSequencer,
                    layer2ManagerInfo.minimumDepositForCandidate,
                    layer2ManagerInfo.delayBlocksForWithdraw
                )
                ).to.be.revertedWith("already initialize")
        })
    });

    describe('# setMaxLayer2Count', () => {

        it('setMaxLayer2Count can not be executed by not owner', async () => {
            const maxLayer2Count = ethers.BigNumber.from("2");
            await expect(
                deployed.layer2Manager.connect(addr1).setMaxLayer2Count(maxLayer2Count)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setMaxLayer2Count can be executed by only owner ', async () => {
            const maxLayer2Count = ethers.BigNumber.from("3");
            await snapshotGasCost(deployed.layer2Manager.connect(deployer).setMaxLayer2Count(maxLayer2Count))
            expect(await deployed.layer2Manager.maxLayer2Count()).to.eq(maxLayer2Count)
        })

        it('cannot be changed to the same value', async () => {
            const maxLayer2Count =ethers.BigNumber.from("3");
            await expect(
                deployed.layer2Manager.connect(deployer).setMaxLayer2Count(maxLayer2Count)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setMinimumDepositForSequencer', () => {

        it('setMinimumDepositForSequencer can not be executed by not owner', async () => {
            const minimumDepositForSequencer = ethers.utils.parseEther("200");
            await expect(
                deployed.layer2Manager.connect(addr1).setMinimumDepositForSequencer(minimumDepositForSequencer)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setMinimumDepositForSequencer can be executed by only owner ', async () => {
            const minimumDepositForSequencer = ethers.utils.parseEther("200");
            await snapshotGasCost(deployed.layer2Manager.connect(deployer).setMinimumDepositForSequencer(minimumDepositForSequencer))
            expect(await deployed.layer2Manager.minimumDepositForSequencer()).to.eq(minimumDepositForSequencer)

            await deployed.layer2Manager.connect(deployer).setMinimumDepositForSequencer(layer2ManagerInfo.minimumDepositForSequencer)
            expect(await deployed.layer2Manager.minimumDepositForSequencer()).to.eq(layer2ManagerInfo.minimumDepositForSequencer)
        })

        it('cannot be changed to the same value', async () => {
            await expect(
                deployed.layer2Manager.connect(deployer).setMinimumDepositForSequencer(layer2ManagerInfo.minimumDepositForSequencer)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setRatioSecurityDepositOfTvl', () => {

        it('setRatioSecurityDepositOfTvl can not be executed by not owner', async () => {
            const ratioSecurityDepositOfTvl = 1000;
            await expect(
                deployed.layer2Manager.connect(addr1).setRatioSecurityDepositOfTvl(ratioSecurityDepositOfTvl)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setRatioSecurityDepositOfTvl can be executed by only owner ', async () => {
            const ratioSecurityDepositOfTvl = 1000;
            await snapshotGasCost(deployed.layer2Manager.connect(deployer).setRatioSecurityDepositOfTvl(ratioSecurityDepositOfTvl))
            expect(await deployed.layer2Manager.ratioSecurityDepositOfTvl()).to.eq(ratioSecurityDepositOfTvl)

            await deployed.layer2Manager.connect(deployer).setRatioSecurityDepositOfTvl(layer2ManagerInfo.ratioSecurityDepositOfTvl)
            expect(await deployed.layer2Manager.ratioSecurityDepositOfTvl()).to.eq(layer2ManagerInfo.ratioSecurityDepositOfTvl)
        })

        it('cannot be changed to the same value', async () => {
            await expect(
                deployed.layer2Manager.connect(deployer).setRatioSecurityDepositOfTvl(layer2ManagerInfo.ratioSecurityDepositOfTvl)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setMinimumDepositForCandidate', () => {

        it('setMinimumDepositForSequencer can not be executed by not owner', async () => {
            const minimumDepositForCandidate = ethers.utils.parseEther("100");
            await expect(
                deployed.layer2Manager.connect(addr1).setMinimumDepositForCandidate(minimumDepositForCandidate)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setMinimumDepositForSequencer can be executed by only owner ', async () => {
            const minimumDepositForCandidate = ethers.utils.parseEther("100");
            await snapshotGasCost(deployed.layer2Manager.connect(deployer).setMinimumDepositForCandidate(minimumDepositForCandidate))
            expect(await deployed.layer2Manager.minimumDepositForCandidate()).to.eq(minimumDepositForCandidate)

            await deployed.layer2Manager.connect(deployer).setMinimumDepositForCandidate(layer2ManagerInfo.minimumDepositForCandidate)
            expect(await deployed.layer2Manager.minimumDepositForCandidate()).to.eq(layer2ManagerInfo.minimumDepositForCandidate)
        })

        it('cannot be changed to the same value', async () => {
            await expect(
                deployed.layer2Manager.connect(deployer).setMinimumDepositForCandidate(layer2ManagerInfo.minimumDepositForCandidate)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setDelayBlocksForWithdraw', () => {

        it('setDelayBlocksForWithdraw can not be executed by not owner', async () => {
            const delayBlocksForWithdraw = ethers.BigNumber.from("100");
            await expect(
                deployed.layer2Manager.connect(addr1).setDelayBlocksForWithdraw(delayBlocksForWithdraw)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setDelayBlocksForWithdraw can be executed by only owner ', async () => {
            const delayBlocksForWithdraw = ethers.BigNumber.from("100");
            await snapshotGasCost(deployed.layer2Manager.connect(deployer).setDelayBlocksForWithdraw(delayBlocksForWithdraw))
            expect(await deployed.layer2Manager.delayBlocksForWithdraw()).to.eq(delayBlocksForWithdraw)


            await deployed.layer2Manager.connect(deployer).setDelayBlocksForWithdraw(layer2ManagerInfo.delayBlocksForWithdraw)
            expect(await deployed.layer2Manager.delayBlocksForWithdraw()).to.eq(layer2ManagerInfo.delayBlocksForWithdraw)
        })

        it('cannot be changed to the same value', async () => {
            await expect(
                deployed.layer2Manager.connect(deployer).setDelayBlocksForWithdraw(layer2ManagerInfo.delayBlocksForWithdraw)
                ).to.be.revertedWith("same")
        })
    });

});

