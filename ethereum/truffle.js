var fs = require ('fs');
var Web3 = require("web3");
var bip39 = require("bip39");
var hdkey = require('ethereumjs-wallet/hdkey');
var ProviderEngine = require("web3-provider-engine");
var Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
var WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');


// Get our mnemonic and create an hdwallet
var walletObj = JSON.parse(fs.readFileSync("./wallet.json"));
var mnemonic = walletObj.mnemonic;
var hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));

// Get the first account using the standard hd path.
var wallet_hdpath = "m/44'/60'/0'/0/";
var wallet = hdwallet.derivePath(wallet_hdpath + "0").getWallet();

// Generate other addresses
/*
var wallet1 = hdwallet.derivePath(wallet_hdpath + "1").getWallet();
var wallet2 = hdwallet.derivePath(wallet_hdpath + "2").getWallet();
var wallet3 = hdwallet.derivePath(wallet_hdpath + "3").getWallet();
var wallet4 = hdwallet.derivePath(wallet_hdpath + "4").getWallet();

var address1 = "0x" + wallet1.getAddress().toString("hex");
var address2 = "0x" + wallet2.getAddress().toString("hex");
var address3 = "0x" + wallet3.getAddress().toString("hex");
var address4 = "0x" + wallet4.getAddress().toString("hex");

console.log("accounts 1 = 0x" + address1);
console.log("accounts 2 = 0x" + address2);
console.log("accounts 3 = 0x" + address3);
console.log("accounts 4 = 0x" + address4);
*/

var address = "0x" + wallet.getAddress().toString("hex");

var providerUrl = "https://ropsten.infura.io/SYGRk61NUc3yN4NNRs60";
var engine = new ProviderEngine();

engine.addProvider(new WalletSubprovider(wallet, {}));
engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(providerUrl)));
engine.start(); // Required by the provider engine.

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
    geth: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 999999
    },
    ropsten: {
      network_id: 3,
      provider: engine,
      from: address,
      gas: 5000000
    }
  },
  rpc: {
    // Use the default host and port when not using ropsten
    host: "localhost",
    port: 8545
  }
};
