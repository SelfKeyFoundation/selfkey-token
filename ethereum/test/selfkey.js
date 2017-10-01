var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");

var crowdsaleContract, tokenContract, buyer, receiver;

contract('SelfKeyToken', function(accounts) {
  it("should be able to deploy standalone", function() {
    return SelfKeyToken.new().then(function(instance) {
      assert.isNotNull(instance);
    });
  })
});

contract('SelfKeyCrowdsale', function(accounts) {
  var start = 1506556800;   // 2017-09-28 @ 12:00am UTC,
  var end = 1512086400;     // 2017-12-01 @ 12:00am UTC
  var rate = 30000;
  var goal = 1;             // 1 wei is enough, so no minimum cap is set (it has to be > 0)
  var wallet = accounts[9];

  buyer = accounts[1];
  receiver = accounts[2];

  it("should be able to deploy owning an instance of SelfKeyToken", function () {
    return SelfKeyCrowdsale.new(start, end, rate, wallet).then(function(instance) {
      crowdsaleContract = instance;
      assert.isNotNull(instance);
      return instance.token.call().then(function(token) {
        return SelfKeyToken.at(token).then(function(instance) {
          tokenContract = instance;
          instance.owner.call().then(function(owner) {;
            console.log("crowdsale address = " + crowdsaleContract.address);
            assert.equal(owner, crowdsaleContract.address);
          });
        });
      });
    });
  });

  it("should be able to receive ETH contributions to buy tokens and then transfer tokens to another address", function() {
    var sendAmount = web3.toWei(1, "ether");
    var walletInitialBalance = web3.eth.getBalance(wallet);

    return crowdsaleContract.sendTransaction({from: buyer ,value: sendAmount, gas: 500000}).then(function(result) {
      return tokenContract.balanceOf.call(buyer).then(function(balance) {
        var walletNewBalance = web3.eth.getBalance(wallet);
        var transferValue = web3.toWei(15000, 'ether');

        assert.equal(Number(balance), sendAmount * rate);   // KEY balance is correct
        assert.equal(walletNewBalance - walletInitialBalance, sendAmount);    // Wallet received correct ETH

        // Should be able to transfer tokens to another address
        return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
          return tokenContract.balanceOf.call(receiver).then(function(balance) {
            assert.equal(Number(balance), transferValue);
          });
        });
      });
    });
  });

  /*it("should listen for events", function() {
    var watcher = crowdsaleContract.TokenPurchase();
  });*/

  /*
  // THIS SHOULD FAIL IF UNCOMMENTED
  it("shouldn't be able to mint directly to the tokenContract", function() {
    var sendAmount = 1000000000 * (10 ** 18);

    return tokenContract.mint(accounts[1], sendAmount).then(function() {
      return tokenContract.balanceOf.call(accounts[1]).then(function(value) {
        console.log("accounts[1] balance = " + value);
        assert.isTrue(false);
      });
    });
  });*/
  /*
  // FAILS
  it("should deploy OpenZeppelin Crowdsale contract", function() {
    return Crowdsale.new(start, end, rate, wallet).then(function(instance) {
      assert.isNotNull(instance);
    });
  })*/
});
