var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");
var TokenTimelock = artifacts.require("zeppelin-solidity/contracts/token/TokenTimelock.sol");

var crowdsaleContract, tokenContract, timelock1Contract, buyer, receiver;


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
  var foundationPool = accounts[8];
  var legalExpensesWallet = accounts[7];

  buyer = accounts[1];
  receiver = accounts[2];

  it("should be able to deploy owning an instance of SelfKeyToken", function () {
    return SelfKeyCrowdsale.new(start, end, rate, wallet, foundationPool, legalExpensesWallet).then(function(instance) {
      crowdsaleContract = instance;
      assert.isNotNull(instance);
      return instance.token.call().then(function(token) {
        //console.log("token contract address = " + token);
        return SelfKeyToken.at(token).then(function(instance) {
          tokenContract = instance;
          instance.owner.call().then(function(owner) {
            //console.log("crowdsale address = " + crowdsaleContract.address);
            assert.equal(owner, crowdsaleContract.address);
          });
        });
      });
    });
  });

  it("should have created token timelocks successfully", function() {
    return crowdsaleContract.timelock1.call().then(function(timelock1Address) {
      return TokenTimelock.at(timelock1Address).then(function(instance) {
        timelock1Contract = instance;
        assert.isNotNull(instance);
        // THIS SHOULD FAIL IF TOKENS ARE STILL LOCKED
        /*return timelock1Contract.release().then(function(result) {
          return tokenContract.balanceOf.call(foundationPool).then(function(foundationBalance) {
            console.log(Number(foundationBalance));
          });
        });*/
      });
    });
  });

  it("should have distributed initial token amounts correctly", function() {
    return crowdsaleContract.FOUNDATION_POOL_TOKENS.call().then(function(expectedFoundationTokens) {
      return crowdsaleContract.LEGAL_EXPENSES_TOKENS.call().then(function(expectedLegalTokens) {
        return crowdsaleContract.TIMELOCK1_TOKENS.call().then(function(expectedTimelock1Tokens) {
          return tokenContract.balanceOf.call(foundationPool).then(function(foundationBalance) {
            // Foundation Pool tokens are allocated correctly
            assert.equal(foundationBalance, Number(expectedFoundationTokens));
            return tokenContract.balanceOf.call(legalExpensesWallet).then(function(legalBalance) {
              // Legal expenses wallet tokens are allocated correctly
              assert.equal(legalBalance, Number(expectedLegalTokens));
              return crowdsaleContract.timelock1.call().then(function(timelock1Address) {
                return tokenContract.balanceOf.call(timelock1Address).then(function(timelock1Balance) {
                  // timelock1 tokens are allocated correctly
                  assert.equal(timelock1Balance, Number(expectedTimelock1Tokens));
                });
              });
            });
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

        // Shouldn't be able to transfer tokens to another address until kyc is verified and crowdsale finalized
        // THIS SHOULD FAIL IF UNCOMMENTED
        /*return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
          return tokenContract.balanceOf.call(receiver).then(function(balance) {
            assert.equal(Number(balance), transferValue);
          });
        });*/
        return crowdsaleContract.finalize().then(function(result) {
          // THIS SHOULD FAIL UNTIL KYC IS VERIFIED
          /*return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
            return tokenContract.balanceOf.call(receiver).then(function(balance) {
              assert.equal(Number(balance), transferValue);
            });
          });*/
          return crowdsaleContract.verifyKYC(buyer).then(function(result) {
            return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
              return tokenContract.balanceOf.call(receiver).then(function(balance) {
                assert.equal(Number(balance), transferValue);
              });
            });
          });
        });
      });
    });
  });
});
