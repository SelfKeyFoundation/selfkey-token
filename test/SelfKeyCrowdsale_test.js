const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')
const TokenTimelock = artifacts.require('zeppelin-solidity/contracts/token/TokenTimelock.sol')
const KYCRefundVault = artifacts.require('./KYCRefundVault.sol')

const assertThrows = require('./utils/assertThrows')
const timeTravel = require('./utils/timeTravel')
const { goal } = require('./utils/common')


contract('SelfKeyCrowdsale', (accounts) => {
  const now = (new Date()).getTime() / 1000
  const start = now
  const end = start + 31622400 // 1 year from start

  const SIGNIFICANT_AMOUNT = 2048

  const [buyer, buyer2, buyer3, receiver] = accounts.slice(1)

  let crowdsaleContract
  let tokenContract
  let timelockFounders1Contract
  let timelockFounders2Contract
  let vaultContract

  context('Regular Crowdsale', () => {
    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        goal
      )
      const token = await crowdsaleContract.token.call()
      tokenContract = await SelfKeyToken.at(token)
      const timelockFounders1 = await crowdsaleContract.timelockFounders1.call()
      const timelockFounders2 = await crowdsaleContract.timelockFounders2.call()
      timelockFounders1Contract = await TokenTimelock.at(timelockFounders1)
      timelockFounders2Contract = await TokenTimelock.at(timelockFounders2)
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
      assert.isNotNull(timelockFounders1Contract)
      assert.isNotNull(timelockFounders2Contract)
    })

    it('created the Refund Vault', () => {
      assert.isNotNull(vaultContract)
    })

    it('distributed the initial token amounts correctly', async () => {
      // Get allocation wallet addresses
      const foundationPool = await crowdsaleContract.FOUNDATION_POOL_ADDR.call()
      const legalExpensesWallet = await crowdsaleContract.LEGAL_EXPENSES_ADDR.call()
      const foundersPool = await crowdsaleContract.FOUNDERS_POOL_ADDR.call()
      const timelockFounders1Address = await crowdsaleContract.timelockFounders1.call()
      const timelockFounders2Address = await crowdsaleContract.timelockFounders2.call()

      // Get expected token amounts from contract config
      const expectedFoundationTokens = await crowdsaleContract.FOUNDATION_POOL_TOKENS.call()
      const expectedLegalTokens = await crowdsaleContract.LEGAL_EXPENSES_TOKENS.call()
      const expectedFoundersTokens = await crowdsaleContract.FOUNDERS_TOKENS.call()
      const expectedtimelockFounders1Tokens = await crowdsaleContract.FOUNDERS_TOKENS_VESTED_1.call()
      const expectedtimelockFounders2Tokens = await crowdsaleContract.FOUNDERS_TOKENS_VESTED_2.call()

      // Get actual balances
      const foundationBalance = await tokenContract.balanceOf.call(foundationPool)
      const legalBalance = await tokenContract.balanceOf.call(legalExpensesWallet)
      const foundersBalance = await tokenContract.balanceOf.call(foundersPool)
      const timelockFounders1Balance = await tokenContract.balanceOf.call(timelockFounders1Address)
      const timelockFounders2Balance = await tokenContract.balanceOf.call(timelockFounders2Address)

      // Check allocation was done as expected
      assert.equal(foundationBalance, Number(expectedFoundationTokens))
      assert.equal(legalBalance, Number(expectedLegalTokens))
      assert.equal(foundersBalance, Number(expectedFoundersTokens))
      assert.equal(timelockFounders1Balance, Number(expectedtimelockFounders1Tokens))
      assert.equal(timelockFounders2Balance, Number(expectedtimelockFounders2Tokens))
    })

    it('receives ETH to buy tokens that get transferred to another address', async () => {
      const sendAmount = web3.toWei(2, 'ether')
      const vaultInitialBalance = await vaultContract.deposited.call(buyer)
      const rate = await crowdsaleContract.rate.call()

      // send ETH to crowdsale contract for buying KEY
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      const lockedBalance = await crowdsaleContract.lockedBalance.call(buyer)
      assert.equal(Number(lockedBalance), sendAmount * rate)

      // Check wei added to the vault is correct
      const vaultNewBalance = await vaultContract.deposited.call(buyer)
      assert.equal(vaultNewBalance - vaultInitialBalance, sendAmount)

      // verify KYC for buyer and check tokens were transferred to the buyer
      await crowdsaleContract.verifyKYC(buyer)
      const newBalance = await tokenContract.balanceOf.call(buyer)
      assert.equal(Number(newBalance), sendAmount * rate)

      // Check tokens are not yet transferrable until crowdsale is finalized
      await assertThrows(tokenContract.transfer(receiver, 5, { from: buyer }))
    })

    it('allows refund for KYC-failed participants', async () => {
      const sendAmount = web3.toWei(1, 'ether')

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

    it('does not allow contributions below minimum cap per purchaser', async () => {
      const purchaseMinCap = await crowdsaleContract.minCapWei.call()
      const sendAmount = Number(purchaseMinCap) - SIGNIFICANT_AMOUNT
      assertThrows(crowdsaleContract.sendTransaction({ from: buyer3, value: sendAmount }))
    })

    it('does not allow contributions above maximum cap per purchaser', async () => {
      const purchaseMaxCap = await crowdsaleContract.maxCapWei.call()
      const sendAmount = Number(purchaseMaxCap) + SIGNIFICANT_AMOUNT
      assertThrows(crowdsaleContract.sendTransaction({ from: buyer3, value: sendAmount }))
    })

    it('does not allow updating ETH price if sale has already started', () => {
      assertThrows(crowdsaleContract.setEthPrice(999))
    })

    it('can finalize token sale', async () => {
      const sendAmount = web3.toWei(1, 'ether')

      // Sale has not been finalised yet
      await assertThrows(tokenContract.transfer(receiver, sendAmount, { from: buyer }))
      const receiverBalance = await tokenContract.balanceOf.call(receiver)
      assert.equal(receiverBalance.toNumber(), 0)

      // now finalise it.
      await crowdsaleContract.finalize()
      const contractBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)
      // check unsold tokens were effectively burned
      assert.equal(contractBalance, 0)
    })

    it('enables token transfers after finalization', async () => {
      const sendAmount = web3.toWei(1, 'ether')
      const swapAmount = 500000

      // test transfer method
      await tokenContract.transfer(receiver, sendAmount, { from: buyer })
      const newBalance = await tokenContract.balanceOf.call(receiver)
      assert.equal(sendAmount, newBalance)

      // test transferFrom method
      await tokenContract.approve(buyer2, swapAmount * 2, { from: buyer })
      const balance1before = await tokenContract.balanceOf.call(buyer)
      const balance2before = await tokenContract.balanceOf.call(buyer2)
      await tokenContract.transferFrom(buyer, buyer2, swapAmount, { from: buyer2 })
      const balance1after = await tokenContract.balanceOf.call(buyer)
      const balance2after = await tokenContract.balanceOf.call(buyer2)
      assert.equal(balance1before.minus(balance1after), swapAmount)
      assert.equal(balance2after.minus(balance2before), swapAmount)
    })
  })

  context('Crowdsale whose goal hasn\'t been reached', () => {
    const hugeGoal = 950000000000000000000000000
    const sendAmount = web3.toWei(3, 'ether')

    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        hugeGoal
      )
      const token = await crowdsaleContract.token.call()
      tokenContract = await SelfKeyToken.at(token)
      const timelockFounders1 = await crowdsaleContract.timelockFounders1.call()
      const timelockFounders2 = await crowdsaleContract.timelockFounders2.call()
      timelockFounders1Contract = await TokenTimelock.at(timelockFounders1)
      timelockFounders2Contract = await TokenTimelock.at(timelockFounders2)
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

  context('Crowdsale with pending KYC cases at finalization time', () => {
    let preBalance1
    let preBalance2

    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        goal
      )

      const token = await crowdsaleContract.token.call()
      const sendAmount = web3.toWei(3, 'ether')
      tokenContract = await SelfKeyToken.at(token)

      // Purchase tokens from 3 different buyers
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      await crowdsaleContract.sendTransaction({ from: buyer2, value: sendAmount })
      await crowdsaleContract.sendTransaction({ from: buyer3, value: sendAmount })

      preBalance1 = web3.eth.getBalance(buyer2)
      preBalance2 = web3.eth.getBalance(buyer3)

      // Verify 1 buyer only
      await crowdsaleContract.verifyKYC(buyer)
      let verified = await crowdsaleContract.kycVerified.call(buyer)
      assert.isTrue(verified)
    })

    it('should not allow refund before finalization', async () => {
      await assertThrows(crowdsaleContract.claimRefund({ from: buyer2 }))
    })

    it('should allow finalization, with pending KYC cases cleared', async () => {
      let lockedBalance = await crowdsaleContract.lockedBalance.call(buyer2)
      let lockedBalance2 = await crowdsaleContract.lockedBalance.call(buyer3)

      assert.isAbove(lockedBalance, 0)
      assert.isAbove(lockedBalance2, 0)

      await crowdsaleContract.finalize()
      let finalized = await crowdsaleContract.isFinalized.call()
      assert.isTrue(finalized)
    })

    it('should have cleared all locked balances (addresses pending for verification)', async () => {
      lockedBalance = await crowdsaleContract.lockedBalance.call(buyer2)
      lockedBalance2 = await crowdsaleContract.lockedBalance.call(buyer3)

      assert.equal(lockedBalance, 0)
      assert.equal(lockedBalance2, 0)
    })

    it('does not allow finalize to be re-invoked', async () => {
      await assertThrows(crowdsaleContract.finalize())
    })

    it('should enable refunds for unverified participants', async () => {
      await crowdsaleContract.claimRefund({ from: buyer2 })
      await crowdsaleContract.claimRefund({ from: buyer3 })

      const afterBalance1 = web3.eth.getBalance(buyer2)
      const afterBalance2 = web3.eth.getBalance(buyer3)

      assert.isAbove(Number(afterBalance1), Number(preBalance1))
      assert.isAbove(Number(afterBalance2), Number(preBalance2))
    })

    it('should allow the release of locked tokens for the founders', async () => {
      const sixMonths = 15552000
      const foundersPool = await crowdsaleContract.FOUNDERS_POOL_ADDR.call()
      const expectedRelease1 = await crowdsaleContract.FOUNDERS_TOKENS_VESTED_1.call();
      const expectedRelease2 = await crowdsaleContract.FOUNDERS_TOKENS_VESTED_2.call();

      // forward time 6 months
      await timeTravel(sixMonths)

      // test first timelock release
      const foundersBalance1 = await tokenContract.balanceOf(foundersPool)
      await crowdsaleContract.releaseLockFounders1()
      const foundersBalance2 = await tokenContract.balanceOf(foundersPool)
      assert.equal(Number(foundersBalance2), Number(foundersBalance1) + Number(expectedRelease1))

      // forward time an additional 6 months
      await timeTravel(sixMonths)

      // test second timelock release
      await crowdsaleContract.releaseLockFounders2()
      const foundersBalance3 = await tokenContract.balanceOf(foundersPool)
      assert.equal(Number(foundersBalance3), Number(foundersBalance2) + Number(expectedRelease2))
    })
  })
})
