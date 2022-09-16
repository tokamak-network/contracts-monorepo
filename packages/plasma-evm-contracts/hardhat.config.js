require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

module.exports = {
  solidity: "0.5.12",
};
