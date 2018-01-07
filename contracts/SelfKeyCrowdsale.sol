/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.18;

import './SelfKeyToken.sol';
import './CrowdsaleConfig.sol';

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';


/**
 * @title SelfKeyCrowdsale
 * @dev SelfKey Token Crowdsale implementation.
 */
// solhint-disable-next-line max-states-count
contract SelfKeyCrowdsale is Ownable, CrowdsaleConfig {
    using SafeMath for uint256;
    using SafeERC20 for SelfKeyToken;

    // Token contract
    SelfKeyToken public token;

    uint64 public startTime;
    uint64 public endTime;

    // Minimum tokens expected to sell
    uint256 public goal;

    // How many tokens a buyer gets per ETH
    uint256 public rate = 51800;

    // ETH price in USD, can be later updated until start date
    uint256 public ethPrice = 777;

    // Total amount of tokens purchased, including pre-sale
    uint256 public totalPurchased = 0;

    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public tokensPurchased;

    // a mapping of dynamically instantiated token timelocks for each pre-commitment beneficiary
    mapping(address => address) public vestedTokens;

    bool public isFinalized = false;

    // Token Timelocks
    TokenTimelock public founders1Timelock1;
    TokenTimelock public founders1Timelock2;
    TokenTimelock public founders2Timelock;
    TokenTimelock public legalExpensesTimelock;

    // Vault to hold funds until crowdsale is finalized. Allows refunding if crowdsale is not successful.
    RefundVault public vault;

    // Crowdsale events
    event TokenPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 amount
    );

    event VerifiedKYC(address indexed participant);

    event AddedPrecommitment(
        address indexed participant,
        uint256 tokensAllocated
    );

    event Finalized();

    /**
     * @dev Crowdsale contract constructor
     * @param _startTime — Unix timestamp representing the crowdsale start time
     * @param _endTime — Unix timestamp representing the crowdsale start time
     * @param _goal — Minimum amount of tokens expected to sell.
     */
    function SelfKeyCrowdsale(
        uint64 _startTime,
        uint64 _endTime,
        uint256 _goal
    ) public
    {
        require(_endTime > _startTime);

        token = new SelfKeyToken(TOTAL_SUPPLY_CAP);

        // mints all possible tokens to the crowdsale contract
        token.mint(address(this), TOTAL_SUPPLY_CAP);
        token.finishMinting();

        startTime = _startTime;
        endTime = _endTime;
        goal = _goal;

        vault = new RefundVault(CROWDSALE_WALLET_ADDR);

        // Set timelocks to 6 months and a year after startTime, respectively
        uint64 sixMonthLock = uint64(startTime + 15552000);
        uint64 yearLock = uint64(startTime + 31104000);

        // Instantiation of token timelocks
        founders1Timelock1 = new TokenTimelock(token, FOUNDERS_POOL_ADDR_1, sixMonthLock);
        founders1Timelock2 = new TokenTimelock(token, FOUNDERS_POOL_ADDR_1, yearLock);
        founders2Timelock = new TokenTimelock(token, FOUNDERS_POOL_ADDR_2, yearLock);
        legalExpensesTimelock = new TokenTimelock(token, LEGAL_EXPENSES_ADDR, yearLock);

        // Genesis allocation of tokens
        token.safeTransfer(FOUNDATION_POOL_ADDR, FOUNDATION_POOL_TOKENS);
        token.safeTransfer(FOUNDERS_POOL_ADDR_1, FOUNDERS1_TOKENS);
        token.safeTransfer(LEGAL_EXPENSES_ADDR, LEGAL_EXPENSES_TOKENS);

        // Allocation of vested tokens
        token.safeTransfer(founders1Timelock1, FOUNDERS1_TOKENS_VESTED_1);
        token.safeTransfer(founders1Timelock2, FOUNDERS1_TOKENS_VESTED_1);
        token.safeTransfer(founders2Timelock, FOUNDERS2_TOKENS_VESTED);
        token.safeTransfer(legalExpensesTimelock, LEGAL_EXPENSES_TOKENS_VESTED);
    }

    /**
     * @dev Fallback function is used to buy tokens.
     *      It's the only entry point since `buyTokens` is internal
     */
    function () public payable {
        buyTokens(msg.sender);
    }

    /**
     * @dev Updates the ETH/USD conversion rate as long as the public sale hasn't started
     * @param _ethPrice - Updated conversion rate
     */
    function setEthPrice(uint256 _ethPrice) public onlyOwner {
        require(now < startTime);
        require(_ethPrice > 0);

        ethPrice = _ethPrice;
        rate = ethPrice.mul(1000).div(TOKEN_PRICE_THOUSANDTH);
    }

    /**
     * @dev Must be called after crowdsale ends, to do some extra finalization
     *      work. Calls the contract's finalization function.
     */
    function finalize() public onlyOwner {
        require(now > startTime);
        require(!isFinalized);

        finalization();
        Finalized();

        isFinalized = true;
    }

    /**
     * @dev If crowdsale is unsuccessful, a refund can be claimed back
     */
    function claimRefund(address participant) public {
        // requires sale to be finalized and goal not reached,
        require(isFinalized);
        require(!goalReached());

        vault.refund(participant);
    }

    /**
     * @dev If crowdsale is unsuccessful, participants can claim refunds
     */
    function goalReached() public constant returns (bool) {
        return totalPurchased >= goal;
    }

    /**
     * @dev Release time-locked tokens
     */
    function releaseFirstLockFounders1() public {
        founders1Timelock1.release();
    }

    function releaseSecondLockFounders1() public {
        founders1Timelock2.release();
    }

    function releaseLockFounders2() public {
        founders2Timelock.release();
    }

    function releaseLockLegalExpenses() public {
        legalExpensesTimelock.release();
    }

    /**
     * @dev Release time-locked tokens for any vested address
     */
    function releaseLock(address participant) public {
        require(vestedTokens[participant] != 0x0);

        TokenTimelock timelock = TokenTimelock(vestedTokens[participant]);
        timelock.release();
    }

    /**
     * @dev Verifies KYC for given participant.
     *      This enables token purchases by the participant addres
     */
    function verifyKYC(address participant) public onlyOwner {
        kycVerified[participant] = true;

        VerifiedKYC(participant);
    }

    /**
     * @dev Adds an address for pre-sale commitments made off-chain.
     * @param beneficiary — Address of the already verified participant
     * @param tokensAllocated — Exact amount of KEY tokens (including decimal places) to allocate
     * @param halfVesting — determines whether the half the tokens will be time-locked or not
     */
    function addPrecommitment(
        address beneficiary,
        uint256 tokensAllocated,
        bool halfVesting
    ) public onlyOwner
    {
        // requires to be on pre-sale
        require(now < startTime); // solhint-disable-line not-rely-on-time

        kycVerified[beneficiary] = true;

        uint256 tokens = tokensAllocated;
        totalPurchased = totalPurchased.add(tokens);
        tokensPurchased[beneficiary] = tokensPurchased[beneficiary].add(tokens);

        if (halfVesting) {
            // half the tokens are put into a time-lock for a pre-defined period
            uint64 endTimeLock = uint64(startTime + PRECOMMITMENT_VESTING_SECONDS);

            // Sets a timelock for half the tokens allocated
            uint256 half = tokens.div(2);
            TokenTimelock timelock;

            if (vestedTokens[beneficiary] == 0x0) {
                timelock = new TokenTimelock(token, beneficiary, endTimeLock);
                vestedTokens[beneficiary] = address(timelock);
            } else {
                timelock = TokenTimelock(vestedTokens[beneficiary]);
            }

            token.safeTransfer(beneficiary, half);
            token.safeTransfer(timelock, tokens.sub(half));
        } else {
            // all tokens are sent to the participant's address
            token.safeTransfer(beneficiary, tokens);
        }

        AddedPrecommitment(
            beneficiary,
            tokens
        );
    }

    /**
     * @dev Additional finalization logic. Enables token transfers.
     */
    function finalization() internal {
        if (goalReached()) {
            burnUnsold();
            vault.close();
            token.enableTransfers();
        } else {
            vault.enableRefunds();
        }
    }

    /**
     *  @dev Low level token purchase. Only callable internally. Participants MUST be KYC-verified before purchase
     *  @param participant — The address of the token purchaser
     */
    function buyTokens(address participant) internal {
        require(kycVerified[participant]);
        require(now >= startTime);
        require(now < endTime);
        require(!isFinalized);
        require(msg.value != 0);

        // Calculate the token amount to be allocated
        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);

        // Update state
        tokensPurchased[participant] = tokensPurchased[participant].add(tokens);
        totalPurchased = totalPurchased.add(tokens);

        require(totalPurchased <= SALE_CAP);
        require(tokensPurchased[participant] >= PURCHASER_MIN_TOKEN_CAP);

        if (now < startTime + 86400) {
            // if still during the first day of token sale, apply different max cap
            require(tokensPurchased[participant] <= PURCHASER_MAX_TOKEN_CAP_DAY1);
        } else {
            require(tokensPurchased[participant] <= PURCHASER_MAX_TOKEN_CAP);
        }

        // Sends ETH contribution to the RefundVault and tokens to participant
        vault.deposit.value(msg.value)(participant);
        token.safeTransfer(participant, tokens);

        TokenPurchase(
            msg.sender,
            participant,
            weiAmount,
            tokens
        );
    }

    /**
     * @dev Burn all remaining (unsold) tokens.
     *      This should be called after sale finalization
     */
    function burnUnsold() internal {
        // All tokens held by this contract get burned
        token.burn(token.balanceOf(this));
    }
}
