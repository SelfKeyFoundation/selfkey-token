/* eslint-disable no-console */
const Web3 = require('web3')

const ProviderEngine = require('web3-provider-engine')
const Web3Subprovider = require('web3-provider-engine/subproviders/web3.js')
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js')

const web3Engine = (addresses, providerUrl) => {
  try {
    const engine = new ProviderEngine()
    engine.addProvider(new WalletSubprovider(addresses[0], {}))
    engine.addProvider(
      new Web3Subprovider(new Web3.providers.HttpProvider(providerUrl))
    )
    engine.start() // Required by the provider engine.

    return engine
  } catch (err) {
    console.log('Caught error provisioning provider engine:', err.message)
    return null
  }
}

module.exports = web3Engine
