var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");
var TokenTimelock = artifacts.require("zeppelin-solidity/contracts/token/TokenTimelock.sol");
var RefundVault = artifacts.require("zeppelin-solidity/contracts/crowdsale/RefundVault.sol");

var crowdsaleContract, tokenContract, timelockFoundationContract, timelockFoundersContract, vaultContract, buyer, receiver;


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
  var rate = 20000;         // approximately $0.015 per KEY
  var presaleRate = 30000;  // approximately $0.01 per KEY
  var goal = 1;             // minimum expected to raise in wei

  var wallet = accounts[9];
  var foundationPool = accounts[8];
  var foundersPool = accounts[7];
  var legalExpensesWallet = accounts[6];

  buyer = accounts[1];
  receiver = accounts[2];

  it("should be able to deploy owning an instance of SelfKeyToken", function () {
    return SelfKeyCrowdsale.new(start, end, rate, presaleRate, wallet, foundationPool, foundersPool,
    legalExpensesWallet, goal).then(function(instance) {
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
    return crowdsaleContract.timelockFoundation.call().then(function(timelockFoundation) {
      return crowdsaleContract.timelockFounders.call().then(function(timelockFounders) {
        return TokenTimelock.at(timelockFounders).then(function(foundersInstance) {
          return TokenTimelock.at(timelockFoundation).then(function(foundationInstance) {
            timelockFoundationContract = foundationInstance;
            timelockFoundersContract = foundersInstance;
            assert.isNotNull(foundationInstance);
            assert.isNotNull(foundersInstance);
            // THIS SHOULD FAIL IF TOKENS ARE STILL LOCKED
            //return timelockFoundationContract.release().then(function(result) {
            //  return tokenContract.balanceOf.call(foundationPool).then(function(foundationBalance) {
            //    console.log(Number(foundationBalance));
            //  });
            //});
          });
        });
      });


    });
  });

  it("should have created Refund Vault successfully", function() {
    return crowdsaleContract.vault.call().then(function(vaultAddress) {
      return RefundVault.at(vaultAddress).then(function(instance) {
        vaultContract = instance;
        assert.isNotNull(instance);
      });
    });
  });

  it("should have distributed initial token amounts correctly", function() {
    return crowdsaleContract.FOUNDATION_POOL_TOKENS.call().then(function(expectedFoundationTokens) {
      return crowdsaleContract.LEGAL_EXPENSES_TOKENS.call().then(function(expectedLegalTokens) {
        return crowdsaleContract.FOUNDERS_TOKENS_VESTED.call().then(function(expectedTimelockFoundersTokens) {
          return crowdsaleContract.FOUNDATION_TOKENS_VESTED.call().then(function(expectedTimelockFoundationTokens) {
            return tokenContract.balanceOf.call(foundationPool).then(function(foundationBalance) {
              // Foundation Pool tokens are allocated correctly
              assert.equal(foundationBalance, Number(expectedFoundationTokens));
              return tokenContract.balanceOf.call(legalExpensesWallet).then(function(legalBalance) {
                // Legal expenses wallet tokens are allocated correctly
                assert.equal(legalBalance, Number(expectedLegalTokens));

                crowdsaleContract.timelockFoundation.call().then(function(timelockFoundationAddress) {
                  return tokenContract.balanceOf.call(timelockFoundationAddress).then(function(timelockFoundationBalance) {
                    // timelockFoundation tokens are allocated correctly
                    assert.equal(timelockFoundationBalance, Number(expectedTimelockFoundationTokens));
                  });
                });

                return crowdsaleContract.timelockFounders.call().then(function(timelockFoundersAddress) {
                  return tokenContract.balanceOf.call(timelockFoundersAddress).then(function(timelockFoundersBalance) {
                    // timelockFounders tokens are allocated correctly
                    assert.equal(timelockFoundersBalance, Number(expectedTimelockFoundersTokens));
                  });
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
    var vaultInitialBalance;

    vaultContract.deposited.call(buyer).then(function(balance) {
      vaultInitialBalance = balance;
      // send ETH to crowdsale contract for buying KEY
      return crowdsaleContract.sendTransaction({from: buyer, value: sendAmount, gas: 500000}).then(function(result) {
        // check KEY balance of buyer
        return tokenContract.balanceOf.call(buyer).then(function(balance) {
          // Assert KEY balance is correct
          assert.equal(Number(balance), sendAmount * rate);
          // Check wei added to Refund vault is correct
          return vaultContract.deposited.call(buyer).then(function(weiBalance) {
            var transferValue = web3.toWei(15000, 'ether');   // to test KEY transfer further below
            var vaultNewBalance = weiBalance;
            assert.equal(vaultNewBalance - vaultInitialBalance, sendAmount);    // Wallet received correct ETH
            // THIS SHOULD FAIL SINCE CROWDSALE IS NOT FINALIZED
            //return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
            //  return tokenContract.balanceOf.call(receiver).then(function(balance) {
            //    assert.equal(Number(balance), transferValue);
            //  });
            //});
            return crowdsaleContract.finalize().then(function(result) {
              // THIS SHOULD FAIL UNTIL KYC IS VERIFIED
              //return tokenContract.transfer(receiver, transferValue, {from: buyer}).then(function(result) {
              //  return tokenContract.balanceOf.call(receiver).then(function(balance) {
              //    assert.equal(Number(balance), transferValue);
              //  });
              //});
              return crowdsaleContract.verifyKYC(buyer).then(function(result) {
                return tokenContract.transfer(receiver, transferValue, {from: buyer, gas: 999999}).then(function(result) {
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
  });

  it("should allow refunds for a crowdsale whose goal hasn't been reached", function() {
    var goal = 3333333333333333333333;
    var sendAmount = web3.toWei(3, "ether");

    return SelfKeyCrowdsale.new(start, end, rate, presaleRate, wallet, foundationPool, foundersPool,
    legalExpensesWallet, goal).then(function(instance) {
      var failedCrowdsaleContract = instance;
      assert.isNotNull(instance);

      return instance.token.call().then(function(token) {
        //console.log("token contract address = " + token);
        return SelfKeyToken.at(token).then(function(instance) {
          var failedTokenContract = instance;
          return failedCrowdsaleContract.sendTransaction({from: buyer, value: sendAmount, gas: 500000}).then(function(txn1) {
            return failedCrowdsaleContract.vault.call().then(function(vaultAddress) {
              return RefundVault.at(vaultAddress).then(function(instance) {
                var failedVaultContract = instance;
                assert.isNotNull(instance);
                return failedCrowdsaleContract.finalize().then(function(result) {
                  var balance1 = web3.eth.getBalance(buyer);
                  return failedCrowdsaleContract.claimRefund({from: buyer, gas: 500000}).then(function(txn2) {
                    var balance2 = web3.eth.getBalance(buyer);
                    assert.isAbove(balance2, balance1);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});


contract('SelfKeyCrowdsale (Pre-sale)', function(accounts) {
  var now = (new Date).getTime()/1000;
  var start = now + 31622400;   // 1 year from now
  var end = start + 31622400;   // 1 year from start
  var rate = 20000;             // approximately $0.015 per KEY
  var presaleRate = 30000;      // approximately $0.01 per KEY
  var goal = 1;

  var wallet = accounts[8];
  var foundationPool = accounts[8];
  var foundersPool = accounts[7];
  var legalExpensesWallet = accounts[6];

  var presaleCrowdsale, presaleToken;

  buyer = accounts[3];
  receiver = accounts[4];

  it("should be able to deploy in pre-sale mode", function() {
    return SelfKeyCrowdsale.new(start, end, rate, presaleRate, wallet, foundationPool, foundersPool,
    legalExpensesWallet, goal).then(function(instance) {
      presaleCrowdsale = instance;
      assert.isNotNull(instance);
      return instance.token.call().then(function(token) {
        //console.log("token contract address = " + token);
        return SelfKeyToken.at(token).then(function(instance) {
          presaleToken = instance;
        });
      });
    });
  });

  it("should be able to receive ETH and allocate due tokens for pre-sale enabled addresses", function() {
    var sendAmount = web3.toWei(1, "ether");
    var walletBalance = web3.eth.getBalance(wallet);
    // SHOULD FAIL AS PARTICIPANT IS NOT WHITELISTED YET
    //return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999}).then(function(txResult) {
    //  console.log(txResult);
    //});
    return presaleCrowdsale.allowPresale(buyer).then(function() {
      return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999}).then(function(txResult) {
        return presaleToken.balanceOf.call(buyer).then(function(balance) {
          assert(Number(balance), presaleRate * sendAmount);
          assert.equal(web3.eth.getBalance(wallet) - walletBalance, sendAmount);
        });
      });
    });
  });
});
