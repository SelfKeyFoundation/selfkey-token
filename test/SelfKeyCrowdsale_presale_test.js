const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const assertThrows = require('./utils/assertThrows')
const { goal } = require('./utils/common')

contract('SelfKeyCrowdsale (Pre-sale)', accounts => {
  const YEAR_IN_SECONDS = 31622400
  const now = new Date().getTime() / 1000
  const start = now + YEAR_IN_SECONDS
  const end = start + YEAR_IN_SECONDS

  const [
    buyer3,
    buyer2,
    buyer,
    verifier,
    verifier2,
    notVerifier,
    notOwner
  ] = accounts.slice(3)

  let presaleCrowdsale
  let presaleToken

  before(async () => {
    presaleCrowdsale = await SelfKeyCrowdsale.new(start, end, goal)
    const token = await presaleCrowdsale.token.call()
    presaleToken = await SelfKeyToken.at(token)
  })

  it('does not allow end date to be earlier or the same than start date', async () => {
    await assertThrows(SelfKeyCrowdsale.new(start, start, goal))
  })

  it('deploys successfully in pre-sale mode', async () => {
    assert.isNotNull(presaleCrowdsale)
    assert.isNotNull(presaleToken)

    // verify owner is effectively added as a verifier
    const ownerIsVerifier = await presaleCrowdsale.isVerifier.call(accounts[0])
    assert.isTrue(ownerIsVerifier)
  })

  it('does not allow precommitments or verification calls from not verifiers', async () => {
    const isVerifier = await presaleCrowdsale.isVerifier.call(notVerifier)
    assert.isFalse(isVerifier)

    await assertThrows(
      presaleCrowdsale.addPrecommitment(buyer, 999, false, {
        from: notVerifier
      })
    )
    await assertThrows(presaleCrowdsale.verifyKYC(buyer, { from: notVerifier }))
  })

  it('allows adding new verifiers', async () => {
    // add verifier
    await presaleCrowdsale.addVerifier(verifier)
    let isVerifier = await presaleCrowdsale.isVerifier.call(verifier)
    assert.isTrue(isVerifier)

    // add another verifier
    await presaleCrowdsale.addVerifier(verifier2)
    isVerifier = await presaleCrowdsale.isVerifier.call(verifier2)
    assert.isTrue(isVerifier)
  })

  it('allows removal of verifiers', async () => {
    let isVerifier = await presaleCrowdsale.isVerifier.call(verifier2)
    assert.isTrue(isVerifier)

    await presaleCrowdsale.removeVerifier(verifier2)
    isVerifier = await presaleCrowdsale.isVerifier.call(verifier2)
    assert.isFalse(isVerifier)
  })

  it('does not allow adding or removal of verifier by anyone other than the owner', async () => {
    await assertThrows(presaleCrowdsale.addVerifier(buyer, { from: notOwner }))
    await assertThrows(
      presaleCrowdsale.removeVerifier(verifier, { from: notOwner })
    )
  })

  // Offchain purchases
  it("adds 'pre-commitments' for off-chain contributions, no vesting", async () => {
    const allocation = web3.toWei(5, 'ether') // allocates 5 KEY
    const balance1 = await presaleToken.balanceOf.call(buyer2)

    // test non-timelocked pre-commitment
    await presaleCrowdsale.addPrecommitment(buyer2, allocation, false, {
      from: verifier
    })
    const balance2 = await presaleToken.balanceOf.call(buyer2)
    assert.equal(balance2 - balance1, allocation)
  })

  it("adds 'pre-commitments' with vesting", async () => {
    const allocation = web3.toWei(10, 'ether') // allocates 10 KEY
    // const balance1 = await presaleToken.balanceOf.call(buyer3)

    // test (half)timelocked pre-commitment
    await presaleCrowdsale.addPrecommitment(buyer3, allocation, true, {
      from: verifier
    })
    const balance2 = await presaleToken.balanceOf.call(buyer3)

    // check half tokens are immediately transferred to participant's wallet
    assert.equal(balance2.toNumber(), allocation / 2)

    // check the other half is sent to the time-lock
    const timelockAddress = await presaleCrowdsale.vestedTokens.call(buyer3)
    const vestedBalance = await presaleToken.balanceOf.call(timelockAddress)
    assert.equal(vestedBalance, allocation - allocation / 2)

    // test failure on premature release of tokens
    await assertThrows(presaleCrowdsale.releaseLock(buyer3))
  })

  it('adds vested tokens to already existing vested pre-sale participant', async () => {
    const sender = buyer3

    const allocation = web3.toWei(10, 'ether') // allocates 10 KEY
    const timelockAddress = await presaleCrowdsale.vestedTokens.call(sender)
    assert.notEqual(timelockAddress, 0x0)
    const vestedBalance1 = await presaleToken.balanceOf.call(timelockAddress)
    assert.isAbove(vestedBalance1.toNumber(), 0)

    // test vested pre-commitment
    const balance1 = await presaleToken.balanceOf.call(sender)
    await presaleCrowdsale.addPrecommitment(sender, allocation, true)
    const balance2 = await presaleToken.balanceOf.call(sender)

    // check half tokens are immediately transferred to participant's wallet
    assert.equal(balance2.toNumber() - balance1.toNumber(), allocation / 2)

    // check the other half is sent to the time-lock
    const vestedBalance2 = await presaleToken.balanceOf.call(timelockAddress)
    assert.isAbove(vestedBalance2.toNumber(), vestedBalance1.toNumber())

    // test failure on premature release of tokens
    await assertThrows(presaleCrowdsale.releaseLock(sender))
  })

  it('does not allow any contributions before start time', async () => {
    const sender = buyer

    const sendAmount = web3.toWei(1, 'ether')
    await presaleCrowdsale.verifyKYC(sender)
    await assertThrows(
      presaleCrowdsale.sendTransaction({ from: sender, value: sendAmount })
    )
  })

  it('allows the updating of ETH price before sale starts', async () => {
    // const rate1 = await presaleCrowdsale.rate.call()
    const newEthPrice = 800

    // Set new ETH price and get related attributes
    await presaleCrowdsale.setEthPrice(newEthPrice)
    const rate2 = await presaleCrowdsale.rate.call()
    const keyPrice = await presaleCrowdsale.TOKEN_PRICE_THOUSANDTH.call()

    // Calculate rates and caps to compare
    const expectedRate = parseInt(newEthPrice * 1000 / keyPrice, 10)

    assert.equal(expectedRate, rate2)
  })

  it('does not allow to set an ETH price equal to zero or negative number', async () => {
    assertThrows(presaleCrowdsale.setEthPrice(0))
    assertThrows(presaleCrowdsale.setEthPrice(-999))
  })

  it("does not release the founders' locked tokens too soon", async () => {
    await assertThrows(presaleCrowdsale.releaseLockFounders1())
    await assertThrows(presaleCrowdsale.releaseLockFounders2())
    await assertThrows(presaleCrowdsale.releaseLockFoundation())
  })

  it('can change the start date if sale has not started', async () => {
    const additionalTime = 9
    const beforeStart = await presaleCrowdsale.startTime.call()
    await presaleCrowdsale.setStartTime(beforeStart.toNumber() + additionalTime)
    const laterStart = await presaleCrowdsale.startTime.call()
    assert.equal(laterStart.toNumber(), beforeStart.toNumber() + additionalTime)

    await assertThrows(presaleCrowdsale.setStartTime(now - 999))
    await assertThrows(presaleCrowdsale.setStartTime(end + 1))
  })
})
