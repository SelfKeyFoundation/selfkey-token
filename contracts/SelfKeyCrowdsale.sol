pragma solidity ^0.4.18;

import './SelfKeyToken.sol';
import './CrowdsaleConfig.sol';
import './KYCRefundVault.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';


/**
 * @title SelfKeyCrowdsale
 * @dev SelfKey Token Crowdsale implementation.
 */
// solhint-disable-next-line max-states-count
contract SelfKeyCrowdsale is Ownable, CrowdsaleConfig {
    using SafeMath for uint256;
    using SafeERC20 for SelfKeyToken;

    address public wallet;

    // Token contract
    SelfKeyToken public token;

    uint64 public startTime;
    uint64 public endTime;

    // How many token units a buyer gets per wei
    uint256 public rate;

    // Minimum tokens expected to sell
    uint256 public goal;

    // Total amount of tokens purchased, including pre-sale
    uint256 public totalPurchased = 0;

    // counter of how many tokens are still locked to non-verified participants
    uint256 public lockedTotal = 0;

    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public lockedBalance;
    mapping(address => uint256) public weiContributed;

    // an array for keeping track of all addresses still pending for KYC verification
    address[] private lockedAddress;

    // a mapping to retrieve the index of an address in lockedAddress arrray
    mapping(address => uint256) private lockedIndex;

    // a mapping of dynamically instantiated token timelocks for each pre-commitment beneficiary
    mapping(address => address) public vestedTokens;

    bool public isFinalized = false;

    // Initial distribution addresses
    address public foundationPool;
    address public foundersPool;
    address public legalExpensesWallet;

    // Token Timelock
    TokenTimelock public timelockFounders;

    // Vault to hold funds until crowdsale is finalized. Allows refunding.
    KYCRefundVault public vault;

    // Crowdsale events
    event TokenPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 amount
    );

    event VerifiedKYC(address indexed participant);

    event RejectedKYC(address indexed participant);

    event AddedPrecommitment(
        address indexed participant,
        uint256 tokensAllocated
    );

    event Finalized();

    /**
     * @dev Crowdsale contract constructor
     * @param _startTime — Unix timestamp representing the crowdsale start time
     * @param _endTime — Unix timestamp representing the crowdsale start time
     * @param _rate — The number of tokens a buyer gets per wei
     * @param _wallet — what is this?
     * @param _foundationPool — what is this?
     * @param _foundersPool — what is this?
     * @param _legalExpensesWallet — what is this?
     * @param _goal — Minimum amount of tokens expected to sell.
     */
    function SelfKeyCrowdsale(
        uint64 _startTime,
        uint64 _endTime,
        uint256 _rate,
        address _wallet,
        address _foundationPool,
        address _foundersPool,
        address _legalExpensesWallet,
        uint256 _goal
    ) public
    {
        require(_endTime > _startTime);
        require(_rate > 0);
        require(_wallet != 0x0);

        token = new SelfKeyToken(TOTAL_SUPPLY_CAP);
        // mints all tokens and gives them to the crowdsale
        token.mint(address(this), TOTAL_SUPPLY_CAP);
        token.finishMinting();

        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        wallet = _wallet;
        goal = _goal;

        vault = new KYCRefundVault(wallet);

        foundationPool = _foundationPool;
        foundersPool = _foundersPool;
        legalExpensesWallet = _legalExpensesWallet;

        // Set timelocks to 1 year after startTime
        uint64 unlockAt = uint64(startTime + 31622400);
        timelockFounders = new TokenTimelock(token, foundersPool, unlockAt);

        distributeInitialFunds();
    }

    /**
     * @dev Fallback function is used to buy tokens.
     *      It's the only entry point since `buyTokens` is internal
     */
    function () public payable {
        buyTokens(msg.sender);
    }

    /**
     * @dev Low level token purchase. Only callable internally.
     */
    function buyTokens(address beneficiary) internal {
        require(now >= startTime);
        require(!isFinalized);
        require(beneficiary != 0x0);
        require(msg.value != 0);
        require(validPurchase(beneficiary));

        // Calculate the token amount to be allocated
        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);

        // Total sale cap must not be exceeded
        require(totalPurchased.add(tokens) <= SALE_CAP);

        // Update state
        weiContributed[beneficiary] = weiContributed[beneficiary].add(weiAmount);
        totalPurchased = totalPurchased.add(tokens);

        if (kycVerified[beneficiary]) {
            token.safeTransfer(beneficiary, tokens);
        } else {
            addLockedBalance(beneficiary, tokens);
        }

        // Sends ETH contribution to the RefundVault
        vault.deposit.value(msg.value)(beneficiary);

        TokenPurchase(
            msg.sender,
            beneficiary,
            weiAmount,
            tokens
        );
    }

    /**
     * @dev Updates the conversion (ETH/KEY) rate, as long as the public sale hasn't started
     * @param newRate - Updated conversion rate
     */
    function setRate(uint256 newRate) public onlyOwner {
        require(now < startTime);
        rate = newRate;
    }

    /**
     * @dev Adds locked balance to a participant (purchased tokens pending for KYC verification)
     * @param participant — Participant address
     * @param tokens — Token amount to be allocated as locked balance
     */
    function addLockedBalance(address participant, uint256 tokens) internal {
        require(tokens > 0);

        // adds address to locked address array if it hasn't been added
        if (lockedBalance[participant] == 0) {
            lockedIndex[participant] = lockedAddress.length;
            lockedAddress.push(participant);
        }

        lockedBalance[participant] = lockedBalance[participant].add(tokens);
        lockedTotal = lockedTotal.add(tokens);
    }

    /**
     * @dev Resets locked balance for a given participant
     * @param participant — Participant address
     */
    function resetLockedBalance(address participant) internal returns (uint256) {
        require(lockedBalance[participant] > 0);

        // Address "deletion" from lockedAddress array
        // it copies the last element to that index and "deletes" the last element
        uint256 index = lockedIndex[participant];
        lockedAddress[index] = lockedAddress[lockedAddress.length - 1];
        lockedAddress.length = lockedAddress.length - 1;

        uint256 tokens = lockedBalance[participant];

        lockedTotal = lockedTotal.sub(lockedBalance[participant]);
        lockedBalance[participant] = 0;

        return tokens;
    }

    /**
     * @dev Must be called after crowdsale ends, to do some extra finalization
     *      work. Calls the contract's finalization function.
     */
    function finalize() public onlyOwner {
        require(!isFinalized);
        require(now > startTime);

        clearPendingKYC();
        finalization();
        Finalized();

        isFinalized = true;
    }

    /**
     * @dev Additional finalization logic. Enables token transfers.
     */
    function finalization() internal {
        require(lockedTotal == 0); // requires there are no pending KYC checks

        if (goalReached()) {
            burnUnsold();
            vault.close();
            token.enableTransfers();
        } else {
            vault.enableRefunds();
        }
    }


    /**
     * @dev If crowdsale is unsuccessful, investors can claim refunds.
     */
    function claimRefund() public {
        // requires sale to be finalized and goal not reached,
        // unless sender has been enabled explicitly
        if (!vault.refundEnabled(msg.sender)) {
            require(isFinalized);
            require(!goalReached());
        }

        vault.refund(msg.sender);
    }

    /**
     * @dev If crowdsale is unsuccessful, participants can claim refunds
     */
    function goalReached() public constant returns (bool) {
        return totalPurchased >= goal;
    }

    /**
     * @dev Release Founders' time-locked tokens
     */
    function releaseLockFounders() public {
        timelockFounders.release();
    }

    /**
     * @dev Release time-locked tokens for pre-commitment participants
     */
    function releaseLock(address participant) public {
        require(vestedTokens[participant] != 0x0);
        TokenTimelock timelock = TokenTimelock(vestedTokens[participant]);
        timelock.release();
    }

    /**
     * @dev Verifies KYC for given participant.
     *      This enables token transfers from the participant address
     */
    function verifyKYC(address participant) public onlyOwner {
        kycVerified[participant] = true;

        if (lockedBalance[participant] > 0) {
            uint256 tokens = resetLockedBalance(participant);
            token.safeTransfer(participant, tokens);
        }

        VerifiedKYC(participant);
    }

    /**
     * @dev Rejects KYC for given participant.
     *      This disables token transfers from participant address
     */
    function rejectKYC(address participant) public onlyOwner {
        require(!kycVerified[participant]);
        kycVerified[participant] = false;

        if (lockedBalance[participant] > 0) {
            uint256 tokens = resetLockedBalance(participant);

            totalPurchased = totalPurchased.sub(tokens);
            weiContributed[participant] = 0;

            // enable vault funds as refundable for this participant address
            vault.enableKYCRefund(participant);
        }

        RejectedKYC(participant);
    }

    /**
     * @dev Clears all pending KYC cases. This should be called by the finalization method
     */
    function clearPendingKYC() internal {
        uint256 tokens;
        address participant;

        for(uint i; i < lockedAddress.length; i++) {
            participant = lockedAddress[i];
            tokens = lockedBalance[participant];

            // reset overall locked token balance for this participant
            lockedTotal = lockedTotal.sub(tokens);
            lockedBalance[participant] = 0;

            // revert contributions recorded for this participant
            totalPurchased = totalPurchased.sub(tokens);
            weiContributed[participant] = 0;

            // enable vault funds as refundable for this participant address
            vault.enableKYCRefund(participant);
        }
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

        // updates state
        kycVerified[beneficiary] = true;    // KYC was already done off-chain
        uint256 tokens = tokensAllocated;
        totalPurchased = totalPurchased.add(tokens);

        if (halfVesting) {
            // Calculates vesting release date for 6 months after start time
            uint64 vestingSeconds = 6 * 30 days;
            uint64 endTimeLock = uint64(startTime + vestingSeconds);

            // Sets a timelock for half the tokens allocated
            uint256 half = tokens.div(2);
            TokenTimelock timelock = new TokenTimelock(token, beneficiary, endTimeLock);
            vestedTokens[beneficiary] = address(timelock);
            token.safeTransfer(beneficiary, half);
            token.safeTransfer(timelock, tokens.sub(half));
        } else {
            token.safeTransfer(beneficiary, tokens);
        }

        AddedPrecommitment(
            beneficiary,
            tokens
        );
    }

    /**
     * @dev Initial allocation of tokens
     */
    function distributeInitialFunds() internal {
        token.safeTransfer(foundationPool, FOUNDATION_POOL_TOKENS);
        token.safeTransfer(timelockFounders, FOUNDERS_TOKENS_VESTED);
        token.safeTransfer(legalExpensesWallet, LEGAL_EXPENSES_TOKENS);
    }

    /**
     * @dev Returns true if purchase is made during valid period
     *      and contribution is between purchase caps
     *
     * @param beneficiary — The address buying the tokens.
     */
    function validPurchase(address beneficiary) internal view returns (bool) {
        bool withinPeriod = now <= endTime; // solhint-disable-line not-rely-on-time
        uint256 amount = weiContributed[beneficiary];
        bool aboveMinPurchaseCap = amount.add(msg.value) >= PURCHASE_MIN_CAP_WEI;
        bool belowMaxPurchaseCap = amount.add(msg.value) <= PURCHASE_MAX_CAP_WEI;

        return withinPeriod && aboveMinPurchaseCap && belowMaxPurchaseCap;
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
