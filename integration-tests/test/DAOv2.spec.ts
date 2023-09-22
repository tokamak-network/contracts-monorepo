// import { hre, ethers } from 'hardhat';
// import { Contract, utils } from 'ethers'
// import { range } from 'lodash';

// import { createCurrency } from '@makerdao/currency';

// import { time } from '@openzeppelin/test-helpers';
// import { mine } from '@nomicfoundation/hardhat-network-helpers';

// import { Env, attach, marshalString, unmarshalString } from '@tokamak-network/tokamak-test-helpers';

// import chai = require('chai');
// import { solidity } from 'ethereum-waffle'

// chai.use(solidity)
// const { expect } = chai;
// chai.should();

// describe('DAOv2 Test', () => {
//     let deployed: any

//     let operator: SignerWithAddress;
//     let tokenOwner: SignerWithAddress;

//     before('setting', async () => {
//         [ operator, tokenOwner ] = await ethers.getSigners();

//         deployed = await Env.new(operator);

//         await deployed.deployLayer2(operator)
//         deployed.layer2 = deployed.env.layer2s[0]

//         console.log("-----------------------------------------")
//         console.log("-----------------------------------------")
//         console.log("-----------------------------------------")
//         console.log("------------------INPUT------------------")
//         console.log("-----------------------------------------")
//         console.log("-----------------------------------------")
//         console.log("-----------------------------------------")
//     })
// })