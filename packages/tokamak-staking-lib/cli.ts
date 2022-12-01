import program from "commander";
import * as tokamak from "./src";
import BN from "bn.js";

program
    .option("-n, --net [value]", "network name. e.g. mainnet / rinkeby")
    .option("-e, --endpoint [value]", "web3 provider rpc endpoint")
    .option("-f, --func [value]", "function name")
    .option("-p, --param [value]", "function parameters splited by comma")
    .parse(process.argv);

require("dotenv").config();

async function main() {
    const {
        net,
        endpoint,
        func,
        param = ""
    } = program;

    if (!net) throw new Error("--net not provided");
    if (!endpoint) throw new Error("--endpoint not provided");
    if (!func) throw new Error("--func not provided");

    tokamak.setNetwork(endpoint, net);

    let params = param.split(",");
    params.forEach((element, index) => params[index] = element.trim());
    const result = await tokamak[func](...params);
    BN.isBN(result) ? console.log(result.toString()) : console.log(result);

    process.exit(0);
}

main().catch(console.error);