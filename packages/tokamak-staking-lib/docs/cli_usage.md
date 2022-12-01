# Staking CLI Usage

## Clone Repository & Install Dependencies
To clone the repository and install dependencies, put the below commands on your terminal.
```sh
$ git clone https://github.com/Onther-Tech/tokamak-staking-lib.git
$ cd tokamak-staking-lib
$ npm install
```

Install typescript globally to compile the TypeScript code.
```sh
$ sudo npm install -g typescript
```

Install ts-node globally to run the TypeScript code.
```sh
$ sudo npm install -g ts-node
```

## Usage
To run the cli, put the below commands with options on your terminal.
```sh
$ ts-node cli.ts -n [net] -e [endpoint] -f [func] -p [param]
```

To display the cli options, put the help command on your terminal.
```sh
$ ts-node cli.ts --help
Usage: cli [options]

Options:
  -n, --net [value]       network name. e.g. mainnet / rinkeby
  -e, --endpoint [value]  web3 provider rpc endpoint
  -f, --func [value]      function name
  -p, --param [value]     function parameters splited by comma
  -h, --help              display help for command
```

## Examples
You need to set INFURA_KEY on your terminal before you run the cli.
```sh
$ INFURA_KEY=[your infura key]
```

### [getNumLayer2](./api_reference.md#getNumLayer2)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getNumLayer2
```

### [getLayer2ByIndex](./api_reference.md#getLayer2ByIndex)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getLayer2ByIndex \
    -p [index]
```

### [isLayer2](./api_reference.md#isLayer2)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f isLayer2 \
    -p [layer2]
```

### [getOperator](./api_reference.md#getOperator)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getOperator \
    -p [layer2]
```

### [isSubmitter](./api_reference.md#isSubmitter)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f isSubmitter \
    -p "[layer2],[account]"
```

### [getStakedAmount](./api_reference.md#getStakedAmount)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://api.infura.io/v1/jsonrpc/rinkeby \
    -f getStakedAmount \
    -p "[layer2],[account],[blockNumber]"
```

### [getStakedAmountDiff](./api_reference.md#getStakedAmountDiff)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://api.infura.io/v1/jsonrpc/rinkeby \
    -f getStakedAmountDiff \
    -p "[layer2],[account],[fromBlockNumber],[toBlockNumber]"
```

### [getTotalStakedAmount](./api_reference.md#getTotalStakedAmount)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://api.infura.io/v1/jsonrpc/rinkeby \
    -f getTotalStakedAmount \
    -p "[account],[blockNumber]"
```

### [getTotalStakedAmountDiff](./api_reference.md#getTotalStakedAmountDiff)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://api.infura.io/v1/jsonrpc/rinkeby \
    -f getTotalStakedAmountDiff \
    -p "[account],[fromBlockNumber],[toBlockNumber]"
```

### [getTotalSupplyOfTON](./api_reference.md#getTotalSupplyOfTON)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getTotalSupplyOfTON
```

### [getTotalSupplyOfTONWithSeig](./api_reference.md#getTotalSupplyOfTONWithSeig)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getTotalSupplyOfTONWithSeig
```

### [getTotalSupplyOfWTON](./api_reference.md#getTotalSupplyOfWTON)
```sh
$ ts-node cli.ts \
    -n rinkeby \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f getTotalSupplyOfWTON
```

### [commitDummy](./api_reference.md#commitDummy)
```sh
$ ts-node cli.ts \
    -n rinkeby  \
    -e https://rinkeby.infura.io/v3/$INFURA_KEY \
    -f commitDummy  \
    -p "[layer2],[privkey]"
```
