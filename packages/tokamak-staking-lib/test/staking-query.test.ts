import * as tokamak from "../src";
// This relative path is used to specify 'bn.js', not '@types/bn.js', because '@types/bn.js' is not injected to 'chai'.
import { BN } from "../node_modules/bn.js";
const chai = require("chai");
chai.use(require("chai-bn")(BN)).should();

// tokamak.setNetwork("https://rinkeby.infura.io/v3/2d92b8fedd374147b0ec8a9fa04b2839", "rinkeby");
tokamak.setNetwork("https://api.infura.io/v1/jsonrpc/rinkeby", "rinkeby");

describe("Layer2Registry functions", () => {
    it("should get number of layer2", async () => {
        const expected: number = 1;
        const actual: number = await tokamak.getNumLayer2();
        actual.should.equal(expected);
    });

    const layer2: string = "0xA10ae25583cA45d38b392aDe535a53B73dA142E7";
    it("should get layer2 address by index", async () => {
        const actual: string = await tokamak.getLayer2ByIndex(0);
        actual.should.equal(layer2);
    });

    it("should be layer2 address", async () => {
        const expected: boolean = true;
        const actual: boolean = await tokamak.isLayer2(layer2);
        actual.should.equal(expected);
    });
});

describe("Layer2 functions", () => {
    const layer2: string = "0xA10ae25583cA45d38b392aDe535a53B73dA142E7";
    it("should get operator and be submitter", async () => {
        const operator: string = await tokamak.getOperator(layer2);
        const expected: boolean = true;
        const actual: boolean = await tokamak.isSubmitter(layer2, operator);
        actual.should.equal(expected);
    });
});

describe("getStakedAmount functions", () => {
    const layer2: string = "0xA10ae25583cA45d38b392aDe535a53B73dA142E7";
    const account: string = "0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39"; // operator
    it("should get staked amount of latest block", async () => {
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getStakedAmount(layer2, account);
        actual.should.be.bignumber.gt(expected);
    });

    it("should get staked amount of specified block", async () => {
        const blockNumber: BN = new BN("7475257");
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getStakedAmount(layer2, account, blockNumber);
        actual.should.be.bignumber.gt(expected);
    });

    const fromBlockNumber: BN = new BN("7475257");
    it("should get staked amount difference during specified block period 1", async () => {
        const toBlockNumber: BN = fromBlockNumber.add(new BN("1"));
        const fromAmount: BN = await tokamak.getStakedAmount(layer2, account, fromBlockNumber);
        const toAmount: BN = await tokamak.getStakedAmount(layer2, account, toBlockNumber);
        const expected: BN = toAmount.sub(fromAmount);
        const actual: BN = await tokamak.getStakedAmountDiff(layer2, account, fromBlockNumber, toBlockNumber);
        actual.should.be.bignumber.equal(expected);
    });

    it("should get staked amount difference during specified block period 2", async () => {
        const fromAmount: BN = await tokamak.getStakedAmount(layer2, account, fromBlockNumber);
        const latestAmount: BN = await tokamak.getStakedAmount(layer2, account);
        const expected: BN = latestAmount.sub(fromAmount);
        const actual: BN = await tokamak.getStakedAmountDiff(layer2, account, fromBlockNumber);
        actual.should.be.bignumber.equal(expected);
    });
});

describe("getTotalStakedAmount functions", () => {
    const account: string = "0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39"; // operator
    it("should get total staked amount of latest block", async () => {
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getTotalStakedAmount(account);
        actual.should.be.bignumber.gt(expected);
    });

    it("should get total staked amount of specified block", async () => {
        const blockNumber: BN = new BN("7475257");
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getTotalStakedAmount(account, blockNumber);
        actual.should.be.bignumber.gt(expected);
    });

    const fromBlockNumber: BN = new BN("7475257");
    it("should get total staked amount difference during specified block period 1", async () => {
        const toBlockNumber: BN = fromBlockNumber.add(new BN("1"));
        const fromAmount: BN = await tokamak.getTotalStakedAmount(account, fromBlockNumber);
        const toAmount: BN = await tokamak.getTotalStakedAmount(account, toBlockNumber);
        const expected: BN = toAmount.sub(fromAmount);
        const actual: BN = await tokamak.getTotalStakedAmountDiff(account, fromBlockNumber, toBlockNumber);
        actual.should.be.bignumber.equal(expected);
    }).timeout(10000);

    it("should get total staked amount difference during specified block period 2", async () => {
        const fromAmount: BN = await tokamak.getTotalStakedAmount(account, fromBlockNumber);
        const latestAmount: BN = await tokamak.getTotalStakedAmount(account);
        const expected: BN = latestAmount.sub(fromAmount);
        const actual: BN = await tokamak.getTotalStakedAmountDiff(account, fromBlockNumber);
        actual.should.be.bignumber.equal(expected);
    }).timeout(10000);
});

describe("getTotalSupplyOfTON function", () => {
    it("should get total supply of ton", async () => {
        const expected: BN = new BN("50000000000000000000000000");
        const actual: BN = await tokamak.getTotalSupplyOfTON();
        actual.should.be.bignumber.equal(expected);
    });
});

describe("getTotalSupplyOfTONWithSeig function", () => {
    it("should get total supply of ton with seig", async () => {
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getTotalSupplyOfTONWithSeig();
        actual.should.be.bignumber.gt(expected);
    });
});

describe("getTotalSupplyOfWTON function", () => {
    it("should get total supply of wton", async () => {
        const expected: BN = new BN("0");
        const actual: BN = await tokamak.getTotalSupplyOfWTON();
        actual.should.be.bignumber.gt(expected);
    });
});