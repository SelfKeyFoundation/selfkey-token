pragma solidity ^0.4.15;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    // Initial distribution amounts
    uint256 public constant TOKEN_DECIMALS = 18;
    uint256 public constant FOUNDATION_POOL_TOKENS = 3267000000 * (10 ** uint256(TOKEN_DECIMALS));   // 33%
    uint256 public constant TIMELOCK1_TOKENS = 3267000000 * (10 ** uint256(TOKEN_DECIMALS));         // 33%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 99000000 * (10 ** uint256(TOKEN_DECIMALS));      //  1%

    uint256 public constant PRESALE_CAP = 1320000000 * (10 ** uint256(TOKEN_DECIMALS));
}
