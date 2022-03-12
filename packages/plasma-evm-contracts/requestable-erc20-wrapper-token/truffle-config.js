require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    },
    plasma: {
      host: 'localhost',
      port: 8547,
      network_id: '*', // eslint-disable-line camelcase
    },
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 21,
    },
    useColors: true,
    enableTimeouts: false,
  },
};
