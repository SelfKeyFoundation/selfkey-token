pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './SelfKeyCrowdsale.sol';

/**
 * @title SelfKeyToken
 * @dev SelfKey Token implementation.
*/
contract SelfKeyToken is MintableToken{
    string public constant name = "SelfKey";
    string public constant symbol = "KEY";
    uint256 public constant decimals = 18;

    uint256 public cap;
    bool transfersEnabled = false;

    event Burn(address indexed burner, uint256 value);

    /**
    * @dev Checks whether it can transfer or otherwise throws.
    */
    modifier canTransfer(address _sender, uint256 _value) {
        // Only contract owner can transfer irrestrictedly, regular holders need to wait until sale is finalized
        require(transfersEnabled || _sender == this.owner());
        _;
    }

    /**
    * @dev Constructor that sets a maximum supply cap.
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
    * @dev Checks modifier and allows transfer if tokens are not locked.
    */
    function transfer(address _to, uint256 _value) canTransfer(msg.sender, _value) public returns (bool) {
        return super.transfer(_to, _value);
    }

    /**
    * @dev Checks modifier and allows transfer if tokens are not locked.
    */
    function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from, _value) public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    /**
    * @dev Enable token transfers. This is intended to be called when token sale is successfully finalized
    */
    function enableTransfers() onlyOwner public {
        transfersEnabled = true;
    }

    /**
    * @dev Burns a specific amount of tokens.
    * @param _value The amount of token to be burned.
    */
    function burn(uint256 _value) onlyOwner public {
        require(_value > 0);

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply = totalSupply.sub(_value);
        Burn(burner, _value);
    }
}
