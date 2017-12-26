pragma solidity ^0.4.18;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    uint256 public constant TOKEN_DECIMALS = 18;
    uint256 public constant MIN_TOKEN_UNIT = 10 ** uint256(TOKEN_DECIMALS);

    // Initial distribution amounts
    uint256 public constant TOTAL_SUPPLY_CAP = 6000000000 * MIN_TOKEN_UNIT;

    // 33% of the total supply cap
    uint256 public constant SALE_CAP = 1980000000 * MIN_TOKEN_UNIT;

    // Minimum cap per purchaser on public sale = $100
    uint256 public constant PURCHASER_MIN_CAP_USD = 100;

    // Maximum cap per purchaser on public sale = $5,000
    uint256 public constant PURCHASER_MAX_CAP_USD = 5000;

    // approx 49.5%
    uint256 public constant FOUNDATION_POOL_TOKENS = 2970000000 * MIN_TOKEN_UNIT;

    // 5.5% Not vested
    uint256 public constant FOUNDERS_TOKENS = 330000000 * MIN_TOKEN_UNIT;

    // 5.5% Timelocked for half a year
    uint256 public constant FOUNDERS_TOKENS_VESTED_1 = 330000000 * MIN_TOKEN_UNIT;

    // 5.5% Timelocked for a year
    uint256 public constant FOUNDERS_TOKENS_VESTED_2 = 330000000 * MIN_TOKEN_UNIT;

    // 1%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 60000000 * MIN_TOKEN_UNIT;

    // KEY price in USD (thousandths)
    uint256 public constant TOKEN_PRICE_THOUSANDTH = 15;  // $0.015 per KEY
}
