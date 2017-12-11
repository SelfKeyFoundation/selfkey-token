const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')
const SelfKeyToken = artifacts.require('./SelfKeyToken.sol')

const { rate, presaleRate, goal } = require('./utils/common')

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
    owner = await tokenContract.owner.call()
  })

  context('transferFrom', () => {
    before(async () => {
      const sendAmount = web3.toWei(2, 'ether')
      await crowdsaleContract.verifyKYC(buyer)
      await crowdsaleContract.verifyKYC(buyer2)
      await crowdsaleContract.sendTransaction({ from: buyer, value: sendAmount })
      await tokenContract.enableTransfers.call({ from: owner })
      await tokenContract.approve.call(buyer2, 100, { from: buyer })
    })

    xit('transfers just fine', async () => {
      const balance1before = await tokenContract.balanceOf.call(buyer)
      const balance2before = await tokenContract.balanceOf.call(buyer2)
      await tokenContract.transferFrom.call(buyer, buyer2, 100, { from: buyer2 })
      const balance1after = await tokenContract.balanceOf.call(buyer)
      const balance2after = await tokenContract.balanceOf.call(buyer2)
      assert.equal(balance1before - balance1after, 1)
      assert.equal(balance2after - balance2before, 1)
    })
  })
})
