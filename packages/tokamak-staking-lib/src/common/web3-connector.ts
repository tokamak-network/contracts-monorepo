import Web3 from "web3";
import { provider } from "web3-core";

export default class Web3Connector {
    private static _instance: Web3Connector;
    private static _provider: provider;
    private static _host: string;
    private readonly _web3: Web3;

    private constructor() {
        this._web3 = new Web3(Web3Connector._provider);
    }

    public static instance(): Web3Connector {
        if (!Web3Connector._instance) {
            Web3Connector._instance = new Web3Connector();
        }
        return Web3Connector._instance;
    }

    public static setNetwork(provider: provider) {
        Web3Connector._provider = provider;
        provider["host"] ? Web3Connector._host = provider["host"] : Web3Connector._host = String(provider);
    }

    public setProvider(provider: provider) {
        Web3Connector._provider = provider;
        provider["host"] ? Web3Connector._host = provider["host"] : Web3Connector._host = String(provider);
        this._web3.setProvider(provider);
    }

    public get web3(): Web3 {
        return this._web3;
    }

    public static get host(): string {
        return this._host;
    }
}