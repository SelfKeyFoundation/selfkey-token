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

    // Minimum cap per purchaser on public sale = $50 in KEY (at $0.015)
    uint256 public constant PURCHASER_MIN_TOKEN_CAP = 3333 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on public sale = $18,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP = 1200000 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on first day of public sale = $3,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP_DAY1 = 200000 * MIN_TOKEN_UNIT;

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

    // Contract wallet addresses for initial allocation
    address public constant CROWDSALE_WALLET_ADDR = 0xd061bc63e751B0B878d36a45D97F8B9E08984674;
    address public constant FOUNDATION_POOL_ADDR = 0x15EB4FB06db8827fb82eF6DB1039e9cf88be867b;
    address public constant FOUNDERS_POOL_ADDR = 0x65a57dEa007Dc8767cB2E27357c58c4334092d09;
    address public constant LEGAL_EXPENSES_ADDR = 0x2e24aD707BeCAf1911A54E779f5CEB331F1c57aC;

    // some pre-sale purchasers have their tokens half-vested for a period of 6 months
    uint64 public constant PRECOMMITMENT_VESTING_SECONDS = 15552000;
}
