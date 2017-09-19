pragma solidity ^0.4.11;

// ----------------------------------------------------------------------------
// SelfKey Token crowdfunding - Configuration contract
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Configuration parameters
// ----------------------------------------------------------------------------
contract SelfKeyTokenConfig {
    // ------------------------------------------------------------------------
    // Token symbol(), name() and decimals()
    // ------------------------------------------------------------------------
    string public constant SYMBOL = "KEY";
    string public constant NAME = "SelfKey";
    uint8 public constant DECIMALS = 12;

    // ------------------------------------------------------------------------
    // Decimal factor for multiplications from KEY unit to KEY natural unit
    // ------------------------------------------------------------------------
    uint public constant DECIMALSFACTOR = 10**uint(DECIMALS);

    // ------------------------------------------------------------------------
    // Soft cap and hard cap, total tokens and other distribution parameters
    // ------------------------------------------------------------------------
    uint public constant TOKENS_TOTAL = 9900000000 * DECIMALSFACTOR;    //100%
    uint public constant TOKENS_FOUNDATION = 3267000000 * DECIMALSFACTOR;//33%
    uint public constant TOKENS_HARD_CAP = 3267000000 * DECIMALSFACTOR;  //33%
    uint public constant TOKENS_SOFT_CAP = 0; // No soft cap
    uint public constant TOKENS_LEGAL_FEES = 99000000 * DECIMALSFACTOR;   //1%
    uint public constant PRESALE_CAP = 150000000 * DECIMALSFACTOR;   //1%

    // ------------------------------------------------------------------------
    // Locked token distribution
    // for each 6 months there is a releas allowed of 25% of 33% of totals
    // ------------------------------------------------------------------------
    uint public constant TOKENS_LOCKED_TOTAL_1 = 816750000 * DECIMALSFACTOR;
    uint public constant TOKENS_LOCKED_TOTAL_2 = 816750000 * DECIMALSFACTOR;
    uint public constant TOKENS_LOCKED_TOTAL_3 = 816750000 * DECIMALSFACTOR;
    uint public constant TOKENS_LOCKED_TOTAL_4 = 816750000 * DECIMALSFACTOR;

    // ------------------------------------------------------------------------
    // Crowdsale start date and end date
    // ------------------------------------------------------------------------
    uint public constant START_DATE = 1496275200;    //1506816000;   // 2017-10-01 @ 12:00am UTC
    uint public constant END_DATE = 1512086400;     // 2017-12-01 @ 12:00am UTC

    // ------------------------------------------------------------------------
    // Release dates for locked tokens
    // A new batch of locked tokens is released each 6 months for a total of
    // 2 years of periodic vesting
    // ------------------------------------------------------------------------
    uint public constant LOCKED_DATE_1 = START_DATE + 182 days;
    uint public constant LOCKED_DATE_2 = LOCKED_DATE_1 + 182 days;
    uint public constant LOCKED_DATE_3 = LOCKED_DATE_2 + 182 days;
    uint public constant LOCKED_DATE_4 = LOCKED_DATE_3 + 182 days;

    // ------------------------------------------------------------------------
    // Foundation address for holding a percentage of Tokens
    // ------------------------------------------------------------------------
    address public FOUNDATION_ACC = 0x5C37C8CbD519E7FA10Ec122fd2f3559EC0E12703;

    // ------------------------------------------------------------------------
    // Address for paying legal fees in KEY tokens
    // ------------------------------------------------------------------------
    address public LEGAL_ACC = 0xe4b597b3b87e730444cb5D7972A117534b80f024;

    // ------------------------------------------------------------------------
    // Addresses for time-locked Tokens
    // ------------------------------------------------------------------------
    address public LOCK_ACC = 0x6352A9919b3Da5bd03196974159FC9E2dEaDbb79;

    // ------------------------------------------------------------------------
    // Individual transaction contribution min and max amounts
    // Set to 0 to switch off, or `x ether`
    // ------------------------------------------------------------------------
    uint public CONTRIBUTIONS_MIN = 0 ether;
    uint public CONTRIBUTIONS_MAX = 0 ether;

    // ------------------------------------------------------------------------
    // Sale fees
    // Allows for a third party to earn a fee on each sale
    // ------------------------------------------------------------------------
    //bool public SALE_FEES_ENABLED = false;
    // add percentage here after knowing how to make float number calculation
}
