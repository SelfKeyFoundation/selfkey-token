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
    uint256 public constant PURCHASER_MIN_TOKEN_CAP = 6666 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on first day of public sale = $3,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP_DAY1 = 200000 * MIN_TOKEN_UNIT;

    // Maximum cap per purchaser on public sale = $18,000 in KEY (at $0.015)
    uint256 public constant PURCHASER_MAX_TOKEN_CAP = 1200000 * MIN_TOKEN_UNIT;

    // approx 49.5%
    uint256 public constant FOUNDATION_POOL_TOKENS = 2970000000 * MIN_TOKEN_UNIT;

    // Founders' distribution. Total = 16.5%
    uint256 public constant FOUNDERS1_TOKENS = 311111111 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDERS1_TOKENS_VESTED_1 = 311111111 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDERS1_TOKENS_VESTED_2 = 311111111 * MIN_TOKEN_UNIT;
    uint256 public constant FOUNDERS2_TOKENS_VESTED = 56666667 * MIN_TOKEN_UNIT;

    // 1% for legal advisors
    uint256 public constant LEGAL_EXPENSES_1_TOKENS = 27000000 * MIN_TOKEN_UNIT;
    uint256 public constant LEGAL_EXPENSES_1_TOKENS_VESTED = 27000000 * MIN_TOKEN_UNIT;
    uint256 public constant LEGAL_EXPENSES_2_TOKENS = 6000000 * MIN_TOKEN_UNIT;

    // KEY price in USD (thousandths)
    uint256 public constant TOKEN_PRICE_THOUSANDTH = 15;  // $0.015 per KEY

    // Contract wallet addresses for initial allocation
    address public constant CROWDSALE_WALLET_ADDR = 0x411A83c2b938EBF256939CDB552f5D176E8d4009;
    address public constant FOUNDATION_POOL_ADDR = 0xC719DB33389eA25F5e72C1338dADb1D46F34b06E;
    address public constant FOUNDERS_POOL_ADDR_1 = 0x7ac25aAc6a1c082aEbA716e614b0F8d1E3727aFB;
    address public constant FOUNDERS_POOL_ADDR_2 = 0xbC08f9AEEc5fE01d9512dC8D47D7C57721917529;
    address public constant LEGAL_EXPENSES_ADDR_1 = 0x68335F976E97C6c0362f697BB9e5a70f44FA33a8;
    address public constant LEGAL_EXPENSES_ADDR_2 = 0x03bd20e5f5f81b75D9fc1f1D1f1634dfa309DfC4;

    // some pre-sale purchasers have their tokens half-vested for a period of 6 months
    uint64 public constant PRECOMMITMENT_VESTING_SECONDS = 15552000;
}
