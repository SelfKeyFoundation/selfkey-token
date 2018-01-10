const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')

module.exports = (deployer) => {
  // Test dates. Change to real dates before launch

  const startTime = 1516406400    // 20 Jan 2018 00:00:00 UTC
  const endTime = 1517961600      // 7 Feb 2018 00:00:00 UTC
  const goal = 166666666666666667000000000   // approx. $2,500,000 in KEY

  deployer.deploy(
    SelfKeyCrowdsale,
    startTime,
    endTime,
    goal
  )
}
