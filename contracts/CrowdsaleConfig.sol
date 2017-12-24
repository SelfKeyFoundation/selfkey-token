pragma solidity ^0.4.18;


/**
 * @title CrowdsaleConfig
 * @dev Holds all constants for SelfKeyCrowdsale contract
*/
contract CrowdsaleConfig {
    uint256 private constant TOKEN_DECIMALS = 18;
    uint256 private constant MIN_UNIT = 10 ** uint256(TOKEN_DECIMALS);

    // Initial distribution amounts
    uint256 public constant TOTAL_SUPPLY_CAP = 6000000000 * MIN_UNIT;

    // 33% of the total supply cap
    uint256 public constant SALE_CAP = 1980000000 * MIN_UNIT;

    // approx. $100 in wei at 1 ETH = $450
    uint256 public constant PURCHASE_MIN_CAP_WEI = 222222222000000000;

    // approx. $15,000 in wei, per contributor
    uint256 public constant PURCHASE_MAX_CAP_WEI = 33333333333000000000;

    // approx 49.5%
    uint256 public constant FOUNDATION_POOL_TOKENS = 2970000000 * MIN_UNIT;

    // 5.5% Not vested
    uint256 public constant FOUNDERS_TOKENS = 330000000 * MIN_UNIT;

    // 5.5% Timelocked for half a year
    uint256 public constant FOUNDERS_TOKENS_VESTED_1 = 330000000 * MIN_UNIT;

    // 5.5% Timelocked for a year
    uint256 public constant FOUNDERS_TOKENS_VESTED_2 = 330000000 * MIN_UNIT;

    // 1%
    uint256 public constant LEGAL_EXPENSES_TOKENS = 60000000 * MIN_UNIT;
}
