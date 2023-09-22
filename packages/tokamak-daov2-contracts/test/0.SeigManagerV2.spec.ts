import { expect } from './shared/expect'
import { ethers, network } from 'hardhat'

import { Signer } from 'ethers'
import {daostakingV2Fixtures} from './shared/fixtures'
import {DAOStakingV2Fixture } from './shared/fixtureInterfaces'
import snapshotGasCost from './shared/snapshotGasCost'

describe('SeigManagerV2', () => {
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
        ratesTonStakers: 4000,
        ratesDao: 5000,
        ratesStosHolders: 1000,
        ratesUnits: 10000
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
                deployed.seigManagerV2Proxy.connect(addr1).initialize(
                    seigManagerInfo.ton,
                    seigManagerInfo.wton,
                    seigManagerInfo.tot,
                    [
                        seigManagerInfo.seigManagerV1,
                        deployed.layer2ManagerProxy.address,
                        deployed.optimismSequencerProxy.address,
                        deployed.candidateProxy.address
                    ],
                    seigManagerInfo.seigPerBlock,
                    seigManagerInfo.minimumBlocksForUpdateSeig,
                    [
                        seigManagerInfo.ratesTonStakers,
                        seigManagerInfo.ratesDao,
                        seigManagerInfo.ratesStosHolders,
                        seigManagerInfo.ratesUnits,
                    ]
                )
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('initialize can be executed by only owner', async () => {
            await snapshotGasCost(
                deployed.seigManagerV2Proxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    seigManagerInfo.wton,
                    seigManagerInfo.tot,
                    [
                        seigManagerInfo.seigManagerV1,
                        deployed.layer2ManagerProxy.address,
                        deployed.optimismSequencerProxy.address,
                        deployed.candidateProxy.address
                    ],
                    seigManagerInfo.seigPerBlock,
                    seigManagerInfo.minimumBlocksForUpdateSeig,
                    [
                        seigManagerInfo.ratesTonStakers,
                        seigManagerInfo.ratesDao,
                        seigManagerInfo.ratesStosHolders,
                        seigManagerInfo.ratesUnits,
                    ]
                    )
            );

            expect(await deployed.seigManagerV2Proxy.ton()).to.eq(seigManagerInfo.ton)
            expect(await deployed.seigManagerV2Proxy.wton()).to.eq(seigManagerInfo.wton)
            expect(await deployed.seigManagerV2Proxy.tot()).to.eq(seigManagerInfo.tot)
            expect(await deployed.seigManagerV2Proxy.seigManagerV1()).to.eq(seigManagerInfo.seigManagerV1)
            expect(await deployed.seigManagerV2Proxy.layer2Manager()).to.eq(deployed.layer2ManagerProxy.address)
            expect(await deployed.seigManagerV2Proxy.optimismSequencer()).to.eq(deployed.optimismSequencerProxy.address)
            expect(await deployed.seigManagerV2Proxy.candidate()).to.eq(deployed.candidateProxy.address)

            expect(await deployed.seigManagerV2Proxy.seigPerBlock()).to.eq(seigManagerInfo.seigPerBlock)
            expect(await deployed.seigManagerV2Proxy.minimumBlocksForUpdateSeig()).to.eq(seigManagerInfo.minimumBlocksForUpdateSeig)

        })

        it('can execute only once.', async () => {
            await expect(
                deployed.seigManagerV2Proxy.connect(deployer).initialize(
                    seigManagerInfo.ton,
                    seigManagerInfo.wton,
                    seigManagerInfo.tot,
                    [
                        seigManagerInfo.seigManagerV1,
                        deployed.layer2ManagerProxy.address,
                        deployed.optimismSequencerProxy.address,
                        deployed.candidateProxy.address
                    ],
                    seigManagerInfo.seigPerBlock,
                    seigManagerInfo.minimumBlocksForUpdateSeig,
                    [
                        seigManagerInfo.ratesTonStakers,
                        seigManagerInfo.ratesDao,
                        seigManagerInfo.ratesStosHolders,
                        seigManagerInfo.ratesUnits,
                    ]
                )
                ).to.be.revertedWith("already initialize")
        })
    });

    describe('# setSeigPerBlock', () => {

        it('setSeigPerBlock can not be executed by not owner', async () => {
            const seigPerBlock = ethers.BigNumber.from("3920000000000000000");
            await expect(
                deployed.seigManagerV2.connect(addr1).setSeigPerBlock(seigPerBlock)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setSeigPerBlock can be executed by only owner ', async () => {
            const seigPerBlock = ethers.BigNumber.from("3920000000000000001");

            await snapshotGasCost(
                deployed.seigManagerV2.connect(deployer).setSeigPerBlock(seigPerBlock)
            );
            expect(await deployed.seigManagerV2.seigPerBlock()).to.eq(seigPerBlock)

            await deployed.seigManagerV2.connect(deployer).setSeigPerBlock(seigManagerInfo.seigPerBlock)
            expect(await deployed.seigManagerV2.seigPerBlock()).to.eq(seigManagerInfo.seigPerBlock)
        })

        it('cannot be changed to the same value', async () => {
            const seigPerBlock = ethers.BigNumber.from("3920000000000000000");
            await expect(
                deployed.seigManagerV2.connect(deployer).setSeigPerBlock(seigPerBlock)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setMinimumBlocksForUpdateSeig', () => {

        it('setMinimumBlocksForUpdateSeig can not be executed by not owner', async () => {
            const minimumBlocksForUpdateSeig = 100;
            await expect(
                deployed.seigManagerV2.connect(addr1).setMinimumBlocksForUpdateSeig(minimumBlocksForUpdateSeig)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setMinimumBlocksForUpdateSeig can be executed by only owner ', async () => {
            const minimumBlocksForUpdateSeig = 100;
            await snapshotGasCost(
                    deployed.seigManagerV2.connect(deployer).setMinimumBlocksForUpdateSeig(minimumBlocksForUpdateSeig)
            )
            expect(await deployed.seigManagerV2.minimumBlocksForUpdateSeig()).to.eq(minimumBlocksForUpdateSeig)
        })

        it('cannot be changed to the same value', async () => {
            const minimumBlocksForUpdateSeig = 100;
            await expect(
                deployed.seigManagerV2.connect(deployer).setMinimumBlocksForUpdateSeig(minimumBlocksForUpdateSeig)
                ).to.be.revertedWith("same")
        })
    });

    describe('# setLastSeigBlock', () => {

        it('LastSeigBlock can not be executed by not owner', async () => {
            const block = await ethers.provider.getBlock('latest')
            await expect(
                deployed.seigManagerV2.connect(addr1).setLastSeigBlock(block.number)
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('LastSeigBlock can be executed by only owner ', async () => {
            const block = await ethers.provider.getBlock('latest')
            await deployed.seigManagerV2.connect(deployer).setLastSeigBlock(block.number)
            expect(await deployed.seigManagerV2.lastSeigBlock()).to.eq(block.number)

            await expect(
                deployed.seigManagerV2.connect(deployer).setLastSeigBlock(block.number)
                ).to.be.revertedWith("same")
        })

    });

    describe('# setDividendRates', () => {

        it('setDividendRates can not be executed by not owner', async () => {

            let rates = {
                ratesDao: 5000,           // 0.5 , 0.002 %
                ratesStosHolders: 2000,  // 0.2
                ratesTonStakers: 3000,   // 0.3
                ratesUnits: 10000
            }
            await expect(
                deployed.seigManagerV2.connect(addr1).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setDividendRates can be executed by only owner ', async () => {
            let rates = {
                ratesDao: 5000,           // 0.5 , 0.002 %
                ratesStosHolders: 2000,  // 0.2
                ratesTonStakers: 3000,   // 0.3
                ratesUnits: 10000
            }

            await snapshotGasCost(
                deployed.seigManagerV2.connect(deployer).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
            )
            expect(await deployed.seigManagerV2.ratesDao()).to.eq(rates.ratesDao)
            expect(await deployed.seigManagerV2.ratesStosHolders()).to.eq(rates.ratesStosHolders)
            expect(await deployed.seigManagerV2.ratesTonStakers()).to.eq(rates.ratesTonStakers)
            expect(await deployed.seigManagerV2.ratesUnits()).to.eq(rates.ratesUnits)
        })

        it('Values that are all the same as the existing set values are not processed.', async () => {
            let rates = {
                ratesDao: 5000,           // 0.5 , 0.002 %
                ratesStosHolders: 2000,  // 0.2
                ratesTonStakers: 3000,   // 0.3
                ratesUnits: 10000
            }

            await expect(
                deployed.seigManagerV2.connect(deployer).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
                ).to.be.revertedWith("same")
        })

        it('The sum of the ratios must equal ratioUnit.', async () => {
            let rates = {
                ratesDao: 1000,
                ratesStosHolders: 2000,
                ratesTonStakers: 3000,
                ratesUnits: 10000
            }

            await expect(
                deployed.seigManagerV2.connect(deployer).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
                ).to.be.revertedWith("sum of ratio is wrong")
        })

        it('ratioUnit cannot be zero.', async () => {
            let rates = {
                ratesDao: 1000,
                ratesStosHolders: 2000,
                ratesTonStakers: 3000,
                ratesUnits: 0
            }

            await expect(
                deployed.seigManagerV2.connect(deployer).setDividendRates(
                    rates.ratesDao,
                    rates.ratesStosHolders,
                    rates.ratesTonStakers,
                    rates.ratesUnits
                )
                ).to.be.revertedWith("wrong ratesUnits")
        })
    });

    describe('# setAddress', () => {
        it('setAddress can not be executed by not owner', async () => {
            await expect(
                deployed.seigManagerV2.connect(addr1).setAddress(
                    deployed.daovault.address,
                    deployed.stosDistribute.address
                )
                ).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it('setAddress can be executed by only owner ', async () => {

            await snapshotGasCost(
                deployed.seigManagerV2.connect(deployer).setAddress(
                    deployed.daovault.address,
                    deployed.stosDistribute.address
                )
            )
            console.log(await deployed.seigManagerV2.dao());
            console.log(deployed.daov2committeeProxy.address);
            expect(await deployed.seigManagerV2.dao()).to.eq(deployed.daovault.address)
            expect(await deployed.seigManagerV2.stosDistribute()).to.eq(deployed.stosDistribute.address)

        })

        it('Addresses that are all the same as the existing set address are not processed.', async () => {
            await expect(
                deployed.seigManagerV2.connect(deployer).setAddress(
                    deployed.daov2committeeProxy.address,
                    deployed.stosDistribute.address
                )
                ).to.be.revertedWith("same")

            await deployed.seigManagerV2.connect(deployer).setAddress(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero
            )
            expect(await deployed.seigManagerV2.dao()).to.eq(ethers.constants.AddressZero)
            expect(await deployed.seigManagerV2.stosDistribute()).to.eq(ethers.constants.AddressZero)

        })
    });

    describe('# snapshot', () => {

        it('getCurrentSnapshotId', async () => {
            let snapshotId = await deployed.seigManagerV2.getCurrentSnapshotId();
            const indexLton = await deployed.seigManagerV2.indexLton();

            expect(await deployed.seigManagerV2.indexLtonAt(snapshotId)).to.eq(indexLton);
        });

        it('snapshot', async () => {

            const indexLton1 = await deployed.seigManagerV2.indexLton();
            const currentSnapshotId1 = await deployed.seigManagerV2.getCurrentSnapshotId();

            await(await deployed.seigManagerV2.snapshot()).wait();

            const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
            let i
            for (i = 0; i < minimumBlocksForUpdateSeig; i++){
                await ethers.provider.send('evm_mine');
            }

            await(await deployed.seigManagerV2.connect(addr1).runUpdateSeigniorage()).wait();
            // console.log('runUpdateSeigniorage');

            const indexLton2 = await deployed.seigManagerV2.indexLton();
            // console.log('indexLton2', indexLton2);

            const currentSnapshotId2 = await deployed.seigManagerV2.getCurrentSnapshotId();
            // console.log('currentSnapshotId2', currentSnapshotId2);

            const indexLtonAt = await deployed.seigManagerV2.indexLtonAt(currentSnapshotId1);
            // console.log('indexLtonAt', currentSnapshotId1, ethers.utils.formatEther(indexLtonAt));


        });

    })

    /*
    describe('# updateSeigniorage', () => {
        it('After the recent seignorage issuance, seignorage will not be issued unless the minimum block has passed.', async () => {
            const lastSeigBlock = await deployed.seigManagerV2.lastSeigBlock()
            const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
            const block = await ethers.provider.getBlock('latest')

            await snapshotGasCost(
                deployed.seigManagerV2.connect(addr1).updateSeigniorage()
            )

            if (block.number - lastSeigBlock.toNumber() < minimumBlocksForUpdateSeig ) {
                expect(await deployed.seigManagerV2.lastSeigBlock()).to.eq(lastSeigBlock)
            } else {
                expect(await deployed.seigManagerV2.lastSeigBlock()).to.gt(lastSeigBlock)
            }
        })

        it("      pass blocks", async function () {
            const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
            let i
            for (i = 0; i < minimumBlocksForUpdateSeig; i++){
                await ethers.provider.send('evm_mine');
            }
        });

        it('If the sum of the staking amount and the bonding liquidity amount is 0, indexLton does not change.', async () => {
            expect(await deployed.seigManagerV2.getTotalLton()).to.eq(ethers.constants.Zero)
            const indexLton = await deployed.seigManagerV2.indexLton();
            await snapshotGasCost(deployed.seigManagerV2.connect(addr1).updateSeigniorage())
            expect(await deployed.seigManagerV2.indexLton()).to.eq(indexLton)
        });

        it("      pass blocks", async function () {
            const minimumBlocksForUpdateSeig = await deployed.seigManagerV2.minimumBlocksForUpdateSeig()
            let i
            for (i = 0; i < minimumBlocksForUpdateSeig; i++){
                await ethers.provider.send('evm_mine');
            }
        });

        it('If the TVL and deposit of L2 are 0, totalSeigs for sequencer is not increased.', async () => {
            expect(await deployed.layer2Manager.curTotalLayer2Deposits()).to.eq(ethers.constants.Zero)
            expect(await deployed.layer2Manager.totalSecurityDeposit()).to.eq(ethers.constants.Zero)
            const totalSeigs = await deployed.layer2Manager.totalSeigs();
            await snapshotGasCost(deployed.seigManagerV2.connect(addr1).updateSeigniorage())
            expect(await deployed.layer2Manager.totalSeigs()).to.eq(totalSeigs)
        });

    });
    */


});

