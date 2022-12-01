import { Contract } from "web3-eth-contract";
import BN from "bn.js";
const { toBN } = require("web3-utils");
import Web3Connector from "../common/web3-connector";
const AutoRefactorCoinageABI = require("./abi/AutoRefactorCoinage.json");
import SeigManager from "./seig-manager";

export default class Tot {
    private static _instance: Tot;
    private static _address: string;
    private _contract: Contract;

    private constructor(address: string) {
        Tot._address = address;
        const web3 = Web3Connector.instance().web3;
        this._contract = new web3.eth.Contract(AutoRefactorCoinageABI, address);
    }

    public static async instance(): Promise<Tot> {
        if (!Tot._instance) {
            const address = await SeigManager.instance().totAddress();
            Tot._instance = new Tot(address);
        }
        return Tot._instance;
    }

    public static get address(): string {
        return Tot._address;
    }

    public async totalSupply(): Promise<BN> {
        return toBN(await this._contract.methods.totalSupply().call());
    }

    public async balanceOf(account: string): Promise<BN> {
        return toBN(await this._contract.methods.balanceOf(account).call());
    }
}