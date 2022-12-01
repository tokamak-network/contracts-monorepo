import { Contract } from "web3-eth-contract";
import BN from "bn.js";
const { toBN } = require("web3-utils");
import Web3Connector from "../common/web3-connector";
const SeigManagerABI = require("./abi/SeigManager.json");

export default class SeigManager {
    private static _instance: SeigManager;
    private static _address: string = "0x710936500aC59e8551331871Cbad3D33d5e0D909"; // default: mainnet
    private _contract: Contract;
    private _totAddress: string;

    private constructor() {
        const web3 = Web3Connector.instance().web3;
        this._contract = new web3.eth.Contract(SeigManagerABI, SeigManager._address);
    }

    public static instance(): SeigManager {
        if (!SeigManager._instance) {
            SeigManager._instance = new SeigManager();
        }
        return SeigManager._instance;
    }

    public static setNetwork(net: string) {
        switch (net) {
            case "mainnet":
                SeigManager._address = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
                break;

            case "rinkeby":
                SeigManager._address = "0xdb6046F3b59395A126a324E63aC93f4c38119055";
                break;
        }
    }

    public static get address(): string {
        return SeigManager._address;
    }

    public async stakeOf(layer2: string, account: string, blockNumber?: BN): Promise<BN> {
        return toBN(await this._contract.methods.stakeOf(layer2, account).call(null, blockNumber == null ? "latest" : blockNumber));
    }

    public async totAddress(): Promise<string> {
        if (!this._totAddress) {
            this._totAddress = await this._contract.methods.tot().call();
        }
        return this._totAddress;
    }
}