pragma solidity ^0.4.15;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    // Initial distribution amounts
    uint256 public constant TOKEN_DECIMALS = 18;

    uint256 public constant TOTAL_SUPPLY_CAP = 9999999000 * (10 ** uint256(TOKEN_DECIMALS));

    uint256 public constant FOUNDATION_POOL_TOKENS = 3299999670 * (10 ** uint256(TOKEN_DECIMALS));   // 33%
    uint256 public constant TIMELOCK1_TOKENS = 3299999670 * (10 ** uint256(TOKEN_DECIMALS));         // 33%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 99999990 * (10 ** uint256(TOKEN_DECIMALS));      //  1%

    uint256 public constant PRESALE_CAP = 2639999736 * (10 ** uint256(TOKEN_DECIMALS));              // 80% of the sale cap
    uint256 public constant SALE_CAP = 3299999670 * (10 ** uint256(TOKEN_DECIMALS));                 // 33%
}
