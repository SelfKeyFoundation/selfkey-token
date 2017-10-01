pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

/**
 * @title SelfKeyToken
 * @dev SelfKey Token implementation.
*/
contract SelfKeyToken is MintableToken {
    string public constant NAME = "SelfKey";
    string public constant SYMBOL = "KEY";
    uint8 public constant DECIMALS = 18;

    uint256 public constant TOTAL_SUPPLY_CAP = 99000000000 * (10 ** uint256(DECIMALS));

    /**
    * @dev Constructor that gives msg.sender all of existing tokens.
    */
    function SelfKeyToken() {
        //mint(msg.sender, TOTAL_SUPPLY_CAP);     // Transfers all tokens to the Crowdsale contract
    }
}
