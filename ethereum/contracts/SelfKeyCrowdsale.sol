pragma solidity ^0.4.15;

import './SelfKeyToken.sol';
import './CrowdsaleConfig.sol';
import './ForcedRefundVault.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';

/**
* @title SelfKeyCrowdsale
* @dev SelfKey Token Crowdsale implementation.
*/
contract SelfKeyCrowdsale is Ownable, CrowdsaleConfig {
    using SafeMath for uint256;
    using SafeERC20 for SelfKeyToken;

    SelfKeyToken public token;  // Token contract

    uint64 public startTime;
    uint64 public endTime;

    uint256 public rate;        // How many token units a buyer gets per wei
    uint256 public presaleRate; // How many token units a buyer gets per wei during pre-sale
    address public wallet;

    uint256 public weiRaised;   // Amount of raised money in wei
    uint256 public goal;        // Minimum cap expected to raise in wei
    uint256 public totalPurchased = 0;      // Total amount of tokens purchased, including pre-sale

    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public lockedBalance;
    mapping(address => uint256) public weiContributed;

    bool public isFinalized = false;

    // Initial distribution addresses
    address public foundationPool;
    address public foundersPool;
    address public legalExpensesWallet;

    // Token Timelocks
    TokenTimelock public timelockFounders;

    // Vault to hold funds until crowdsale is finalized. Allows refunding.
    ForcedRefundVault public vault;

    // Crowdsale events
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
    event VerifiedKYC(address indexed participant);
    event RejectedKYC(address indexed participant);
    event AddedPrecommitment(address indexed participant, uint256 contribution, uint256 bonusFactor, uint256 _rate);
    event Finalized();

    /**
     * @dev Crowdsale contract constructor
     */
    function SelfKeyCrowdsale(uint64 _startTime, uint64 _endTime, uint256 _rate, uint256 _presaleRate,
      address _wallet, address _foundationPool, address _foundersPool, address _legalExpensesWallet, uint256 _goal) {
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
        presaleRate = _presaleRate;
        wallet = _wallet;
        goal = _goal;

        vault = new ForcedRefundVault(wallet);

        foundationPool = _foundationPool;
        foundersPool = _foundersPool;
        legalExpensesWallet = _legalExpensesWallet;

        // Creation of timelocks
        timelockFounders = new TokenTimelock(token, foundersPool, uint64(startTime + 31622400));       // 1 year after startTime

        distributeInitialFunds();
    }

    /**
    * @dev Fallback function can be used to buy tokens
    */
    function () payable {
        buyTokens(msg.sender);
    }

    /**
    * @dev Low level token purchase.
    */
    function buyTokens(address beneficiary) public payable {
        require(beneficiary != 0x0);
        require(!isFinalized);
        require(validPurchase());
        require(msg.value != 0);

        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);   // Calculate token amount to be allocated

        // if pre-sale
        if (now < startTime) {
            require(kycVerified[msg.sender] == true);

            tokens = weiAmount.mul(presaleRate);   // Calculate token amount to be created
            require(totalPurchased.add(tokens) <= PRESALE_CAP);   //  Presale_cap must not be exceeded
        }
        // Total sale cap must not be exceeded
        require(totalPurchased.add(tokens) <= SALE_CAP);

        // Update state
        if (kycVerified[msg.sender]) {
            token.safeTransfer(msg.sender, tokens);
        } else {
            lockedBalance[msg.sender] = tokens;
        }

        weiRaised = weiRaised.add(weiAmount);
        weiContributed[msg.sender] = weiContributed[msg.sender].add(weiAmount);
        totalPurchased = totalPurchased.add(tokens);

        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
        forwardFunds();
    }

    /**
    * @dev Forwards funds to contract wallet.
    */
    function forwardFunds() internal {
        vault.deposit.value(msg.value)(msg.sender);     // Store funds in "refund vault"
    }

    /**
    * @dev Must be called after crowdsale ends, to do some extra finalization
    * work. Calls the contract's finalization function.
    */
    function finalize() onlyOwner public {
        require(!isFinalized);

        finalization();
        Finalized();

        isFinalized = true;
    }

    /**
    * @dev Additional finalization logic. Enables token transfers.
    */
    function finalization() internal {
        // if goal is reached, enable token transfers and close refund vault
        if (goalReached()) {
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
        require(isFinalized);
        require(!goalReached());

        vault.refund(msg.sender);
    }

    /**
    * @dev If crowdsale is unsuccessful, participants can claim refunds
    */
    function goalReached() public constant returns (bool) {
        return weiRaised >= goal;
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
    * @dev Release time-locked tokens
    */
    function releaseLockFounders() public {
        timelockFounders.release();
    }

    /**
    * @dev Verifies KYC for given participant. This enables token transfers from participant address
    */
    function verifyKYC(address participant) onlyOwner public {
        kycVerified[participant] = true;

        if (lockedBalance[participant] > 0) {
            token.safeTransfer(participant, lockedBalance[participant]);
            lockedBalance[participant] = 0;
        }
        VerifiedKYC(participant);
    }

    /**
    * @dev Rejects KYC for given participant. This disables token transfers from participant address
    */
    function rejectKYC(address participant) onlyOwner public {
        require(!kycVerified[participant]);
        kycVerified[participant] = false;

        uint256 refunded = vault.forceRefund(participant);
        weiRaised = weiRaised.sub(refunded);
        lockedBalance[participant] = 0;
        RejectedKYC(participant);
    }

    /**
    * @dev Adds an address for pre-sale commitments made off-chain.
    * Contribution = 0 is valid, to just whitelist the address as KYC-verified.
    */
    function addPrecommitment(address participant, uint256 weiContribution, uint256 bonusFactor) onlyOwner public {
        require(now < startTime);   // requires to be on pre-sale
        kycVerified[participant] = true;

        if (weiContribution > 0) {
            // calculate token allocation at bonus price
            uint256 newRate = rate.add(rate.mul(bonusFactor).div(100));
            uint256 tokens = newRate * weiContribution;
            //  Presale_cap must not be exceeded
            require(totalPurchased.add(tokens) <= PRESALE_CAP);

            weiRaised = weiRaised.add(weiContribution);
            weiContributed[participant] = weiContributed[participant].add(weiContribution);
            token.safeTransfer(participant, tokens);
            totalPurchased = totalPurchased.add(tokens);
            AddedPrecommitment(participant, weiContribution, bonusFactor, newRate);
        }
    }

    /**
    * @dev Returns true if purchase is made during valid period and contribution is above between caps
    */
    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = now <= endTime;
        bool aboveMinPurchaseCap = weiContributed[msg.sender].add(msg.value) >= PURCHASE_MIN_CAP_WEI;
        bool belowMaxPurchaseCap = weiContributed[msg.sender].add(msg.value) <= PURCHASE_MAX_CAP_WEI;
        return withinPeriod && aboveMinPurchaseCap && belowMaxPurchaseCap;
    }
}
