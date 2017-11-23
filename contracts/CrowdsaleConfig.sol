pragma solidity ^0.4.18;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    uint256 private constant TOKEN_DECIMALS = 18;
    uint256 private constant QUINTILLION = 10 ** uint256(TOKEN_DECIMALS);

    // Initial distribution amounts
    uint256 public constant TOTAL_SUPPLY_CAP = 9999999000 * QUINTILLION;

    // approx 26.4% of the sale cap
    uint256 public constant PRESALE_CAP = 2639999736 * QUINTILLION;

    // approx 33%
    uint256 public constant SALE_CAP = 3299999670 * QUINTILLION;

    // approx. $100 in wei
    uint256 public constant PURCHASE_MIN_CAP_WEI = 333333333000000000;

    // approx. $15,000 in wei, per contributor
    uint256 public constant PURCHASE_MAX_CAP_WEI = 50000000000000000000;

    // approx 49.5%
    uint256 public constant FOUNDATION_POOL_TOKENS = 4949999505 * QUINTILLION;

    // 1%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 99999990 * QUINTILLION;

    // 16.5%
    uint256 public constant FOUNDERS_TOKENS_VESTED = 1649999835 * QUINTILLION;
}
