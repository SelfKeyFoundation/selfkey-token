const SelfKeyAirdrop = artifacts.require('./SelfKeyAirdrop.sol')

module.exports = deployer => {
  const tokenAddress = ''

  deployer.deploy(SelfKeyAirdrop, tokenAddress)
}
