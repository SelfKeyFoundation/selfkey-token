var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");
var TokenTimelock = artifacts.require("zeppelin-solidity/contracts/token/TokenTimelock.sol");
var RefundVault = artifacts.require("zeppelin-solidity/contracts/crowdsale/RefundVault.sol");

var crowdsaleContract, tokenContract, timelockFoundersContract, vaultContract, buyer, receiver;


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
  buyer2 = accounts[2];
  receiver = accounts[3];


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
    return crowdsaleContract.timelockFounders.call().then(function(timelockFounders) {
      return TokenTimelock.at(timelockFounders).then(function(foundersInstance) {
        timelockFoundersContract = foundersInstance;
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

  it("should have created Refund Vault successfully", function() {
    return crowdsaleContract.vault.call().then(function(vaultAddress) {
      return RefundVault.at(vaultAddress).then(function(instance) {
        vaultContract = instance;
        assert.isNotNull(instance);
      });
    });
  });

  it("should have distributed initial token amounts correctly", function() {
    // Get expected token amounts from contract config
    return crowdsaleContract.FOUNDATION_POOL_TOKENS.call().then(function(expectedFoundationTokens) {
      return crowdsaleContract.LEGAL_EXPENSES_TOKENS.call().then(function(expectedLegalTokens) {
        return crowdsaleContract.FOUNDERS_TOKENS_VESTED.call().then(function(expectedTimelockFoundersTokens) {
          return tokenContract.balanceOf.call(foundationPool).then(function(foundationBalance) {
            // Check foundation Pool tokens are allocated correctly
            assert.equal(foundationBalance, Number(expectedFoundationTokens));
            // Get legal expenses wallet balance
            return tokenContract.balanceOf.call(legalExpensesWallet).then(function(legalBalance) {
              // Check legal expenses wallet tokens are allocated correctly
              assert.equal(legalBalance, Number(expectedLegalTokens));
              // Get timelock instance address
              return crowdsaleContract.timelockFounders.call().then(function(timelockFoundersAddress) {
                // Get founders' timelock balance
                return tokenContract.balanceOf.call(timelockFoundersAddress).then(function(timelockFoundersBalance) {
                  // Check timelockFounders tokens are allocated correctly
                  assert.equal(timelockFoundersBalance, Number(expectedTimelockFoundersTokens));
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
        // check KEY (locked) balance of buyer
        return crowdsaleContract.lockedBalance.call(buyer).then(function(balance) {
          // Assert (locked) KEY balance is correct
          assert.equal(Number(balance), sendAmount * rate);
          return vaultContract.deposited.call(buyer).then(function(weiBalance) {
            var vaultNewBalance = weiBalance;
            // Check wei added to Refund vault is correct
            assert.equal(vaultNewBalance - vaultInitialBalance, sendAmount);    // Wallet received correct ETH
            // Finalize contract
            return crowdsaleContract.finalize().then(function(result) {
              return crowdsaleContract.verifyKYC(buyer).then(function(result) {
                return tokenContract.balanceOf.call(buyer).then(function (balance) {
                  assert.equal(Number(balance), sendAmount * rate);
                  var transferValue = web3.toWei(15000, 'ether');
                  // Try transferring tokens once sale is finalized and holder's KYC verified
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
  });

  it("should allow forced refund for KYC-failed participants", function () {
    var sendAmount = web3.toWei(1, "ether");
    var balance1 = web3.eth.getBalance(buyer2);
    // send ETH to crowdsale contract for buying KEY
    return crowdsaleContract.sendTransaction({from: buyer2, value: sendAmount, gas: 500000}).then(function(tx) {
      var balance2 = web3.eth.getBalance(buyer2);
      crowdsaleContract.lockedBalance.call(buyer2).then(function(balance) {
        // Check tokens were effectively allocated (locked) to the participant
        assert.isAbove(Number(balance), 0);
      });
      return crowdsaleContract.rejectKYC(buyer2).then(function(result) {
        var balance3 = web3.eth.getBalance(buyer2);
        // Check refund was made correctly
        assert.equal(Number(balance3), Number(balance2) + Number(sendAmount));
        return crowdsaleContract.lockedBalance.call(buyer2).then(function(balance) {
          // Check allocated tokens to the participant are reset now
          assert.equal(Number(balance), 0);
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
      // Get token contract instance
      return failedCrowdsaleContract.token.call().then(function(token) {
        return SelfKeyToken.at(token).then(function(instance) {
          var failedTokenContract = instance;
          // Purchase equivalent of <sendAmount> in tokens
          return failedCrowdsaleContract.sendTransaction({from: buyer, value: sendAmount, gas: 500000}).then(function(txn1) {
            // Get refund vault contract instance
            return failedCrowdsaleContract.vault.call().then(function(vaultAddress) {
              return RefundVault.at(vaultAddress).then(function(instance) {
                var failedVaultContract = instance;
                // Check if refund vault was instantiated correctly
                assert.isNotNull(instance);
                // Finalize sale
                return failedCrowdsaleContract.finalize().then(function(result) {
                  var balance1 = web3.eth.getBalance(buyer);
                  // Issue refund
                  return failedCrowdsaleContract.claimRefund({from: buyer, gas: 500000}).then(function(txn2) {
                    var balance2 = web3.eth.getBalance(buyer);
                    // Check buyer balance increases
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

  var wallet = accounts[9];
  var foundationPool = accounts[8];
  var foundersPool = accounts[7];
  var legalExpensesWallet = accounts[6];

  var presaleCrowdsale, presaleToken;

  buyer = accounts[3];
  buyer2 = accounts[4]
  receiver = accounts[5];

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

  // Offchain purchases
  it("should allow to add 'pre-commitments' for off-chain contributions with bonus", function () {
    var sendAmount = web3.toWei(1, "ether");    // approx. $12M if 1 ETH = $300
    var bonusFactor = 70;

    return presaleCrowdsale.weiRaised.call().then(function (value1) {
      return presaleCrowdsale.addPrecommitment(buyer2, sendAmount, bonusFactor).then(function (result) {
        return presaleCrowdsale.weiRaised.call().then(function (value2) {
          // Check contribution wei has been successfully registered in the crowdsale
          assert.equal(value2 - value1, sendAmount);
          // Check tokens have been transferred correctly
          return presaleToken.balanceOf.call(buyer2).then(function (balance) {
            var newRate = rate + (rate * bonusFactor)/100;
            assert.equal(balance, sendAmount * newRate);
          });
        });
      });
    });
  });

  // Public pre-sale
  it("should be able to receive ETH and allocate due tokens for pre-sale enabled addresses", function() {
    var sendAmount = web3.toWei(1, "ether");
    var walletBalance = web3.eth.getBalance(wallet);
    // SHOULD FAIL AS PARTICIPANT IS NOT WHITELISTED (KYC-VERIFIED) YET
    //return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999}).then(function(txResult) {
    //  console.log(txResult);
    //});
    return presaleCrowdsale.verifyKYC(buyer).then(function (tx) {
      return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999}).then(function(txResult) {
        return presaleToken.balanceOf.call(buyer).then(function(balance) {
          assert.equal(Number(balance), presaleRate * sendAmount);
        });
      });
    });
  });
});
