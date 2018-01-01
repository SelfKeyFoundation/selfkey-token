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

    // counter of how many tokens are still locked to non-verified participants
    uint256 public lockedTotal = 0;

    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public lockedBalance;
    mapping(address => uint256) public tokensPurchased;

    // an array for keeping track of all addresses still pending for KYC verification
    address[] private lockedAddress;

    // a mapping to retrieve the index of an address in lockedAddress arrray
    mapping(address => uint256) private lockedIndex;

    // a mapping of dynamically instantiated token timelocks for each pre-commitment beneficiary
    mapping(address => address) public vestedTokens;

    bool public isFinalized = false;

    // Token Timelocks
    TokenTimelock public timelockFounders1;
    TokenTimelock public timelockFounders2;

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
        // mints all tokens and gives them to the crowdsale
        token.mint(address(this), TOTAL_SUPPLY_CAP);
        token.finishMinting();

        startTime = _startTime;
        endTime = _endTime;
        goal = _goal;

        vault = new KYCRefundVault(CROWDSALE_WALLET_ADDR);

        // Set timelocks to 6 months and a year after startTime, respectively
        uint64 unlockAt1 = uint64(startTime + 15552000);
        uint64 unlockAt2 = uint64(startTime + 31104000);
        timelockFounders1 = new TokenTimelock(token, FOUNDERS_POOL_ADDR, unlockAt1);
        timelockFounders2 = new TokenTimelock(token, FOUNDERS_POOL_ADDR, unlockAt2);

        // Genesis allocation of tokens
        token.safeTransfer(FOUNDATION_POOL_ADDR, FOUNDATION_POOL_TOKENS);
        token.safeTransfer(FOUNDERS_POOL_ADDR, FOUNDERS_TOKENS);
        token.safeTransfer(timelockFounders1, FOUNDERS_TOKENS_VESTED_1);
        token.safeTransfer(timelockFounders2, FOUNDERS_TOKENS_VESTED_2);
        token.safeTransfer(LEGAL_EXPENSES_ADDR, LEGAL_EXPENSES_TOKENS);
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
        require(now < endTime);
        require(!isFinalized);
        require(beneficiary != 0x0);
        require(msg.value != 0);

        // Calculate the token amount to be allocated
        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);

        // Update state
        tokensPurchased[beneficiary] = tokensPurchased[beneficiary].add(tokens);
        totalPurchased = totalPurchased.add(tokens);

        require(totalPurchased <= SALE_CAP);
        require(tokensPurchased[beneficiary] >= PURCHASER_MIN_TOKEN_CAP);
        require(tokensPurchased[beneficiary] <= PURCHASER_MAX_TOKEN_CAP);

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
    function releaseLockFounders1() public {
        timelockFounders1.release();
    }

    function releaseLockFounders2() public {
        timelockFounders2.release();
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
            tokensPurchased[participant] = 0;

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
            tokensPurchased[participant] = 0;

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
        tokensPurchased[beneficiary] = tokensPurchased[beneficiary].add(tokens);

        if (halfVesting) {
            // Calculates vesting release date for 6 months after start time
            uint64 vestingSeconds = 15552000;
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
     * @dev Burn all remaining (unsold) tokens.
     *      This should be called after sale finalization
     */
    function burnUnsold() internal {
        // All tokens held by this contract get burned
        token.burn(token.balanceOf(this));
    }

    function getCurrentTime() public view returns (uint256) {
      return now;
    }
}
