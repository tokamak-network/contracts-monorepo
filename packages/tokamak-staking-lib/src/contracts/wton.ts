import { Contract } from "web3-eth-contract";
import BN from "bn.js";
const { toBN } = require("web3-utils");
import Web3Connector from "../common/web3-connector";
const WTONABI = require("./abi/WTON.json");

export default class WTON {
    private static _instance: WTON;
    private static _address: string = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2"; // default: mainnet
    private _contract: Contract;

    private constructor() {
        const web3 = Web3Connector.instance().web3;
        this._contract = new web3.eth.Contract(WTONABI, WTON._address);
    }

    public static instance(): WTON {
        if (!WTON._instance) {
            WTON._instance = new WTON();
        }
        return WTON._instance;
    }

    public static setNetwork(net: string) {
        switch (net) {
            case "mainnet":
                WTON._address = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
                break;

            case "rinkeby":
                WTON._address = "0x9985d94ee25a1eB0459696667f071ECE121ACce6";
                break;
        }
    }

    public static get address(): string {
        return WTON._address;
    }

    public async totalSupply(): Promise<BN> {
        return toBN(await this._contract.methods.totalSupply().call());
    }

    public async balanceOf(account: string): Promise<BN> {
        return toBN(await this._contract.methods.balanceOf(account).call());
    }
}