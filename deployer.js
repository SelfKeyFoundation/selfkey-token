/* eslint-disable no-console */

const fs = require('fs')
const Web3 = require('web3')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')
const ProviderEngine = require('web3-provider-engine')
const Web3Subprovider = require('web3-provider-engine/subproviders/web3.js')
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js')

const deployer = (walletPath = './wallet.json', providerUrl) => {
  // Get our mnemonic and create an hdwallet
  try {
    const { mnemonic } = JSON.parse(fs.readFileSync(walletPath))
    const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))
    const walletHdPath = "m/44'/60'/0'/0/"

    const getWallet = count => hdwallet.derivePath(`${walletHdPath}${count}`).getWallet()
    const getAddress = wallet => `0x${wallet.getAddress().toString('hex')}`
    // Get the first account using the standard hd path.
    const wallets = [
      getWallet(0)
      // getWallet(1),
      // getWallet(2),
      // getWallet(3),
      // getWallet(4)
    ]

    const addresses = wallets.map(getAddress)

    addresses.forEach((address, i) => {
      console.log(`accounts ${i} = ${address}`)
    })

    const engine = new ProviderEngine()
    engine.addProvider(new WalletSubprovider(wallets[0], {}))
    engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(providerUrl)))
    engine.start() // Required by the provider engine.

    return { addresses, engine }
  } catch (err) {
    console.log('Caught error provisioning provider engine:', err.message)
    return { addresses: [], engine: null }
  }
}

module.exports = deployer
