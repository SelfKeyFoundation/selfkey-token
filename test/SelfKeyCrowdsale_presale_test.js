const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const assertThrows = require('./utils/assertThrows')
const { goal } = require('./utils/common')

contract('SelfKeyCrowdsale (Pre-sale)', (accounts) => {
  const YEAR_IN_SECONDS = 31622400
  const now = (new Date()).getTime() / 1000
  const start = now + YEAR_IN_SECONDS
  const end = start + YEAR_IN_SECONDS

  const [buyer3, buyer2, buyer] = accounts.slice(3)

  let presaleCrowdsale
  let presaleToken

  before(async () => {
    presaleCrowdsale = await SelfKeyCrowdsale.new(
      start,
      end,
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
    // const balance1 = await presaleToken.balanceOf.call(buyer3)

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

  it('does not allow any contributions before start time', async () => {
    const sendAmount = web3.toWei(1, 'ether')
    await presaleCrowdsale.verifyKYC(buyer)
    await assertThrows(presaleCrowdsale.sendTransaction({ from: buyer, value: sendAmount }))
  })

  it('allows the updating of public sale conversion rate before sale starts', async () => {
    // const rate1 = await presaleCrowdsale.rate.call()
    const newEthPrice = 800

    // Set new ETH price and get related attributes
    await presaleCrowdsale.setEthPrice(newEthPrice)
    const rate2 = await presaleCrowdsale.rate.call()
    const keyPrice = await presaleCrowdsale.TOKEN_PRICE_THOUSANDTH.call()

    // Calculate rates and caps to compare
    const expectedRate = parseInt((newEthPrice * 1000) / keyPrice, 10)

    assert.equal(expectedRate, rate2)
  })

  it('does not allow to set an ETH price equal to zero', async () => {
    assertThrows(presaleCrowdsale.setEthPrice(0))
  })

  it('does not release the founders\' locked tokens too soon', async () => {
    await assertThrows(presaleCrowdsale.releaseLockFounders1())
  })

  it('does not allow locked token releasing to an empty address', async () => {
    await assertThrows(presaleCrowdsale.releaseLock(0x0))
  })

  it('does not allow end date to be earlier or the same than start date', async () => {
    await assertThrows(SelfKeyCrowdsale.new(
      start,
      start,
      goal
    ))
  })
})
