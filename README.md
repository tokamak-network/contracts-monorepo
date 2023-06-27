# Setup

``` Bash
$ yarn install
```

# Build

Currently, you have to build each package in each directory. You can't build them in root directory for now. Some script to build monorepo should be added.

``` Bash
# in packages/plasma-evm-contracts
$ yarn build
# in packages/tokamak-test-helpers
$ yarn build
```

# Integration test

`integration-tests` is made for testing in an environment where all the contracts are deployed.

``` Bash
# in integration-tests
$ yarn test
```

