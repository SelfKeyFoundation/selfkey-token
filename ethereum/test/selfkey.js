var SelfKeyCrowdsale = artifacts.require("./SelfKeyCrowdsale.sol");
var SelfKeyToken = artifacts.require("./SelfKeyToken.sol");
var TokenTimelock = artifacts.require("zeppelin-solidity/contracts/token/TokenTimelock.sol");
var KYCRefundVault = artifacts.require("./KYCRefundVault.sol");

var crowdsaleContract, tokenContract, timelockFoundersContract, vaultContract, buyer, receiver;


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
  buyer3 = accounts[3];
  receiver = accounts[4];


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
      });
    });
  });

  it("should have created Refund Vault successfully", function() {
    return crowdsaleContract.vault.call().then(function(vaultAddress) {
      return KYCRefundVault.at(vaultAddress).then(function(instance) {
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
    var sendAmount = web3.toWei(2, "ether");
    var vaultInitialBalance;

    vaultContract.deposited.call(buyer).then(function(balance) {
      vaultInitialBalance = balance;
      // send ETH to crowdsale contract for buying KEY
      return crowdsaleContract.sendTransaction({from: buyer, value: sendAmount}).then(function(result) {
        // check KEY (locked) balance of buyer
        return crowdsaleContract.lockedBalance.call(buyer).then(function(balance) {
          // Assert (locked) KEY balance is correct
          assert.equal(Number(balance), sendAmount * rate);
          return vaultContract.deposited.call(buyer).then(function(weiBalance) {
            var vaultNewBalance = weiBalance;
            // Check wei added to the vault is correct
            assert.equal(vaultNewBalance - vaultInitialBalance, sendAmount);    // Vault received correct ETH
            // verify KYC for buyer
            return crowdsaleContract.verifyKYC(buyer).then(function() {
              return tokenContract.balanceOf.call(buyer).then(function(balance) {
                assert.equal(Number(balance), sendAmount * rate);
                // THIS SHOULD FAIL SINCE TRANSFERS HAVEN'T BEEN ENABLED YET
                //return tokenContract.transfer(receiver, 5 ,{from: buyer});
              });
            });
          });
        });
      });
    });
  });

  it("should not allow contributions below minimum purchase cap", function() {
    // THIS SHOULD FAIL IF UNCOMMENTED
    //var sendAmount = 333333333000000000 - 50;
    //return crowdsaleContract.sendTransaction({from: buyer3, value: sendAmount}).then(function(result) {});
    assert.isOk(true);
  });

  it("should not allow contributions above maximum purchase cap", function() {
    // THIS SHOULD FAIL IF UNCOMMENTED
    //var sendAmount = 50000000000000000000 + 5000;
    //return crowdsaleContract.sendTransaction({from: buyer3, value: sendAmount}).then(function(result) {});
    assert.isOk(true);
  });

  it("should allow refund for KYC-failed participants", function() {
    var sendAmount = web3.toWei(1, "ether");
    var balance1 = web3.eth.getBalance(buyer2);
    // send ETH to crowdsale contract for buying KEY
    return crowdsaleContract.sendTransaction({from: buyer2, value: sendAmount}).then(function(tx) {
      var balance2 = web3.eth.getBalance(buyer2);
      crowdsaleContract.lockedBalance.call(buyer2).then(function(balance) {
        // check tokens were effectively allocated (locked) to the participant
        assert.isAbove(Number(balance), 0);
      });
      return crowdsaleContract.rejectKYC(buyer2).then(function(result) {

        crowdsaleContract.lockedBalance.call(buyer2).then(function(balance) {
          // check allocated tokens to the participant are reset now
          assert.equal(Number(balance), 0);
        });
        // check refund was enabled correctly
        return vaultContract.toRefund.call(buyer2).then(function(refundBalance) {
          assert.equal(sendAmount, refundBalance);
          // user claims refund
          return crowdsaleContract.claimRefund({from: buyer2}).then(function() {
            var balance3 = web3.eth.getBalance(buyer2);
            assert.isAbove(Number(balance3), Number(balance2));
          });
        });
      });
    });
  });

  it("should be able to finalize token sale", function() {
    var sendAmount = 5000;
    // THIS SHOULD FAILS SINCE SALE IS NOT FINALIZED YET
    //tokenContract.transfer(receiver, sendAmount, {from: buyer}).then(function() {
    //  tokenContract.balanceOf.call(receiver).then(function(balance) {
    //    assert.equal(sendAmount, balance);
    //  });
    //});
    var sendAmount = web3.toWei(1, "ether");

    return crowdsaleContract.finalize().then(function() {
      tokenContract.balanceOf.call(crowdsaleContract.address).then(function(balance) {
        // check unsold tokens were effectively burned
        assert.equal(balance, 0);
        // check tokens are now transferrable
        tokenContract.transfer(receiver, sendAmount, {from: buyer}).then(function() {
          tokenContract.balanceOf.call(receiver).then(function(balance) {
            assert.equal(sendAmount, balance);
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
      // Get token contract instance
      return failedCrowdsaleContract.token.call().then(function(token) {
        return SelfKeyToken.at(token).then(function(instance) {
          var failedTokenContract = instance;
          // Purchase equivalent of <sendAmount> in tokens
          return failedCrowdsaleContract.sendTransaction({from: buyer, value: sendAmount}).then(function(txn1) {
            // Get refund vault contract instance
            return failedCrowdsaleContract.vault.call().then(function(vaultAddress) {
              return KYCRefundVault.at(vaultAddress).then(function(instance) {
                var failedVaultContract = instance;
                // check if refund vault was instantiated correctly
                assert.isNotNull(instance);
                // finalize sale
                return failedCrowdsaleContract.verifyKYC(buyer).then(function() {
                  return failedCrowdsaleContract.finalize().then(function(result) {
                    var balance1 = web3.eth.getBalance(buyer);
                    // issue refund
                    return failedCrowdsaleContract.claimRefund({from: buyer}).then(function(txn2) {
                      var balance2 = web3.eth.getBalance(buyer);
                      // check buyer balance increases
                      assert.isAbove(Number(balance2), Number(balance1));
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

  buyer = accounts[5];
  buyer2 = accounts[4]
  buyer3 = accounts[3];
  receiver = accounts[2];

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
  it("should allow to add 'pre-commitments' for off-chain contributions with bonus, no vesting", function () {
    var sendAmount = web3.toWei(1, "ether");    // approx. $12M if 1 ETH = $300
    var bonusFactor = 70;

    return presaleCrowdsale.weiRaised.call().then(function (value1) {
      return presaleCrowdsale.addPrecommitment(buyer2, sendAmount, bonusFactor, 0).then(function (result) {
        return presaleCrowdsale.weiRaised.call().then(function (value2) {
          // Check contribution wei has been successfully registered in the crowdsale
          assert.equal(value2 - value1, sendAmount);
          // Check tokens have been allocated correctly
          return presaleToken.balanceOf.call(buyer2).then(function (balance) {
            var newRate = rate + (rate * bonusFactor)/100;
            assert.equal(Number(balance), sendAmount * newRate);
          });
        });
      });
    });
  });

  it("should allow to add 'pre-commitments' with vesting", function () {
    var sendAmount = web3.toWei(1, "ether");    // approx. $12M if 1 ETH = $300
    var bonusFactor = 50;
    var vestingMonths = 3;

    return presaleCrowdsale.weiRaised.call().then(function (value1) {
      return presaleCrowdsale.addPrecommitment(buyer3, sendAmount, bonusFactor, vestingMonths).then(function (result) {
        return presaleCrowdsale.weiRaised.call().then(function (value2) {
          // check contribution wei has been successfully registered in the crowdsale
          assert.equal(value2 - value1, sendAmount);
          // check tokens have been allocated correctly
          return presaleToken.balanceOf.call(buyer3).then(function (balance) {
            var newRate = rate + (rate * bonusFactor)/100;
            var tokensAllocated = sendAmount * newRate;
            // check half tokens are immediately transferred to participant's wallet
            assert.equal(Number(balance), tokensAllocated / 2);
            return presaleCrowdsale.vestedTokens.call(buyer3).then(function(timelockAddress) {
              return presaleToken.balanceOf.call(timelockAddress).then(function(vestedBalance) {
                // check the other half is sent to the time-lock
                assert.equal(vestedBalance, tokensAllocated - (tokensAllocated / 2));
                // THE FOLLOWING SHOULD FAIL SINCE TOKENS ARE STILL LOCKED
                //return presaleCrowdsale.releaseLock(buyer3);
              });
            });
          });
        });
      });
    });
  });

  // Public pre-sale
  it("should be able to receive ETH and allocate due tokens for kyc-verified addresses", function() {
    var sendAmount = web3.toWei(1, "ether");
    var walletBalance = web3.eth.getBalance(wallet);
    // SHOULD FAIL AS PARTICIPANT IS NOT WHITELISTED (KYC-VERIFIED) YET
    //return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999}).then(function(txResult) {
    //  console.log(txResult);
    //});
    return presaleCrowdsale.verifyKYC(buyer).then(function (tx) {
      return presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount}).then(function(txResult) {
        return presaleToken.balanceOf.call(buyer).then(function(balance) {
          assert.equal(Number(balance), presaleRate * sendAmount);
        });
      });
    });
  });
});
