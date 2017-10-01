module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "default"
    },
    test: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    local_geth: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 999999
    },
    ropsten: {
      host: "localhost",
      port: 8546,
      network_id: "*",
      gas: 999999
    }
  }
};
