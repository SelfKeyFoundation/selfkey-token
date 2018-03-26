const fs = require('fs')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

const hdWallet = (walletPath = './wallet.json') => {
  try {
    const { mnemonic } = JSON.parse(fs.readFileSync(walletPath))
    const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))
    const walletHdPath = "m/44'/60'/0'/0/"

    // Get the first account using the standard hd path.
    const getWallet = count =>
      hdwallet.derivePath(`${walletHdPath}${count}`).getWallet()
    const wallets = [getWallet(0)]

    return wallets
  } catch (err) {
    console.log('Caught error provisioning HD wallet: ', err.message) // no-console
    return []
  }
}

module.exports = hdWallet
