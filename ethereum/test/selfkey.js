var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");
var LockedTokens = artifacts.require("./LockedTokens.sol");

contract('SelfKeyToken', function (accounts) {
  var contractWallet = "0xa7a287dfad291c99ad220797c2eeeed7766c114d";//accounts[1];
  var userAccount = "0xc754e9a7d0b04c00614a863aaa002735a4ed6e78";
  var tokenContract, lockedTokens;


  it("should deploy SelfKeyToken contract", function () {
    return SelfKeyToken.new(contractWallet).then(function (instance) {
      tokenContract = instance;
      assert.isNotNull(tokenContract);
    });
  });

  it("should match wallet address passed by constructor", function () {
    tokenContract.wallet.call().then(function (value) {
      assert.equal(value, contractWallet);
    });
  });

  it("should be linked to a non-null LockedTokens contract", function () {
    return tokenContract.lockedTokens.call().then(function (lockedTokensAddress) {
      assert.isNotNull(lockedTokensAddress);
      lockedTokens = LockedTokens.at(lockedTokensAddress);
      assert.isNotNull(lockedTokens);
    });
  });

  it("should have 33% of total tokens time-locked", function () {
    // Get address for locked tokens
    lockedTokens.LOCK_ACC.call().then(function (address) {
      assert.isNotNull(address);
      // Check for total balance of locked tokens
      lockedTokens.balanceOfLocked.call(address).then(function (value) {
        // Get decimals factor for comparison
        tokenContract.DECIMALSFACTOR.call().then(function (decimalsFactor) {
            assert.equal(Number(value), 3267000000 * decimalsFactor);
        });
      });
    });
  });

  it("should accept ETH for buying tokens in the crowdsale", function () {
    var contractBalance = web3.eth.getBalance(contractWallet);
    var difference;

    return tokenContract.sendTransaction({
      from: userAccount,
      value: web3.toWei(1, "ether")
    }).then(function (result) {
        tokenContract.balanceOf.call(userAccount).then(function (value) {
        // Checking KEY balance is above 0
        assert.isAbove(value, 0);
        tokenContract.balanceEth.call(userAccount).then(function (value) {
          // Checking ETH balance is = 1 ether
          assert.equal(value, web3.toWei(1, "ether"));
        });
        // new balance equals old balance plus new ether received
        difference = web3.eth.getBalance(contractWallet) - contractBalance;
        assert.equal(difference, web3.toWei(1, "ether"));
      });
    });
  });

  it("should have received 99 ethers from local coinbase account", function () {
    tokenContract.balanceOf.call(userAccount).then(function (value) {
      console.log("KEY balance = " + value);
      //assert.isAbove(value, 0);
      tokenContract.balanceEth.call(userAccount).then(function (value) {
        console.log("ETH balance = " + value);
      });
    });
  });

  //it("should finalise properly when requested"); // finalise
  //it("should allow pre-sale participation");
  //it("should allow precommitment of KEY funds");  //addPrecommitment

  //it("should be able to verify KYC for participants", function () {});
  //it("should be able to reject KYC for participants", function () {});
  //it("should be able to allow token 'burning' if owner has approved"); // burnFrom

  //it("should display correct amount of tokens in time-lock contract"); //balanceOfLocked_n
    // totalSupplyLocked_n
    // totalSupplyLocked
    // totalSupplyUnlocked

  //it("should allow transfer of tokens by the owner"); //transfer
  //it("should allow transfer of tokens if authorized by the owner"); //transferFrom

});
