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

    // Minimum cap per purchaser on public sale = $100 in KEY (at $0.015)
    uint256 public constant PURCHASER_MIN_TOKEN_CAP = 6666 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on first day of public sale = $3,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP_DAY1 = 200000 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on public sale = $18,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP = 1200000 * MIN_TOKEN_UNIT;

    // 16.5%
    uint256 public constant FOUNDATION_POOL_TOKENS = 876666666 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDATION_POOL_TOKENS_VESTED = 113333334 * MIN_TOKEN_UNIT;

    // Approx 33%
    uint256 public constant COMMUNITY_POOL_TOKENS = 1980000000 * MIN_TOKEN_UNIT;

    // Founders' distribution. Total = 16.5%
    uint256 public constant FOUNDERS_TOKENS = 330000000 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDERS_TOKENS_VESTED_1 = 330000000 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDERS_TOKENS_VESTED_2 = 330000000 * MIN_TOKEN_UNIT;

    // 1% for legal advisors
    uint256 public constant LEGAL_EXPENSES_1_TOKENS = 54000000 * MIN_TOKEN_UNIT;
    uint256 public constant LEGAL_EXPENSES_2_TOKENS = 6000000 * MIN_TOKEN_UNIT;

    // KEY price in USD (thousandths)
    uint256 public constant TOKEN_PRICE_THOUSANDTH = 15;  // $0.015 per KEY

    // Contract wallet addresses for initial allocation
    address public constant CROWDSALE_WALLET_ADDR = 0xE0831b1687c9faD3447a517F9371E66672505dB0;
    address public constant FOUNDATION_POOL_ADDR = 0xD68947892Ef4D94Cdef7165b109Cf6Cd3f58A8e8;
    address public constant COMMUNITY_POOL_ADDR = 0x0506c5485AE54aB14C598Ef16C459409E5d8Fc03;
    address public constant FOUNDERS_POOL_ADDR = 0x4452d6454e777743a5Ee233fbe873055008fF528;
    address public constant LEGAL_EXPENSES_ADDR_1 = 0xb57911380F13A0a9a6Ba6562248674B5f56D7BFE;
    address public constant LEGAL_EXPENSES_ADDR_2 = 0x9be281CdcF34B3A01468Ad1008139410Ba5BB2fB;

    // 6 months period, in seconds, for pre-commitment half-vesting
    uint64 public constant PRECOMMITMENT_VESTING_SECONDS = 15552000;
}
