pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

/**
 * @title SelfKeyToken
 * @dev SelfKey Token implementation.
*/
contract SelfKeyToken is MintableToken {
    string public constant name = "SelfKey";
    string public constant symbol = "KEY";
    uint256 public constant decimals = 18;

    uint256 public cap;

    //mapping(address => bool) public kycRequired;
    //bool public transfersEnabled = false;

    /**
    * @dev Constructor that gives msg.sender all of existing tokens.
    */
    function SelfKeyToken(uint256 _cap) {
        cap = _cap;
    }

    /**
    * @dev Overrides MintableToken.mint() for retstricting supply under cap
    */
    function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
        require(totalSupply.add(_amount) <= cap);
        return super.mint(_to, _amount);
    }

    /**
    * @dev Overrides BasicToken.transfer for adding KYC check
    */
    function transfer(address _to, uint256 _value) public returns (bool) {
        //require(transfersEnabled);
        //require(!kycRequired[msg.sender]);
        return super.transfer(_to, _value);
    }

    /**
    * @dev Overrides StandardToken.transferFrom for adding KYC check
    */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        //require(transfersEnabled);
        //require(!kycRequired[msg.sender]);
        return super.transferFrom(_from, _to, _value);
    }

    /**
    * @dev Set a given participant as required for KYC check (locks all token transfers)
    * only the owner (crowdsale contract) can call it
    */
    /*function setKycRequired(address participant) onlyOwner public {
        kycRequired[participant] = true;
    }*/

    /**
    * @dev Set a given participant as not required for KYC check (locks all token transfers)
    * only the owner (crowdsale contract) can call it
    */
    /*function unsetKycRequired(address participant) onlyOwner public {
        kycRequired[participant] = false;
    }*/

    /**
    * @dev Enable transfers. Should be called at the end of the crowdsale.
    * Transfers are initially disabled by default.
    */
    /*function enableTransfers() onlyOwner public {
        transfersEnabled = true;
    }*/
}
