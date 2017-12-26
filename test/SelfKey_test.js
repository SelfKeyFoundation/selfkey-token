const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const { goal } = require('./utils/common')

contract('SelfKeyToken', (accounts) => {
  const now = (new Date()).getTime() / 1000
  const start = now
  const end = start + 31622400 // 1 year from start

  const [
    legalExpensesWallet,
    foundersPool,
    foundationPool,
    wallet
  ] = accounts.slice(6)

  const [buyer, buyer2] = accounts.slice(1)

  let crowdsaleContract
  let tokenContract
  let owner

  before(async () => {
    crowdsaleContract = await SelfKeyCrowdsale.new(
      start,
      end,
      wallet,
      foundationPool,
      foundersPool,
      legalExpensesWallet,
      goal
    )
    const token = await crowdsaleContract.token.call()
    tokenContract = await SelfKeyToken.at(token)
    owner = await tokenContract.owner.call()
  })

  context('transferFrom', () => {
    const sendAmount = web3.toWei(2, 'ether')
    const swapAmount = 500000

    before(async () => {
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      await crowdsaleContract.verifyKYC(buyer)
      await crowdsaleContract.verifyKYC(buyer2)
      await crowdsaleContract.finalize()
      await tokenContract.approve(buyer2, swapAmount * 2, { from: buyer })
    })

    it('transfers just fine', async () => {
      const balance1before = await tokenContract.balanceOf.call(buyer)
      const balance2before = await tokenContract.balanceOf.call(buyer2)
      await tokenContract.transferFrom(buyer, buyer2, swapAmount, { from: buyer2 })
      const balance1after = await tokenContract.balanceOf.call(buyer)
      const balance2after = await tokenContract.balanceOf.call(buyer2)
      assert.equal(balance1before.minus(balance1after), swapAmount)
      assert.equal(balance2after.minus(balance2before), swapAmount)
    })
  })
})
