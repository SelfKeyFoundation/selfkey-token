const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')

module.exports = (deployer, network, accounts) => {
  const now = new Date().getTime() / 1000
  const startTime = now + 172800 // Two days after current time
  // const startTime = 1507939200 // 14 October 2017 @ 12:00am (UTC)
  const endTime = startTime + 604800 // One week after startTime
  const rate = 20000 // approximately $0.015 per KEY
  const presaleRate = 30000 // approximately $0.01 per KEY
  const goal = 8333333333333000000000 // approximatelly $2.5Million in wei

  let foundationPool
  let foundersPool
  let wallet
  let legalExpensesWallet

  if (network === 'ropsten') {
    wallet = '0x9153Bb96E667424a62777fEF49aCE9bab658DC6D'
    foundationPool = '0x323989e34453e54c9E0b9f8fdE2645fdfe045d10'
    foundersPool = '0xa3D0937Efd8E37A5792f8060D6C1a1678c2082a5'
    legalExpensesWallet = '0x3B9c7A0e1EE3549F773F7bbC9c8f75e87E99AE24'
  } else {
    // wallet = accounts[9]
    // foundationPool = accounts[8]
    // foundersPool = accounts[7]
    // legalExpensesWallet = accounts[6]
    [legalExpensesWallet, foundersPool, foundationPool, wallet] = accounts.slice(6)
  }

  deployer.deploy(
    SelfKeyCrowdsale,
    startTime,
    endTime,
    rate,
    presaleRate,
    wallet,
    foundationPool,
    foundersPool,
    legalExpensesWallet,
    goal
  )
}
