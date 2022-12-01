const { setNetwork, getStakedAmount, getStakedAmountDiff, getTotalStakedAmount, getTotalStakedAmountDiff } = require("tokamak-staking-lib");
const { BN } = require("bn.js");

setNetwork("https://api.infura.io/v1/jsonrpc/mainnet", "mainnet");

const layer2 = "0x39A13a796A3Cd9f480C28259230D2EF0a7026033";
const account = "0xEA8e2eC08dCf4971bdcdfFFe21439995378B44F3"; // tokamak1 operator
const blockNumber = new BN(11072614);
const fromBlockNumber = new BN(11072614);
const toBlockNumber = fromBlockNumber.add(new BN(1));

async function main() {
    console.log(`Staked Amount of Account (${account}) on Layer2 (${layer2})`);

    // 1. It gets the staked amount of the latest block.
    const amount1 = await getStakedAmount(layer2, account);
    console.log(`- amount1: ${amount1}`);

    // 2. It gets the staked amount of the specified block.
    const amount2 = await getStakedAmount(layer2, account, blockNumber);
    console.log(`- amount2: ${amount2}`);

    // 3. It gets the staked amount difference of the specified block period.
    const amount3 = await getStakedAmountDiff(layer2, account, fromBlockNumber, toBlockNumber);
    console.log(`- amount3: ${amount3}`);

    // 4. It gets the staked amount difference of the specified block period (until the latest block).
    const amount4 = await getStakedAmountDiff(layer2, account, fromBlockNumber);
    console.log(`- amount4: ${amount4}`);

    console.log(`\nTotal Staked Amount of Account (${account}) on All Layer2s`);

    // 5. It gets the total staked amount of the latest block.
    const amount5 = await getTotalStakedAmount(account);
    console.log(`- amount5: ${amount5}`);

    // 6. It gets the total staked amount of the specified block.
    const amount6 = await getTotalStakedAmount(account, blockNumber);
    console.log(`- amount6: ${amount6}`);

    // 7. It gets the total staked amount difference of the specified block period.
    const amount7 = await getTotalStakedAmountDiff(account, fromBlockNumber, toBlockNumber);
    console.log(`- amount7: ${amount7}`);

    // 8. It gets the total staked amount difference of the specified block period (until the latest block).
    const amount8 = await getTotalStakedAmountDiff(account, fromBlockNumber);
    console.log(`- amount8: ${amount8}`);
}

main();