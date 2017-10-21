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
}
