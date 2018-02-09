const SelfKeyAirdrop = artifacts.require('./SelfKeyAirdrop.sol')

module.exports = deployer => {
  const crowdsaleAddress = ''
  const tokenAddress = ''

  deployer.deploy(SelfKeyAirdrop, crowdsaleAddress, tokenAddress)
}
