var ERC20Interface = artifacts.require("./ERC20Interface.sol");
var Owned = artifacts.require("./Owned.sol");
var SafeMath = artifacts.require("./SafeMath.sol");
var SelfKeyTokenConfig = artifacts.require("./SelfKeyTokenConfig.sol");
var LockedTokens = artifacts.require("./LockedTokens.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");


module.exports = function(deployer) {
  var contractWallet = "0xa7a287dfad291c99ad220797c2eeeed7766c114d";

  deployer.deploy(Owned);
  deployer.deploy(SafeMath);
  deployer.deploy(SelfKeyTokenConfig);
  deployer.link(SafeMath, LockedTokens);
  deployer.deploy(LockedTokens);
  deployer.link(Owned, SelfKeyToken);
  deployer.link(SafeMath, SelfKeyToken);
  deployer.deploy(SelfKeyToken, contractWallet);
};
