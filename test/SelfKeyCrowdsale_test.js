const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')
const TokenTimelock = artifacts.require('zeppelin-solidity/contracts/token/TokenTimelock.sol')
const RefundVault = artifacts.require('zeppelin-solidity/contracts/crowdsale/RefundVault.sol')

const assertThrows = require('./utils/assertThrows')
const timeTravel = require('./utils/timeTravel')
const { goal } = require('./utils/common')


contract('SelfKeyCrowdsale', (accounts) => {
  const now = (new Date()).getTime() / 1000
  const start = now
  const end = start + 1296000   // 15 days after start

  const SIGNIFICANT_AMOUNT = 2048

  const [buyer, buyer2, buyer3, buyer4, buyer5, receiver, middleman] = accounts.slice(1)

  let crowdsaleContract
  let tokenContract
  let founders1Timelock1
  let founders1Timelock2
  let founders2Timelock
  let legalExpensesTimelock
  let vaultContract

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
      const founders1Timelock1Address = await crowdsaleContract.founders1Timelock1.call()
      const founders1Timelock2Address = await crowdsaleContract.founders1Timelock2.call()
      const founders2TimelockAddress = await crowdsaleContract.founders2Timelock.call()
      const legalExpensesTimelockAddress = await crowdsaleContract.legalExpensesTimelock.call()

      founders1Timelock1 = await TokenTimelock.at(founders1Timelock1Address)
      founders1Timelock2 = await TokenTimelock.at(founders1Timelock2Address)
      founders2Timelock = await TokenTimelock.at(founders2TimelockAddress)
      legalExpensesTimelock = await TokenTimelock.at(legalExpensesTimelockAddress)

      const vaultAddress = await crowdsaleContract.vault.call()
      vaultContract = await RefundVault.at(vaultAddress)
    })

    it('deployed with the right owner', async () => {
      assert.isNotNull(crowdsaleContract)
      assert.isNotNull(tokenContract)
      const owner = await tokenContract.owner.call()
      assert.equal(owner, crowdsaleContract.address)
    })

    it('allows refunds', async () => {
      // Purchase equivalent of <sendAmount> in tokens
      const REFUNDING = 1
      const sender = buyer

      await crowdsaleContract.verifyKYC(sender)
      await crowdsaleContract.sendTransaction({ from: sender, value: sendAmount })

      // check no refund can be claimed before finalization
      await assertThrows(crowdsaleContract.claimRefund(sender))

      // finalize sale and check it was not successful
      await crowdsaleContract.finalize()
      const goalReached = await crowdsaleContract.goalReached.call()
      assert.isFalse(goalReached)
      const vaultState = await vaultContract.state.call()
      assert.equal(vaultState, REFUNDING)

      // issue refund
      const balance1 = web3.eth.getBalance(sender)
      await crowdsaleContract.claimRefund(sender)
      const balance2 = web3.eth.getBalance(sender)

      // check buyer balance increases
      assert.isAbove(Number(balance2), Number(balance1))
    })
  })

  context('Regular Crowdsale', () => {
    before(async () => {
      crowdsaleContract = await SelfKeyCrowdsale.new(
        start,
        end,
        goal
      )
      const token = await crowdsaleContract.token.call()
      tokenContract = await SelfKeyToken.at(token)

      const founders1Timelock1Address = await crowdsaleContract.founders1Timelock1.call()
      const founders1Timelock2Address = await crowdsaleContract.founders1Timelock2.call()
      const founders2TimelockAddress = await crowdsaleContract.founders2Timelock.call()
      const legalExpensesTimelockAddress = await crowdsaleContract.legalExpensesTimelock.call()

      founders1Timelock1 = await TokenTimelock.at(founders1Timelock1Address)
      founders1Timelock2 = await TokenTimelock.at(founders1Timelock2Address)
      founders2Timelock = await TokenTimelock.at(founders2TimelockAddress)
      legalExpensesTimelock = await TokenTimelock.at(legalExpensesTimelockAddress)

      const vaultAddress = await crowdsaleContract.vault.call()
      vaultContract = await RefundVault.at(vaultAddress)
    })

    it('deploys and instantiates all derived contracts', async () => {
      assert.isNotNull(crowdsaleContract)
      assert.isNotNull(tokenContract)
      assert.isNotNull(vaultContract)
      assert.isNotNull(founders1Timelock1)
      assert.isNotNull(founders1Timelock2)
      assert.isNotNull(founders2Timelock)
      assert.isNotNull(legalExpensesTimelock)

      // check token contract owner is the crowdsale contract
      const owner = await tokenContract.owner.call()
      assert.equal(owner, crowdsaleContract.address)
    })

    it('distributed the initial token amounts correctly', async () => {
      // Get allocation wallet addresses
      const foundationPool = await crowdsaleContract.FOUNDATION_POOL_ADDR.call()
      const legalExpenses1Address = await crowdsaleContract.LEGAL_EXPENSES_ADDR_1.call()
      const legalExpenses2Address = await crowdsaleContract.LEGAL_EXPENSES_ADDR_2.call()
      const foundersPool = await crowdsaleContract.FOUNDERS_POOL_ADDR_1.call()
      const founders1Timelock1Address = await crowdsaleContract.founders1Timelock1.call()
      const founders1Timelock2Address = await crowdsaleContract.founders1Timelock2.call()
      const founders2TimelockAddress = await crowdsaleContract.founders2Timelock.call()
      const legalExpenses1TimelockAddress = await crowdsaleContract.legalExpensesTimelock.call()

      // Get expected token amounts from contract config
      const expectedFoundationTokens = await crowdsaleContract.FOUNDATION_POOL_TOKENS.call()
      const expectedLegal1Tokens = await crowdsaleContract.LEGAL_EXPENSES_1_TOKENS.call()
      const expectedLegal2Tokens = await crowdsaleContract.LEGAL_EXPENSES_2_TOKENS.call()
      const expectedFoundersTokens = await crowdsaleContract.FOUNDERS1_TOKENS.call()

      const expectedFounders1Vested1 = await crowdsaleContract.FOUNDERS1_TOKENS_VESTED_1.call()
      const expectedFounders1Vested2 = await crowdsaleContract.FOUNDERS1_TOKENS_VESTED_2.call()
      const expectedFounders2Vested = await crowdsaleContract.FOUNDERS2_TOKENS_VESTED.call()
      const expectedLegal1Vested = await crowdsaleContract.LEGAL_EXPENSES_1_TOKENS_VESTED.call()

      // Get actual balances
      const foundationBalance = await tokenContract.balanceOf.call(foundationPool)
      const legal1Balance = await tokenContract.balanceOf.call(legalExpenses1Address)
      const legal2Balance = await tokenContract.balanceOf.call(legalExpenses2Address)
      const foundersBalance = await tokenContract.balanceOf.call(foundersPool)

      const founders1vested1Balance1 = await tokenContract.balanceOf.call(founders1Timelock1Address)
      const founders1vestedBalance2 = await tokenContract.balanceOf.call(founders1Timelock2Address)
      const founders2vestedBalance = await tokenContract.balanceOf.call(founders2TimelockAddress)
      const legal1VestedBalance = await tokenContract.balanceOf.call(legalExpenses1TimelockAddress)

      // Check allocation was done as expected
      assert.equal(Number(foundationBalance), Number(expectedFoundationTokens))
      assert.equal(Number(legal1Balance), Number(expectedLegal1Tokens))
      assert.equal(Number(legal2Balance), Number(expectedLegal2Tokens))
      assert.equal(Number(foundersBalance), Number(expectedFoundersTokens))

      assert.equal(Number(founders1vested1Balance1), Number(expectedFounders1Vested1))
      assert.equal(Number(founders1vestedBalance2), Number(expectedFounders1Vested2))
      assert.equal(Number(founders2vestedBalance), Number(expectedFounders2Vested))
      assert.equal(Number(legal1VestedBalance), Number(expectedLegal1Vested))
    })

    it('allows KYC verification of participant address', async () => {
      // check address is initially unverified
      const sender = buyer

      let verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isFalse(verified)

      // verify KYC status for buyer address
      await crowdsaleContract.verifyKYC(sender)

      // check the address is now verified
      verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isTrue(verified)
    })

    it('does not allow purchase for unverified participants', async () => {
      const sender = buyer2
      const sendAmount = web3.toWei(2, 'ether')

      // attempt sending ETH from an unverified address
      const verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isFalse(verified)
      await assertThrows(crowdsaleContract.sendTransaction({ from: sender, value: sendAmount }))
    })

    it('allows token purchases for verified participants', async () => {
      const sender = buyer3

      const vaultInitialBalance = await vaultContract.deposited.call(sender)
      const rate = await crowdsaleContract.rate.call()

      // verify buyer address
      await crowdsaleContract.verifyKYC(sender)
      const verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isTrue(verified)

      // send ETH to the contract to purchase tokens
      const sendAmount = web3.toWei(2, 'ether')
      await crowdsaleContract.sendTransaction({ from: sender, value: sendAmount })
      const buyerBalance = await tokenContract.balanceOf.call(sender)

      // check allocated amount corresponds to the set exchange rate according to ETH price
      assert.equal(Number(buyerBalance), sendAmount * rate)

      // Check wei added to the vault is correct
      const vaultNewBalance = await vaultContract.deposited.call(sender)
      assert.equal(Number(vaultNewBalance) - Number(vaultInitialBalance), sendAmount)
    })

    it('does not allow contributions below minimum cap per purchaser', async () => {
      const sender = buyer4

      const minTokenCap = await crowdsaleContract.PURCHASER_MIN_TOKEN_CAP.call()
      const rate = await crowdsaleContract.rate.call()
      const minWei = Number(minTokenCap) / Number(rate)
      const sendAmount = minWei - SIGNIFICANT_AMOUNT

      // verify new purchaser
      await crowdsaleContract.verifyKYC(sender)
      const verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isTrue(verified)

      // check below cap transaction fails
      await assertThrows(crowdsaleContract.sendTransaction({ from: sender, value: sendAmount }))
    })

    it('does allow contributions above minimum purchaser cap', async () => {
      const sender = buyer4

      const minTokenCap = await crowdsaleContract.PURCHASER_MIN_TOKEN_CAP.call()
      const rate = await crowdsaleContract.rate.call()
      const minWei = Number(minTokenCap) / Number(rate)
      const sendAmount = minWei + SIGNIFICANT_AMOUNT
      const balance1 = await tokenContract.balanceOf(sender)

      await crowdsaleContract.sendTransaction({ from: sender, value: sendAmount })
      const balance2 = await tokenContract.balanceOf(sender)
      assert.isAbove(Number(balance2), Number(balance1))
    })

    it('does not allow contributions above $3000 per purchaser on day 1', async () => {
      const sender = buyer4

      const maxTokenCap = await crowdsaleContract.PURCHASER_MAX_TOKEN_CAP_DAY1.call()
      const rate = await crowdsaleContract.rate.call()
      const maxWei = Number(maxTokenCap) / Number(rate)
      const sendAmount = maxWei

      await assertThrows(crowdsaleContract.sendTransaction({ from: sender, value: sendAmount }))
    })

    it('allows contributions above $3000 after day 1', async () => {
      const sender = buyer4

      timeTravel(86400)   // fast forward 1 day

      const maxTokenCap = await crowdsaleContract.PURCHASER_MAX_TOKEN_CAP_DAY1.call()
      const rate = await crowdsaleContract.rate.call()
      const maxWei = Number(maxTokenCap) / Number(rate)
      const sendAmount = maxWei + SIGNIFICANT_AMOUNT
      const balance1 = await tokenContract.balanceOf(sender)

      await crowdsaleContract.sendTransaction({ from: sender, value: sendAmount })
      const balance2 = await tokenContract.balanceOf(sender)
      assert.isAbove(Number(balance2), Number(balance1))
    })

    it('does not allow contributions above $18000 after day 1', async () => {
      const sender = buyer5

      const maxTokenCap = await crowdsaleContract.PURCHASER_MAX_TOKEN_CAP.call()
      const rate = await crowdsaleContract.rate.call()
      const maxWei = Number(maxTokenCap) / Number(rate)
      let sendAmount = maxWei + SIGNIFICANT_AMOUNT

      // verify new purchaser
      await crowdsaleContract.verifyKYC(sender)
      const verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isTrue(verified)

      // check transaction fails because purchase is above cap
      await assertThrows(crowdsaleContract.sendTransaction({ from: sender, value: sendAmount }))

      // check participant can still purchase slightly above the max cap
      sendAmount = maxWei - SIGNIFICANT_AMOUNT
      const balance1 = await tokenContract.balanceOf(sender)
      crowdsaleContract.sendTransaction({ from: sender, value: sendAmount })
      const balance2 = await tokenContract.balanceOf(sender)
      assert.isAbove(Number(balance2), Number(balance1))
    })

    it('does not allow updating ETH price if sale has already started', () => {
      assertThrows(crowdsaleContract.setEthPrice(999))
    })

    it('does not allow contributions after end date', async () => {
      const sender = buyer

      // fast forwards until crowdsale end time
      const untilEnd = end - now
      timeTravel(untilEnd)

      // check buyer is verified
      const verified = await crowdsaleContract.kycVerified.call(sender)
      assert.isTrue(verified)

      // check transaction fails
      const sendAmount = web3.toWei(1, 'ether')
      await assertThrows(crowdsaleContract.sendTransaction({ from: sender, value: sendAmount }))
    })

    it('does not allow token transfers before crowdsale is finalized', async () => {
      const sender = buyer3
      const sendAmount = 5

      // check participant has enough token funds
      const balance =  await tokenContract.balanceOf.call(sender)
      assert.isAtLeast(Number(balance), sendAmount)

      // Tokens are not yet transferrable because sale has not been finalized
      await assertThrows(tokenContract.transfer(receiver, sendAmount, { from: sender }))
    })

    it('can finalize token sale successfully', async () => {
      const crowdsaleWallet = await crowdsaleContract.CROWDSALE_WALLET_ADDR.call()
      const vaultBalance = web3.eth.getBalance(vaultContract.address)
      const walletBalance1 = web3.eth.getBalance(crowdsaleWallet)

      // finalize token sale
      await crowdsaleContract.finalize()
      const walletBalance2 = web3.eth.getBalance(crowdsaleWallet)
      const vaultBalance2 = web3.eth.getBalance(vaultContract.address)
      const contractTokenBalance = await tokenContract.balanceOf.call(crowdsaleContract.address)

      // check unsold tokens were effectively burned
      assert.equal(contractTokenBalance, 0)

      // check all ETH was effectively transferred to the crowdsale wallet
      assert.equal(vaultBalance2, 0)
      assert.equal(Number(walletBalance2), Number(walletBalance1) + Number(vaultBalance))
    })

    it('does not allow finalize to be re-invoked', async () => {
      await assertThrows(crowdsaleContract.finalize())
    })

    it('enables token transfers after finalization', async () => {
      const sender = buyer3
      const sendAmount = 9        // KEY

      // check sender has enough tokens
      const senderBalance = await tokenContract.balanceOf(sender)
      assert.isAtLeast(senderBalance, sendAmount)

      // test transfer method
      let receiverBalance1 = await tokenContract.balanceOf.call(receiver)
      await tokenContract.transfer(receiver, sendAmount, { from: sender })
      let receiverBalance2 = await tokenContract.balanceOf.call(receiver)
      assert.equal(Number(receiverBalance2) - Number(receiverBalance1), sendAmount)

      // approve a middleman to make transfer on behalf of sender
      await tokenContract.approve(middleman, sendAmount, { from: sender })
      const senderBalance1 = await tokenContract.balanceOf.call(sender)
      receiverBalance1 = await tokenContract.balanceOf.call(receiver)

      // test unsuccessful transferFrom invocation (above the approved amount)
      await assertThrows(tokenContract.transferFrom(
        sender,
        receiver,
        sendAmount + 1,
        { from: middleman }
      ))  // function-paren-newline

      // test successful transferFrom invocation
      await tokenContract.transferFrom(sender, receiver, sendAmount, { from: middleman })
      const senderBalance2 = await tokenContract.balanceOf.call(sender)
      receiverBalance2 = await tokenContract.balanceOf.call(receiver)

      assert.equal(senderBalance1.minus(senderBalance2), sendAmount)
      assert.equal(receiverBalance2.minus(receiverBalance1), sendAmount)
    })

    it('should allow the release of locked tokens for founders and legal advisors', async () => {
      const sixMonths = 15552000
      const foundersPool = await crowdsaleContract.FOUNDERS_POOL_ADDR_1.call()
      const foundersPool2 = await crowdsaleContract.FOUNDERS_POOL_ADDR_2.call()
      const legalPool = await crowdsaleContract.LEGAL_EXPENSES_ADDR_1.call()
      const founder1expected1 = await crowdsaleContract.FOUNDERS1_TOKENS_VESTED_1.call()
      const founder1expected2 = await crowdsaleContract.FOUNDERS1_TOKENS_VESTED_2.call()
      const founder2expected = await crowdsaleContract.FOUNDERS2_TOKENS_VESTED.call()
      const legalExpected = await crowdsaleContract.LEGAL_EXPENSES_1_TOKENS_VESTED.call()

      // forward time 6 months
      await timeTravel(sixMonths)

      // test first timelock release
      const founder1Balance1 = await tokenContract.balanceOf(foundersPool)
      await crowdsaleContract.releaseFirstLockFounders1()
      const founder1Balance2 = await tokenContract.balanceOf(foundersPool)
      assert.equal(Number(founder1Balance2), Number(founder1Balance1) + Number(founder1expected1))

      // forward time an additional 6 months
      await timeTravel(sixMonths)

      // test second timelock release
      await crowdsaleContract.releaseSecondLockFounders1()
      const founder1Balance3 = await tokenContract.balanceOf(foundersPool)
      assert.equal(Number(founder1Balance3), Number(founder1Balance2) + Number(founder1expected2))

      // check for second founders' address release
      const founder2Balance1 = await tokenContract.balanceOf(foundersPool2)
      await crowdsaleContract.releaseLockFounders2()
      const founder2Balance2 = await tokenContract.balanceOf(foundersPool2)
      assert.equal(Number(founder2Balance2), Number(founder2Balance1) + Number(founder2expected))

      // check for legal expenses vested release
      const legalBalance1 = await tokenContract.balanceOf(legalPool)
      await crowdsaleContract.releaseLockLegalExpenses()
      const legalBalance2 = await tokenContract.balanceOf(legalPool)
      assert.equal(Number(legalBalance2), Number(legalBalance1) + Number(legalExpected))
    })
  })
})
