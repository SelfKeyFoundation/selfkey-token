const SelfKeyCrowdsale = artifacts.require('./SelfKeyCrowdsale.sol')

module.exports = (deployer) => {
  // Test dates. Change to real dates before launch

  const startTime = 1515888000    // 14 Jan 2018 00:00:00 UTC
  const endTime = 1517443200      // 1 Feb 2018 00:00:00 UTC
  const goal = 166666666666666667000000000   // approx. $2,500,000 in KEY

  deployer.deploy(
    SelfKeyCrowdsale,
    startTime,
    endTime,
    goal
  )
}
