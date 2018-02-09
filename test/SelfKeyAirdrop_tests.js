const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')
const SelfKeyAirdrop = artifacts.require('./SelfKeyAirdrop.sol')

const assertThrows = require('./utils/assertThrows')

contract('Airdrop contract', accounts => {
  const YEAR_IN_SECONDS = 31622400
  const now = new Date().getTime() / 1000
  const start = now
  const end = start + YEAR_IN_SECONDS
  const goal = 1

  const [
    buyer,
    buyer2,
    notVerified,
    airdropper,
    airdropper2,
    notOwner
  ] = accounts.slice(3)

  let crowdsaleContract
  let airdropContract
  let tokenContract

  before(async () => {
    // deploy crowdsale contract
    crowdsaleContract = await SelfKeyCrowdsale.new(start, end, goal)

    const tokenAddress = await crowdsaleContract.token.call()
    tokenContract = await SelfKeyToken.at(tokenAddress)

    // run small crowdsale
    // verify buyer and let it make a purchase
    let sendAmount = web3.toWei(2, 'ether')
    await crowdsaleContract.verifyKYC(buyer)
    await crowdsaleContract.verifyKYC(buyer2)
    const isVerified = await crowdsaleContract.kycVerified.call(buyer)
    const isVerified2 = await crowdsaleContract.kycVerified.call(buyer2)

    assert.isTrue(isVerified)
    assert.isTrue(isVerified2)

    await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
    await crowdsaleContract.sendTransaction({ from: buyer2, value: sendAmount })

    // finalize crowdsale
    await crowdsaleContract.finalize()
    const finalized = await crowdsaleContract.isFinalized.call()
    assert.isTrue(finalized)

    // deploy airdrop contract
    airdropContract = await SelfKeyAirdrop.new(
      crowdsaleContract.address,
      tokenContract.address
    )
    assert.isNotNull(airdropContract)

    // send tokens to the airdrop Contract
    sendAmount = web3.toWei(1000, 'ether')
    await tokenContract.transfer(airdropContract.address, sendAmount, {
      from: buyer2
    })
    const airdropBalance = await tokenContract.balanceOf.call(
      airdropContract.address
    )
    assert.equal(airdropBalance.toNumber(), sendAmount)
  })

  it('allows adding new airdropper', async () => {
    // check it's not an airdropper yet
    let isAirdropper = await airdropContract.isAirdropper.call(airdropper)
    assert.isFalse(isAirdropper)

    // add an airdropper
    await airdropContract.addAirdropper(airdropper)
    isAirdropper = await airdropContract.isAirdropper.call(airdropper)
    assert.isTrue(isAirdropper)

    // add another airdropper
    await airdropContract.addAirdropper(airdropper2)
    isAirdropper = await airdropContract.isAirdropper.call(airdropper2)
    assert.isTrue(isAirdropper)
  })

  it('does not allow adding nor removing airdroppers by a non-owner', async () => {
    await assertThrows(airdropContract.addAirdropper(buyer, { from: notOwner }))
    await assertThrows(
      airdropContract.removeAirdropper(airdropper2, { from: notOwner })
    )
  })

  it('allows removing an airdropper', async () => {
    // check address is an airdropper
    let isAirdropper = await airdropContract.isAirdropper.call(airdropper2)
    assert.isTrue(isAirdropper)

    await airdropContract.removeAirdropper(airdropper2)
    isAirdropper = await airdropContract.isAirdropper.call(airdropper2)
    assert.isFalse(isAirdropper)
  })

  it('allows airdropping to a verified address', async () => {
    const initialBuyerBalance = await tokenContract.balanceOf.call(buyer)
    const initialAirdropBalance = await tokenContract.balanceOf.call(
      airdropContract.address
    )
    const airdropAmount = await airdropContract.airdropAmount.call()
    const airdropCount = await airdropContract.airdropCount.call()
    await airdropContract.airdrop(buyer, { from: airdropper })
    const laterBuyerBalance = await tokenContract.balanceOf.call(buyer)
    const laterAirdropBalance = await tokenContract.balanceOf.call(
      airdropContract.address
    )
    const airdropCount2 = await airdropContract.airdropCount.call()

    assert.equal(
      laterBuyerBalance.toNumber(),
      initialBuyerBalance.toNumber() + airdropAmount.toNumber()
    )
    assert.equal(
      laterAirdropBalance.toNumber(),
      initialAirdropBalance.toNumber() - airdropAmount.toNumber()
    )
    assert.equal(airdropCount2.toNumber(), airdropCount.toNumber() + 1)
  })

  it('does not allow airdropping more than once to the same address', async () => {
    const airdropped = await airdropContract.airdropped.call(buyer)
    assert.isTrue(airdropped)
    await assertThrows(airdropContract.airdrop(buyer, { from: airdropper }))
  })

  it('does not allow airdropping to a non-verified address', async () =>
    assertThrows(airdropContract.airdrop(notVerified, { from: airdropper })))

  it('does not allow airdropping by a non-whitelisted address', async () =>
    assertThrows(airdropContract.airdrop(buyer2, { from: buyer })))

  it('allows withdrawal of tokens by the owner', async () => {
    const withdrawAmount = 100
    const initialOwnerBalance = await tokenContract.balanceOf(accounts[0])
    await airdropContract.withdrawTokens(withdrawAmount)
    const laterOwnerBalance = await tokenContract.balanceOf(accounts[0])

    assert.equal(
      laterOwnerBalance.toNumber(),
      initialOwnerBalance.toNumber() + withdrawAmount
    )
  })

  it('does not allow withdrawal of tokens by a non-owner', async () =>
    assertThrows(airdropContract.withdrawTokens(100, { from: notOwner })))

  it('does not allow setting airdrop amount of 0', async () =>
    assertThrows(airdropContract.setAirdropAmount(0)))

  it('allows setting a token amount by the owner', async () => {
    const newAmount = 1000
    await airdropContract.setAirdropAmount(newAmount)
    const airdropAmount = await airdropContract.airdropAmount.call()
    assert.equal(airdropAmount.toNumber(), newAmount)
  })

  it('does not allow setting token amount by a non-owner', async () => {
    await assertThrows(
      airdropContract.setAirdropAmount(900, { from: notOwner })
    )
  })
})
