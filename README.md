# SelfKey Token (`KEY`)

The SelfKey Token, aka `KEY` is an [ERC20 Token](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) for use within the [SelfKey Foundation](https://selfkey.org)'s distributed KYC platform.

<!-- For more info on Selfkey, check the [whitepaper](). -->

## Development

### Requirements

* [Truffle](http://truffleframework.com/) — a comprehensive framework for Ethereum development.
* [testrpc](https://github.com/ethereumjs/testrpc) — for quick local testing.
* [geth](https://github.com/ethereum/go-ethereum) — for local testnet/private or live network testing.

### Deploying contracts on a private network

The following files are needed. These can be found in the `scripts` folder:

* `genesis.json`
* `start-node2.sh`

Open `start-node2.sh` file and edit `GETH` and `DATADIR` paths. These should be the paths to your Geth installation and directory path where you want to install the private chain data respectively.

### Starting `geth`

Follow these steps to start a local `geth` node:

1. Run `geth --datadir <your datadir path> init genesis.json`
2. Run `. start-node2.sh`

Your node should be running now. This will also open the `geth` console. Press "Enter" and you should see a "`>`" character prompt. Initializing the node (`geth init`) only needs to be done once.

In the `geth` console run: `net.peerCount`. If you see more than `0` everything is running correctly and you can go to next step. if you have problems connecting to other nodes then execute the following command:

```
admin.addPeer("enode://dc776fad97f0266add4d8a6762cf3eab9f6c8614b158089f76c4ae6a19e9563dccdd853aa86ed7a69157bcd730ff418732be42acb39cd0f5dcf79b3c6e6a10a7@54.255.217.250:30303?discport=0")
```

Block synchronization messages should be displayed on the console. This means our local node is connected to the network and it can be verified by running `net.peerCount`. It should be now greater than `0`.

Open a new terminal window and execute:

```
geth attach ipc:/<DATADIR PATH>/geth.ipc
```

This will open a second console for interacting with the Ethereum node in order to execute commands as needed. First, we should create an account if no accounts have been created yet:

```
> personal.newAccount('password')
```

Then verify this account is set as the default (coinbase) account:
```
> personal.listAccounts
> web3.eth.coinbase
```

Unlock the coinbase account for transacting on the network:
```
> personal.unlockAccount(web3.eth.coinbase, "password", 0)
```

Enough ETH should be on the default account to be able to transact on the network. Local node should be put to "mining" for a while until enough funds are available. From the attached console, execute:

```
> miner.start()
```

From the first terminal we started geth on, we should see a [DAG](https://github.com/ethereum/wiki/wiki/Ethash-DAG) being generated, then blocks will start to get mined.

After some time successfully mining blocks, we can stop our miner and check our balance.

```
> miner.stop()
> web3.fromWei(eth.getBalance(eth.coinbase), "ether")
```

If enough `ETH` has been mined to pay for transactions and the default account has been unlocked, contract deployment should be possible via [Truffle](http://truffleframework.com/).

Navigate to the `ethereum` directory within the project and execute the `migrate` command:

```
truffle migrate
```

To run the tests:

```
Sending ether to the contract from geth console:

> eth.sendTransaction({from:eth.coinbase, to:eth.contractAddress, value: web3.toWei(0.5, "ether")})
```

If everything went alright, we should be able to start the truffle console and interact with the contracts:

```
truffle console

> web3.eth.accounts
```

Sending ether to the contract from geth console:

```
> eth.sendTransaction({from:eth.coinbase, to:contractAddress, value: web3.toWei(0.05, "ether")})
```
