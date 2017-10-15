var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");


module.exports = function(deployer, network, accounts) {
  var now = (new Date).getTime()/1000;
  //var startTime = now + 172800;           // Two days after current time
  var startTime = 1507939200;             // 10/14/2017 @ 12:00am (UTC)
  var endTime = startTime + 604800;       // One week after startTime
  var rate = 20000;                       // approximately $0.015 per KEY
  var presaleRate = 30000;                // approximately $0.01 per KEY
  var goal = 16666666666667000000000;     // approximatelly $5Million in wei

  var foundationPool, wallet, legalExpensesWallet;

  if(network == 'ropsten') {
    foundationPool = "0x323989e34453e54c9E0b9f8fdE2645fdfe045d10";
    wallet = "0x9153Bb96E667424a62777fEF49aCE9bab658DC6D";
    legalExpensesWallet = "0x3B9c7A0e1EE3549F773F7bbC9c8f75e87E99AE24";
  } else {
    wallet = accounts[9];
    foundationPool = accounts[8];
    legalExpensesWallet = accounts[7];
  }

  deployer.deploy(SelfKeyCrowdsale, startTime, endTime, rate, presaleRate, wallet, foundationPool, legalExpensesWallet, goal);
};
