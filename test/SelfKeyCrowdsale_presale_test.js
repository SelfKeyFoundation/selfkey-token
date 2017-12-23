const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const assertThrows = require('./utils/assertThrows')
const { rate, presaleRate, goal } = require('./utils/common')

contract('SelfKeyCrowdsale (Pre-sale)', (accounts) => {
  const YEAR_IN_SECONDS = 31622400
  const now = (new Date()).getTime() / 1000
  const start = now + YEAR_IN_SECONDS
  const end = start + YEAR_IN_SECONDS

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
  it("adds 'pre-commitments' for off-chain contributions, no vesting", async () => {
    const allocation = web3.toWei(5, 'ether')   // allocates 5 KEY
    const balance1 = await presaleToken.balanceOf.call(buyer2)

    // test non-timelocked pre-commitment
    await presaleCrowdsale.addPrecommitment(buyer2, allocation, false)
    const balance2 = await presaleToken.balanceOf.call(buyer2)
    assert.equal(balance2 - balance1, allocation)
  })

  it("adds 'pre-commitments' with vesting", async () => {
    const allocation = web3.toWei(10, 'ether')    // allocates 10 KEY
    const balance1 = await presaleToken.balanceOf.call(buyer3)

    // test (half)timelocked pre-commitment
    await presaleCrowdsale.addPrecommitment(buyer3, allocation, true)
    const balance2 = await presaleToken.balanceOf.call(buyer3)

    // check half tokens are immediately transferred to participant's wallet
    assert.equal(Number(balance2), allocation / 2)

    // check the other half is sent to the time-lock
    const timelockAddress = await presaleCrowdsale.vestedTokens.call(buyer3)
    const vestedBalance = await presaleToken.balanceOf.call(timelockAddress)
    assert.equal(vestedBalance, allocation - (allocation / 2))

    // test failure on premature release of tokens
    await assertThrows(presaleCrowdsale.releaseLock(buyer3))
  })

  // Public pre-sale
  it('receives ETH and allocate due tokens for kyc-verified addresses', async () => {
    const sendAmount = web3.toWei(1, 'ether')
    // Participant is not KYC verified yet
    await assertThrows(presaleCrowdsale.sendTransaction({
      from: buyer,
      value: sendAmount,
      gas: 999999
    }))

    // now verify them.
    await presaleCrowdsale.verifyKYC(buyer)
    await presaleCrowdsale.sendTransaction({ from: buyer, value: sendAmount })
    const balance = await presaleToken.balanceOf.call(buyer)
    assert.equal(Number(balance), presaleRate * sendAmount)
  })

  it('does not release the founders\' locked tokens too soon', async () => {
    await assertThrows(presaleCrowdsale.releaseLockFounders())
  })

  it('does not allow locked token releasing to an empty address', async () => {
    await assertThrows(presaleCrowdsale.releaseLock(0x0))
  })

  it('does not allow end date to be earlier or the same than start date', async () => {
    await assertThrows(SelfKeyCrowdsale.new(
      start,
      start,
      rate,
      presaleRate,
      wallet,
      foundationPool,
      foundersPool,
      legalExpensesWallet,
      goal
    ))
  })

  it('does not allow rate to be 0', async () => {
    await assertThrows(SelfKeyCrowdsale.new(
      start,
      end,
      0,
      presaleRate,
      wallet,
      foundationPool,
      foundersPool,
      legalExpensesWallet,
      goal
    ))
  })

  it('does not allow empty wallet address', async () => {
    await assertThrows(SelfKeyCrowdsale.new(
      start,
      end,
      rate,
      presaleRate,
      0x0,
      foundationPool,
      foundersPool,
      legalExpensesWallet,
      goal
    ))
  })
})
