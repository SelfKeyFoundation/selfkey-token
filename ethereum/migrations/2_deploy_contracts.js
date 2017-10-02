var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");


module.exports = function(deployer, network, accounts) {
  var startTime = 1506556800;   // 2017-09-28 @ 12:00am UTC,
  var endTime = 1512086400;     // 2017-12-01 @ 12:00am UTC
  var rate = 20000;                       // approximately $0.015 per KEY
  var presaleRate = 30000;                // approximately $0.01 per KEY

  var wallet = accounts[9];
  var foundationPool = accounts[8];
  var legalExpensesWallet = accounts[7];

  deployer.deploy(SelfKeyCrowdsale, startTime, endTime, rate, presaleRate, wallet, foundationPool, legalExpensesWallet);
};
