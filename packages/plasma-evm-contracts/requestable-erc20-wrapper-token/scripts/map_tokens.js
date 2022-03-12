const RootChain = artifacts.require("RootChain.sol");

const tokenInRootChain = process.argv[4];
const tokenInChildChain = process.argv[5];

if (!tokenInChildChain || !tokenInRootChain) {
  console.error("[Usage] truffle exec scripts/map_toiens.js <token in root chain> <token in child chain>");
  process.exit(-1);
}


function loadContract () {
  return new Promise((resolve) => {
    RootChain.deployed().then(resolve);
  });
}


module.exports = async function() {
  const rootchain = await loadContract();
  console.log(JSON.stringify(await rootchain.mapRequestableContractByOperator(tokenInRootChain, tokenInChildChain)));
}