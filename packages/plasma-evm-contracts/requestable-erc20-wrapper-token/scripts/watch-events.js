const RootChain = artifacts.require('RootChain.sol');

function loadContract () {
  return new Promise((resolve, reject) => {
    RootChain.deployed().then(resolve).catch(reject);
  });
}

module.exports = async function () {
  const rootchain = await loadContract();

  const targetEvents = [
    'BlockSubmitted',
    'EpochPrepared',
    'BlockFinalized',
    'EpochFinalized',
    'EpochRebased',
    'RequestCreated',
    'RequestFinalized',
    'RequestChallenged',
    'Forked',
  ];

  const eventHandlers = {
  };

  for (const eventName of targetEvents) {
    const event = rootchain[eventName]({});
    event.watch((err, e) => {
      if (!err) {
        console.log(`[${eventName}]: ${JSON.stringify(e.args)}`);
        if (typeof eventHandlers[eventName] === 'function') {
          eventHandlers[eventName](e);
        }
      } else {
        console.error(`[${eventName}]`, err);
      }
    });
  }
}
;
