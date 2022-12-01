# Tokamak Staking Library
## Notice
The current seigniorage per block in SeigManager is 3.92.
All number units in this library uses WAD (1e18) and RAY (1e27) to prevent number errors.

## Related Contracts
To get the information about related contracts, refer to [Deployed Contracts on Mainnet].

## Installation
First, add `tokamak-staking-lib` as a dependency in `package.json` file.
```
"dependencies": {
  "tokamak-staking-lib": "^0.0.12",
},
```

Then, install the package to your local directory.
```sh
$ npm install
```

## API Reference
For more information about how to use the tokamak staking library, refer to [Staking API Reference].

## CLI Usage
For information about how to use the cli, refer to [Staking CLI Usage].

## Examples
### Staking Query
To install and run `Staking Query`, put the below commands on your terminal.
```sh
$ git clone https://github.com/Onther-Tech/tokamak-staking-lib.git
$ cd tokamak-staking-lib/examples/staking_query
$ npm install
$ node index.js
```

[Deployed Contracts on Mainnet]: <https://github.com/Onther-Tech/plasma-evm-contracts#deployed-contracts-on-mainnet>
[Staking API Reference]: <./docs/api_reference.md>
[Staking CLI Usage]: <./docs/cli_usage.md>
