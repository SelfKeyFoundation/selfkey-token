const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')
const TokenTimelock = artifacts.require('zeppelin-solidity/contracts/token/TokenTimelock.sol')
const KYCRefundVault = artifacts.require('./KYCRefundVault.sol')

const { rate, presaleRate, goal } = require('./utils/common')

contract('SelfKeyCrowdsale', (accounts) => {
  const now = (new Date()).getTime() / 1000
  const start = now
  const end = start + 31622400 // 1 year from start

  const [
    legalExpensesWallet,
    foundersPool,
    foundationPool,
    wallet
  ] = accounts.slice(6)

  const [buyer, buyer2, buyer3, receiver] = accounts.slice(1)

  let crowdsaleContract
  let tokenContract
  let timelockFoundersContract
  let vaultContract

  context('Regular Crowdsale', () => {
    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        rate,
        presaleRate,
        wallet,
        foundationPool,
        foundersPool,
        legalExpensesWallet,
        goal
      )
      const token = await crowdsaleContract.token.call()
      tokenContract = await SelfKeyToken.at(token)
      const timelockFounders = await crowdsaleContract.timelockFounders.call()
      timelockFoundersContract = await TokenTimelock.at(timelockFounders)
      const vaultAddress = await crowdsaleContract.vault.call()
      vaultContract = await KYCRefundVault.at(vaultAddress)
    })

    it('deployed with the right owner', async () => {
      assert.isNotNull(crowdsaleContract)
      assert.isNotNull(tokenContract)
      const owner = await tokenContract.owner.call()
      assert.equal(owner, crowdsaleContract.address)
    })

    it('created token timelocks', () => {
      assert.isNotNull(timelockFoundersContract)
    })

    it('created the Refund Vault', () => {
      assert.isNotNull(vaultContract)
    })

    it('distributed the initial token amounts correctly', async () => {
      // Get expected token amounts from contract config
      const expectedFoundationTokens = await crowdsaleContract.FOUNDATION_POOL_TOKENS.call()
      const expectedLegalTokens = await crowdsaleContract.LEGAL_EXPENSES_TOKENS.call()
      const expectedTimelockFoundersTokens = await crowdsaleContract.FOUNDERS_TOKENS_VESTED.call()
      const foundationBalance = await tokenContract.balanceOf.call(foundationPool)
      // Check foundation Pool tokens are allocated correctly
      assert.equal(foundationBalance, Number(expectedFoundationTokens))
      // Get legal expenses wallet balance
      const legalBalance = await tokenContract.balanceOf.call(legalExpensesWallet)
      // Check legal expenses wallet tokens are allocated correctly
      assert.equal(legalBalance, Number(expectedLegalTokens))
      // Get timelock instance address
      const timelockFoundersAddress = await crowdsaleContract.timelockFounders.call()
      // Get founders' timelock balance
      const timelockFoundersBalance = await tokenContract.balanceOf.call(timelockFoundersAddress)
      // Check timelockFounders tokens are allocated correctly
      assert.equal(timelockFoundersBalance, Number(expectedTimelockFoundersTokens))
    })

    it('receives ETH to buy tokens that get transferred to another address', async () => {
      const sendAmount = web3.toWei(2, 'ether')
      const vaultInitialBalance = await vaultContract.deposited.call(buyer)
      // send ETH to crowdsale contract for buying KEY
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      // check KEY (locked) balance of buyer
      const newBalance = await crowdsaleContract.lockedBalance.call(buyer)
      // Assert (locked) KEY balance is correct
      assert.equal(Number(newBalance), sendAmount * rate)
      const vaultNewBalance = await vaultContract.deposited.call(buyer)
      // Check wei added to the vault is correct
      assert.equal(vaultNewBalance - vaultInitialBalance, sendAmount)
      // verify KYC for buyer
      await crowdsaleContract.verifyKYC(buyer)
      const anotherNewBalance = await tokenContract.balanceOf.call(buyer)
      assert.equal(Number(anotherNewBalance), sendAmount * rate)
      // THIS SHOULD FAIL SINCE TRANSFERS HAVEN'T BEEN ENABLED YET
      // return tokenContract.transfer(receiver, 5 ,{from: buyer});
    })

    // TODO: implement test
    xit('does not allow contributions below minimum purchase cap', async () => {
      const sendAmount = 333333333000000000 - 50
      const result = await crowdsaleContract.sendTransaction({ from: buyer3, value: sendAmount })
      // assert.fails(result)
    })

    xit('does not allow contributions above maximum purchase cap', async () => {
      const sendAmount = 50000000000000000000 + 5000
      const result = await crowdsaleContract.sendTransaction({ from: buyer3, value: sendAmount })
      assert.fails(result)
    })

    it('allows refund for KYC-failed participants', async () => {
      const sendAmount = web3.toWei(1, 'ether')
      const balance1 = web3.eth.getBalance(buyer2)
      // send ETH to crowdsale contract for buying KEY
      await crowdsaleContract.sendTransaction({ from: buyer2, value: sendAmount })
      const balance2 = web3.eth.getBalance(buyer2)
      let newBalance = await crowdsaleContract.lockedBalance.call(buyer2)
      // check tokens were effectively allocated (locked) to the participant
      assert.isAbove(Number(newBalance), 0)
      await crowdsaleContract.rejectKYC(buyer2)
      newBalance = await crowdsaleContract.lockedBalance.call(buyer2)
      // check allocated tokens to the participant are reset now
      assert.equal(Number(newBalance), 0)
      // check refund was enabled correctly
      const refundBalance = await vaultContract.toRefund.call(buyer2)
      assert.equal(sendAmount, refundBalance)
      // user claims refund
      await crowdsaleContract.claimRefund({ from: buyer2 })
      const balance3 = web3.eth.getBalance(buyer2)
      assert.isAbove(Number(balance3), Number(balance2))
    })

    it('can finalize token sale', async () => {
      const sendAmount = web3.toWei(1, 'ether')
      // THIS SHOULD FAILS SINCE SALE IS NOT FINALIZED YET
      // tokenContract.transfer(receiver, sendAmount, {from: buyer}).then(function() {
      //  tokenContract.balanceOf.call(receiver).then(function(balance) {
      //    assert.equal(sendAmount, balance);
      //  });
      // });

      await crowdsaleContract.finalize()
      const balance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      // check unsold tokens were effectively burned
      assert.equal(balance, 0)
      // check tokens are now transferrable
      await tokenContract.transfer(receiver, sendAmount, { from: buyer })
      const newBalance = await tokenContract.balanceOf.call(receiver)
      assert.equal(sendAmount, newBalance)
    })
  })

  context('crowdsale whose goal hasn\'t been reached', () => {
    const hugeGoal = 3333333333333333333333
    const sendAmount = web3.toWei(3, 'ether')

    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        rate,
        presaleRate,
        wallet,
        foundationPool,
        foundersPool,
        legalExpensesWallet,
        hugeGoal
      )
      const token = await crowdsaleContract.token.call()
      tokenContract = await SelfKeyToken.at(token)
      const timelockFounders = await crowdsaleContract.timelockFounders.call()
      timelockFoundersContract = await TokenTimelock.at(timelockFounders)
      const vaultAddress = await crowdsaleContract.vault.call()
      vaultContract = await KYCRefundVault.at(vaultAddress)
    })

    it('deployed with the right owner', async () => {
      assert.isNotNull(crowdsaleContract)
      assert.isNotNull(tokenContract)
      const owner = await tokenContract.owner.call()
      assert.equal(owner, crowdsaleContract.address)
    })

    it('allows refunds', async () => {
      // Purchase equivalent of <sendAmount> in tokens
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      // finalize sale
      await crowdsaleContract.verifyKYC(buyer)
      await crowdsaleContract.finalize()
      const balance1 = web3.eth.getBalance(buyer)
      // issue refund
      await crowdsaleContract.claimRefund({ from: buyer })
      const balance2 = web3.eth.getBalance(buyer)
      // check buyer balance increases
      assert.isAbove(Number(balance2), Number(balance1))
    })
  })
})
