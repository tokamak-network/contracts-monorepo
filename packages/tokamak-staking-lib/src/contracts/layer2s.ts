import Layer2 from "./layer2";

export default class Layer2s {
    private static _contracts: Map<string, Layer2> = new Map<string, Layer2>();

    private constructor() {}

    public static get(address: string): Layer2 {
        if (this._contracts.has(address)) {
            return this._contracts.get(address);
        }

        let contract: Layer2 = new Layer2(address);
        this._contracts.set(address, contract);
        return contract;
    }
}