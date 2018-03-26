# SelfKey Token

[![Greenkeeper badge](https://badges.greenkeeper.io/SelfKeyFoundation/selfkey-token.svg)](https://greenkeeper.io/)

An `ERC20` token used to fuel a wide range of KYC related dapps

* `develop` [![Build Status](https://travis-ci.org/SelfKeyFoundation/selfkey-token.svg?branch=develop)](https://travis-ci.org/SelfKeyFoundation/selfkey-token) [![codecov](https://codecov.io/gh/SelfKeyFoundation/selfkey-token/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/selfkey-token)
* `master` [![Build Status](https://travis-ci.org/SelfKeyFoundation/selfkey-token.svg?branch=master)](https://travis-ci.org/SelfKeyFoundation/selfkey-token) [![codecov](https://codecov.io/gh/SelfKeyFoundation/selfkey-token/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/selfkey-token)

## About

* See [selfkey.io](https://selfkey.io) for more details.

## Development

The smart contracts are being implemented in Solidity `0.4.19`.

### Prerequisites

* [NodeJS](htps://nodejs.org), version 9+ (I use [`nvm`](https://github.com/creationix/nvm) to manage Node versions — `brew install nvm`.)
* [truffle](http://truffleframework.com/), which is a comprehensive framework for Ethereum development. `npm install -g truffle` — this should install Truffle v4.0.6 or better.  Check that with `truffle version`.
* [Access to the KYC_Chain Jira](https://kyc-chain.atlassian.net)

#### Optional but very useful

* [Docker](https://docs.docker.com/docker-for-mac/install/) (don't `brew install docker` as it's nowhere near as relaible. Use the official Docker For Mac installer.)
* [ethereum-docker](https://github.com/Capgemini-AIE/ethereum-docker) — run geth and any monitoring tools within docker using `docker-compose up -d`

### Initialisation

        npm install

### Compiling

#### From within Truffle

Run the `truffle` development environment

    truffle develop

then from the prompt you can run

    compile
    migrate
    test

as well as other truffle commands. See [truffleframework.com](http://truffleframework.com) for more.

#### Standalone

Run

    npm test

To generate code coverage reports run

    npm run test:cov

*Note* Generating code coverage reports takes a bit longer to run than just running the tests.

### Linting

We provide the following linting options

* `npm run lint:sol` — to lint the solidity files, and
* `npm run lint:js` — to lint the javascript.

### Deploying to `ropsten`

You'll need an address on the Ropsten blockchain with some ETH in it.

Use [MetaMask](https://metamask.io) to create a wallet and use [faucet.metamask.io](https://faucet.metamask.io/) to get some ETH for it.

You will need to supply a file called `wallet.json` in the root of the project.

    {
      "name": "my awesome wallet",
      "mnemonic": "the sequence of twelve words you used to keep your wallet secure"
    }

Then run

    npm run deploy:ropsten

## Contributing

Contributions are welcomed.  Please see [the contributing notes](CONTRIBUTING.md)
