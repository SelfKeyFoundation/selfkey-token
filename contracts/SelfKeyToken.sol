pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './SelfKeyCrowdsale.sol';


/**
 * @title SelfKeyToken
 * @dev SelfKey Token implementation.
 */
contract SelfKeyToken is MintableToken {
    string public constant name = 'SelfKey'; //solhint-disable-line const-name-snakecase
    string public constant symbol = 'KEY'; //solhint-disable-line const-name-snakecase
    uint256 public constant decimals = 18; //solhint-disable-line const-name-snakecase

    uint256 public cap;
    bool private transfersEnabled = false;

    event Burned(address indexed burner, uint256 value);

    /**
     * @dev Only the contract owner can transfer without restrictions.
     *      Regular holders need to wait until sale is finalized.
     * @param _sender — The address sending the tokens
     * @param _value — The number of tokens to send
     */
    modifier canTransfer(address _sender, uint256 _value) {
        require(transfersEnabled || _sender == owner);
        _;
    }

    /**
     * @dev Constructor that sets a maximum supply cap.
     * @param _cap — The maximum supply cap.
     */
    function SelfKeyToken(uint256 _cap) public {
        cap = _cap;
    }

    /**
     * @dev Overrides MintableToken.mint() for restricting supply under cap
     * @param _to — The address to receive minted tokens
     * @param _value — The number of tokens to mint
     */
    function mint(address _to, uint256 _value) public onlyOwner canMint returns (bool) {
        require(totalSupply_.add(_value) <= cap);
        return super.mint(_to, _value);
    }

    /**
     * @dev Checks modifier and allows transfer if tokens are not locked.
     * @param _to — The address to receive tokens
     * @param _value — The number of tokens to send
     */
    function transfer(address _to, uint256 _value)
        public canTransfer(msg.sender, _value) returns (bool)
    {
        return super.transfer(_to, _value);
    }

    /**
     * @dev Checks modifier and allows transfer if tokens are not locked.
     * @param _from — The address to send tokens from
     * @param _to — The address to receive tokens
     * @param _value — The number of tokens to send
     */
    function transferFrom(address _from, address _to, uint256 _value)
        public canTransfer(_from, _value) returns (bool)
    {
        return super.transferFrom(_from, _to, _value);
    }

    /**
     * @dev Enables token transfers.
     *      Called when the token sale is successfully finalized
     */
    function enableTransfers() public onlyOwner {
        transfersEnabled = true;
    }

    /**
    * @dev Burns a specific number of tokens.
    * @param _value — The number of tokens to be burned.
    */
    function burn(uint256 _value) public onlyOwner {
        require(_value > 0);

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        Burned(burner, _value);
    }
}
