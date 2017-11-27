const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const { rate, presaleRate, goal } = require('./utils/common')

contract('SelfKeyCrowdsale (Pre-sale)', (accounts) => {
  const now = (new Date()).getTime() / 1000
  const start = now + 31622400 // 1 year from now
  const end = start + 31622400 // 1 year from start

  const [
    legalExpensesWallet,
    foundersPool,
    foundationPool,
    wallet
  ] = accounts.slice(6)

  const [buyer3, buyer2, buyer] = accounts.slice(3)

  let presaleCrowdsale
  let presaleToken

  before(async () => {
    presaleCrowdsale = await SelfKeyCrowdsale.new(
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
    const token = await presaleCrowdsale.token.call()
    presaleToken = await SelfKeyToken.at(token)
  })

  it('can deploy in pre-sale mode', () => {
    assert.isNotNull(presaleCrowdsale)
    assert.isNotNull(presaleToken)
  })

  // Offchain purchases
  it("adds 'pre-commitments' for off-chain contributions with bonus, no vesting", async () => {
    const sendAmount = web3.toWei(1, 'ether')
    const bonusFactor = 70
    const value1 = await presaleCrowdsale.weiRaised.call()
    await presaleCrowdsale.addPrecommitment(buyer2, sendAmount, bonusFactor, 0)
    const value2 = await presaleCrowdsale.weiRaised.call()
    // Check contribution wei has been successfully registered in the crowdsale
    assert.equal(value2 - value1, sendAmount)
    // Check tokens have been allocated correctly
    const balance = await presaleToken.balanceOf.call(buyer2)
    const newRate = rate + (rate * (bonusFactor / 100))
    assert.equal(Number(balance), sendAmount * newRate)
  })

  it("adds 'pre-commitments' with vesting", async () => {
    const sendAmount = web3.toWei(1, 'ether')    // approx. $12M if 1 ETH = $300
    const bonusFactor = 50
    const vestingMonths = 3
    const value1 = await presaleCrowdsale.weiRaised.call()
    await presaleCrowdsale.addPrecommitment(buyer3, sendAmount, bonusFactor, vestingMonths)
    const value2 = await presaleCrowdsale.weiRaised.call()
    // check contribution wei has been successfully registered in the crowdsale
    assert.equal(value2 - value1, sendAmount)
    // check tokens have been allocated correctly
    const balance = await presaleToken.balanceOf.call(buyer3)
    const newRate = rate + (rate * (bonusFactor / 100))
    const tokensAllocated = sendAmount * newRate
    // check half tokens are immediately transferred to participant's wallet
    assert.equal(Number(balance), tokensAllocated / 2)
    const timelockAddress = await presaleCrowdsale.vestedTokens.call(buyer3)
    const vestedBalance = await presaleToken.balanceOf.call(timelockAddress)
    // check the other half is sent to the time-lock
    assert.equal(vestedBalance, tokensAllocated - (tokensAllocated / 2))
    // THE FOLLOWING SHOULD FAIL SINCE TOKENS ARE STILL LOCKED
    // return presaleCrowdsale.releaseLock(buyer3);
  })

  // Public pre-sale
  it('receives ETH and allocate due tokens for kyc-verified addresses', async () => {
    const sendAmount = web3.toWei(1, 'ether')
    const walletBalance = web3.eth.getBalance(wallet)
    // SHOULD FAIL AS PARTICIPANT IS NOT WHITELISTED (KYC-VERIFIED) YET
    // await presaleCrowdsale.sendTransaction({from: buyer, value: sendAmount, gas: 999999})
    await presaleCrowdsale.verifyKYC(buyer)
    await presaleCrowdsale.sendTransaction({ from: buyer, value: sendAmount })
    const balance = await presaleToken.balanceOf.call(buyer)
    assert.equal(Number(balance), presaleRate * sendAmount)
  })
})
