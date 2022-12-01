import { Contract } from "web3-eth-contract";
import Web3Connector from "../common/web3-connector";
const Layer2ABI = require("./abi/Layer2.json");
import BN from "bn.js";
const { toBN } = require("web3-utils");

export default class Layer2 {
    private _contract: Contract;

    public constructor(address: string) {
        const web3 = Web3Connector.instance().web3;
        this._contract = new web3.eth.Contract(Layer2ABI, address);
    }

    public async commitDummy(from: string): Promise<any> {
        const costNRB: string = await this._contract.methods.COST_NRB().call();
        const NRELength: string = await this._contract.methods.NRELength().call();
        const currentForkNumber: string = await this._contract.methods.currentFork().call();

        const fork: any = await this._contract.methods.forks(currentForkNumber).call();
        const epochNumber: BN = toBN(fork.lastEpoch).add(new BN("1"));
        const startBlockNumber: BN = toBN(fork.lastBlock).add(new BN("1"));
        const endBlockNumber: BN = startBlockNumber.add(toBN(NRELength)).sub(new BN("1"));

        const pos1: string = this.makePos(toBN(currentForkNumber), epochNumber);
        const pos2: string = this.makePos(startBlockNumber, endBlockNumber);
        const dummy = "0xdb431b544b2f5468e3f771d7843d9c5df3b4edcf8bc1c599f18f0b4ea8709bc3";

        return this._contract.methods.submitNRE(pos1, pos2, dummy, dummy, dummy).send({from: from, value: costNRB});
    }

    private makePos(x: BN, y: BN): string {
        const temp: BN = x.mul(new BN("2").pow(new BN("128")));
        return temp.add(y).toString();
    }

    public operator(): Promise<string> {
        return this._contract.methods.operator().call();
    }

    public isSubmitter(account: string): Promise<boolean> {
        return this._contract.methods.isSubmitter(account).call();
    }
}