import { Contract } from "web3-eth-contract";
import BN from "bn.js";
const { toBN } = require("web3-utils");
import Web3Connector from "../common/web3-connector";
const TONABI = require("./abi/TON.json");

export default class TON {
    private static _instance: TON;
    private static _address: string = "0x2be5e8c109e2197d077d13a82daead6a9b3433c5"; // default: mainnet
    private _contract: Contract;

    private constructor() {
        const web3 = Web3Connector.instance().web3;
        this._contract = new web3.eth.Contract(TONABI, TON._address);
    }

    public static instance(): TON {
        if (!TON._instance) {
            TON._instance = new TON();
        }
        return TON._instance;
    }

    public static setNetwork(net: string) {
        switch (net) {
            case "mainnet":
                TON._address = "0x2be5e8c109e2197d077d13a82daead6a9b3433c5";
                break;

            case "rinkeby":
                TON._address = "0x3734E35231abE68818996dC07Be6a8889202DEe9";
                break;
        }
    }

    public static get address(): string {
        return TON._address;
    }

    public async totalSupply(): Promise<BN> {
        return toBN(await this._contract.methods.totalSupply().call());
    }

    public async balanceOf(account: string): Promise<BN> {
        return toBN(await this._contract.methods.balanceOf(account).call());
    }
}