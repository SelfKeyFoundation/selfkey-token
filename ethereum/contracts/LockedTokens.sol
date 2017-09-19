pragma solidity ^0.4.11;

// ----------------------------------------------------------------------------
// SelfKey Token crowdfunding - Locked Tokens contract
// ----------------------------------------------------------------------------

import "./ERC20Interface.sol";
import "./SafeMath.sol";
import "./SelfKeyTokenConfig.sol";


// ----------------------------------------------------------------------------
// Contract that holds the locked token information
// ----------------------------------------------------------------------------
contract LockedTokens is SelfKeyTokenConfig {
    using SafeMath for uint;

    // ------------------------------------------------------------------------
    // Current separate totalSupply of locked tokens
    // ------------------------------------------------------------------------
    uint public totalSupplyLocked_1;
    uint public totalSupplyLocked_2;
    uint public totalSupplyLocked_3;
    uint public totalSupplyLocked_4;

    // ------------------------------------------------------------------------
    // Locked tokens mapping
    // ------------------------------------------------------------------------
    mapping (address => uint) public balancesLocked_1;
    mapping (address => uint) public balancesLocked_2;
    mapping (address => uint) public balancesLocked_3;
    mapping (address => uint) public balancesLocked_4;

    // ------------------------------------------------------------------------
    // Address of SelfKey crowdsale token contract
    // ------------------------------------------------------------------------
    ERC20Interface public tokenContract;


    // ------------------------------------------------------------------------
    // Constructor - called by crowdsale token contract
    // ------------------------------------------------------------------------
    function LockedTokens(address _tokenContract) {
        tokenContract = ERC20Interface(_tokenContract);

        // --- locked tokens ---

        //SelfKey Foundation
        add_locked_1(LOCK_ACC, TOKENS_LOCKED_TOTAL_1);
        add_locked_2(LOCK_ACC, TOKENS_LOCKED_TOTAL_2);
        add_locked_3(LOCK_ACC, TOKENS_LOCKED_TOTAL_3);
        add_locked_4(LOCK_ACC, TOKENS_LOCKED_TOTAL_4);

        // Confirm totals
        assert(totalSupplyLocked_1 == TOKENS_LOCKED_TOTAL_1);
        assert(totalSupplyLocked_2 == TOKENS_LOCKED_TOTAL_2);
        assert(totalSupplyLocked_3 == TOKENS_LOCKED_TOTAL_3);
        assert(totalSupplyLocked_4 == TOKENS_LOCKED_TOTAL_4);
    }


    // ------------------------------------------------------------------------
    // Add to 1st semester locked balances and totalSupply
    // ------------------------------------------------------------------------
    function add_locked_1(address account, uint value) private {
        balancesLocked_1[account] = balancesLocked_1[account].add(value);
        totalSupplyLocked_1 = totalSupplyLocked_1.add(value);
    }


    // ------------------------------------------------------------------------
    // Add to 2nd semester locked balances and totalSupply
    // ------------------------------------------------------------------------
    function add_locked_2(address account, uint value) private {
        balancesLocked_2[account] = balancesLocked_2[account].add(value);
        totalSupplyLocked_2 = totalSupplyLocked_2.add(value);
    }


    // ------------------------------------------------------------------------
    // Add to 3rd semester locked balances and totalSupply
    // ------------------------------------------------------------------------
    function add_locked_3(address account, uint value) private {
        balancesLocked_3[account] = balancesLocked_3[account].add(value);
        totalSupplyLocked_3 = totalSupplyLocked_3.add(value);
    }


    // ------------------------------------------------------------------------
    // Add to 4th semester locked balances and totalSupply
    // ------------------------------------------------------------------------
    function add_locked_4(address account, uint value) private {
        balancesLocked_4[account] = balancesLocked_4[account].add(value);
        totalSupplyLocked_4 = totalSupplyLocked_4.add(value);
    }


    // ------------------------------------------------------------------------
    // 1st semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_1(address account) constant returns (uint balance) {
        return balancesLocked_1[account];
    }


    // ------------------------------------------------------------------------
    // 2nd semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_2(address account) constant returns (uint balance) {
        return balancesLocked_2[account];
    }


    // ------------------------------------------------------------------------
    // 3rd semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_3(address account) constant returns (uint balance) {
        return balancesLocked_3[account];
    }


    // ------------------------------------------------------------------------
    // 4th semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_4(address account) constant returns (uint balance) {
        return balancesLocked_4[account];
    }


    // ------------------------------------------------------------------------
    // Total locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked(address account) constant returns (uint balance) {
        return balancesLocked_1[account].
            add(balancesLocked_2[account]).
            add(balancesLocked_3[account]).
            add(balancesLocked_4[account]);
    }


    // ------------------------------------------------------------------------
    // Locked tokens total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked() constant returns (uint) {
        return totalSupplyLocked_1.
          add(totalSupplyLocked_2).
          add(totalSupplyLocked_3).
          add(totalSupplyLocked_4);
    }


    // ------------------------------------------------------------------------
    // An account can unlock their locked tokens after the first 6 months
    // ------------------------------------------------------------------------
    function unlock_1() {
        require(now >= LOCKED_DATE_1);
        uint amount = balancesLocked_1[msg.sender];
        require(amount > 0);
        balancesLocked_1[msg.sender] = 0;
        totalSupplyLocked_1 = totalSupplyLocked_1.sub(amount);
        if (!tokenContract.transfer(msg.sender, amount)) revert();
    }



    // ------------------------------------------------------------------------
    // An account can unlock their locked tokens after the second 6 months
    // ------------------------------------------------------------------------
    function unlock_2() {
        require(now >= LOCKED_DATE_2);
        uint amount = balancesLocked_2[msg.sender];
        require(amount > 0);
        balancesLocked_2[msg.sender] = 0;
        totalSupplyLocked_2 = totalSupplyLocked_2.sub(amount);
        if (!tokenContract.transfer(msg.sender, amount)) revert();
    }



    // ------------------------------------------------------------------------
    // An account can unlock their locked tokens after the third 6 months
    // ------------------------------------------------------------------------
    function unlock_3() {
        require(now >= LOCKED_DATE_3);
        uint amount = balancesLocked_3[msg.sender];
        require(amount > 0);
        balancesLocked_3[msg.sender] = 0;
        totalSupplyLocked_3 = totalSupplyLocked_3.sub(amount);
        if (!tokenContract.transfer(msg.sender, amount)) revert();
    }



    // ------------------------------------------------------------------------
    // An account can unlock their locked tokens after the fourth 6 months
    // ------------------------------------------------------------------------
    function unlock_4() {
        require(now >= LOCKED_DATE_4);
        uint amount = balancesLocked_4[msg.sender];
        require(amount > 0);
        balancesLocked_4[msg.sender] = 0;
        totalSupplyLocked_4 = totalSupplyLocked_4.sub(amount);
        if (!tokenContract.transfer(msg.sender, amount)) revert();
    }
}
