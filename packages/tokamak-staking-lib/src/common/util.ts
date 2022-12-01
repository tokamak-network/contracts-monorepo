import BN from "bn.js";
const { toBN } = require("web3-utils");

const CONVERSION_RATE_OF_WAD_RAY: string = String(10 ** 9);

export function toRAY(x: BN): BN {
    return x.mul(new BN(CONVERSION_RATE_OF_WAD_RAY));
}

export function toWAD(x: BN): BN {
    return x.div(new BN(CONVERSION_RATE_OF_WAD_RAY));
}