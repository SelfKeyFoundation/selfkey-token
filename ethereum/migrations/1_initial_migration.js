var Migrations = artifacts.require("./Migrations.sol");
var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");


module.exports = function(deployer, network, accounts) {
  deployer.deploy(Migrations);
};
