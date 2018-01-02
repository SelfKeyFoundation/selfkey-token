const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')

module.exports = (deployer) => {
  const now = new Date().getTime() / 1000

  // Test dates. Change to real dates before launch

  const startTime = now + 172800 // Two days after current time
  // const startTime = 1507939200 // 14 October 2017 @ 12:00am (UTC)
  const endTime = startTime + 604800 // One week after startTime
  const goal = 166666666000000000000000000 // approx. $2,500,000 in KEY

  deployer.deploy(
    SelfKeyCrowdsale,
    startTime,
    endTime,
    goal
  )
}
