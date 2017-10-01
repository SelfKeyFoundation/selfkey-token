var fs = require ('fs');
var net = require('net')
var Web3 = require('web3');;

if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  // set the provider you want from Web3.providers
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  //web3 = new Web3('/home/carlos/work/dev/ethereum/geth_test/private/geth.ipc', net);
}

var contractAddress = "0xd6d757a025d6b117669a775072fca349c92b253a";
var contractFileName = "TokenOwner.json";
var contractSpecs = JSON.parse(fs.readFileSync("../build/contracts/" + contractFileName));
var abi = contractSpecs.abi;
var contract = new web3.eth.Contract(abi, contractAddress);

web3.eth.getAccounts((err, accounts) => {
  //var sendAmount = web3.toWei(1, "ether");
  web3.eth.sendTransaction({
    from: accounts[1],
    to: contractAddress,
    value: '1000000000000000000',
    gas: 500000
  }).then(function(result) {
    console.log(result);
    contract.methods.balanceOf(accounts[1]).call().then(function (value) {
      console.log("balanceOf = " + value);
    });
  });
});
//var events = contract.events.allEvents();

/*
contract.methods.finalised().call().then(function (result) {
  console.log("finalised = " + result)
});*/

//console.log("method object = " + JSON.stringify(contract.methods.finalise()._parent.options.address));
/*
contract.methods.finalise().send({from: user0, gas: 150000}).then(function (value) {
  console.log(value);
  contract.methods.finalised().call().then(function (result) {
    console.log("finalised = " + result)
  });
});*/

/*contract.getPastEvents(function (error, events) { console.log(events); }).then(function (events) {
    console.log(events) // same results as the optional callback above
});*/

/*
web3.eth.estimateGas({
  to: contract.methods.finalise()._parent.options.address,
}).then(function (value) {
  console.log("estimated gas = " + value);
});*/
/*
contract.methods.balanceOf(user3).call().then(function (value) {
  console.log("balanceOf (sender) = " + value);
});

contract.methods.balanceOf(user4).call().then(function (value) {
  console.log("balanceOf = (recipient) " + value);
});
*/

/*
web3.eth.getCoinbase().then(function (coinbase) {
  web3.eth.defaultAccount = coinbase;

  /*
  contract.methods.proxyPayment(coinbase).send({
    value: '10000000000000000000',
    from: coinbase
  }).then(function (result) {
    console.log("result = " + result);
    contract.methods.balanceOf(coinbase).call().then(function (value) {
      console.log("balanceOf = " + value);
    });
    contract.methods.balanceEth(coinbase).call().then(function (value) {
      console.log("balanceEth = " + value);
    });
  });
 */

  /*
  contract.methods.balanceOf(user).call().then(function (value) {
    console.log("balanceOf = " + value);
  });

  contract.methods.balanceEth(user).call().then(function (value) {
    console.log("balanceEth = " + value);
  });

}); */
