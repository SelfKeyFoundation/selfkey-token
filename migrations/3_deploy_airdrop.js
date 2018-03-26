const SelfKeyAirdrop = artifacts.require('./SelfKeyAirdrop.sol')

module.exports = deployer => {
  const tokenAddress = '0x4cc19356f2d37338b9802aa8e8fc58b0373296e7'

  deployer.deploy(SelfKeyAirdrop, tokenAddress)
}
