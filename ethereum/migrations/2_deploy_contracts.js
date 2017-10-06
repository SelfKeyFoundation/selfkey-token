var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");


module.exports = function(deployer, network, accounts) {
  var now = (new Date).getTime()/1000;
  //var startTime = now + 172800;           // Two days after current time
  var startTime = 1507334400;             // Saturday Oct 07th 12:00:00 UTC
  var endTime = startTime + 604800;       // One week after startTime
  var rate = 20000;                       // approximately $0.015 per KEY
  var presaleRate = 30000;                // approximately $0.01 per KEY

  //var wallet = accounts[9];
  //var foundationPool = accounts[8];
  //var legalExpensesWallet = accounts[7];

  var foundationPool = "0x323989e34453e54c9E0b9f8fdE2645fdfe045d10";
  var wallet = "0x9153Bb96E667424a62777fEF49aCE9bab658DC6D";
  var legalExpensesWallet = "0x3B9c7A0e1EE3549F773F7bbC9c8f75e87E99AE24";

  deployer.deploy(SelfKeyCrowdsale, startTime, endTime, rate, presaleRate, wallet, foundationPool, legalExpensesWallet);
};
