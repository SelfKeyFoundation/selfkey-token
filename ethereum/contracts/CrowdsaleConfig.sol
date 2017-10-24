pragma solidity ^0.4.15;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    // Initial distribution amounts
    uint256 public constant TOKEN_DECIMALS = 18;

    uint256 public constant TOTAL_SUPPLY_CAP = 9999999000 * (10 ** uint256(TOKEN_DECIMALS));
    uint256 public constant PRESALE_CAP = 2639999736 * (10 ** uint256(TOKEN_DECIMALS));              // 26.4% of the sale cap
    uint256 public constant SALE_CAP = 3299999670 * (10 ** uint256(TOKEN_DECIMALS));                 // 33%

    uint256 public constant SINGLE_PURCHASE_MIN_CAP = 333333333000000000;      // approx. $100 in wei
    uint256 public constant SINGLE_PURCHASE_MAX_CAP = 50000000000000000000;    // approx. $15,000 in wei, per contributor

    uint256 public constant FOUNDATION_POOL_TOKENS = 4949999505 * (10 ** uint256(TOKEN_DECIMALS));   // 49.5%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 99999990 * (10 ** uint256(TOKEN_DECIMALS));      //  1%

    // Timelocked tokens
    uint256 public constant FOUNDERS_TOKENS_VESTED = 1649999835 * (10 ** uint256(TOKEN_DECIMALS));   // 16.5%
}
