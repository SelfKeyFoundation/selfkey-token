pragma solidity ^0.4.15;

import './SelfKeyToken.sol';
import './CrowdsaleConfig.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';

/**
* @title SelfKeyCrowdsale
* @dev SelfKey Token Crowdsale implementation.
*/
contract SelfKeyCrowdsale is Ownable, CrowdsaleConfig {
    using SafeMath for uint256;

    SelfKeyToken public token;  // Token contract

    uint64 public startTime;
    uint64 public endTime;
    uint256 public rate;        // How many token units a buyer gets per wei
    uint256 public presaleRate; // How many token units a buyer gets per wei during pre-sale
    address public wallet;

    uint256 public weiRaised;   // Amount of raised money in wei
    uint256 public goal;        // Minimum cap expected to raise in wei
    uint256 public totalPresale = 0;

    mapping(address => bool) public presaleEnabled;
    bool public isFinalized = false;

    // Initial distribution addresses
    address public foundationPool;
    address public legalExpensesWallet;

    // Token Timelocks
    TokenTimelock public timelock1;

    // Vault to hold funds until crowdsale is finalized. Allows refunding.
    RefundVault public vault;

    // Crowdsale events
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
    event VerifiedKYC(address _participant);
    event RejectedKYC(address _participant);
    event Finalized();

    /**
     * @dev Crowdsale contract constructor
     */
    function SelfKeyCrowdsale(uint64 _startTime, uint64 _endTime, uint256 _rate, uint256 _presaleRate,
      address _wallet, address _foundationPool, address _legalExpensesWallet, uint256 _goal) {
        require(_endTime > _startTime);
        require(_rate > 0);
        require(_wallet != 0x0);

        token = new SelfKeyToken(TOTAL_SUPPLY_CAP);

        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        presaleRate = _presaleRate;
        wallet = _wallet;
        goal = _goal;

        vault = new RefundVault(wallet);

        foundationPool = _foundationPool;
        legalExpensesWallet = _legalExpensesWallet;

        // Creation of timelocks
        timelock1 = new TokenTimelock(token, foundationPool, uint64(startTime + 31622400));   // 1 year after startTime

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
        require(validPurchase(beneficiary));
        require(msg.value != 0);

        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);   // Calculate token amount to be created

        if (now < startTime) {
            // pre-sale
            tokens = weiAmount.mul(presaleRate);   // Calculate token amount to be created
            require(totalPresale.add(tokens) <= PRESALE_CAP);   //  Presale_cap must not be exceeded

            totalPresale = totalPresale.add(tokens);
        }

        // Update state
        weiRaised = weiRaised.add(weiAmount);
        token.mint(beneficiary, tokens);
        token.setKycRequired(beneficiary);      // Set beneficiary as required for KYC
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);    // Trigger event

        forwardFunds();
    }

    /**
    * @dev Returns true if purchase is made during valid period and contribution is above 0
    */
    function validPurchase(address beneficiary) internal constant returns (bool) {
        bool withinPeriod = now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        bool belowSaleCap = weiRaised.add(msg.value) <= SALE_CAP;
        return withinPeriod && nonZeroPurchase && belowSaleCap && (now >= startTime || validPresale(beneficiary));
    }

    /**
    * @dev Returns true if given address is allowed to participate in the pre-sale
    */
    function validPresale(address beneficiary) constant returns (bool) {
        // Beneficiary must be registered in "presale whitelist"
        return presaleEnabled[beneficiary] == true;
    }

    /**
    * @dev Sets given address as enabled to participate during pre-sale
    */
    function allowPresale(address beneficiary) onlyOwner public {
        presaleEnabled[beneficiary] = true;
    }

    /**
    * @dev Sets given address as disabled to participate during pre-sale
    */
    function disallowPresale(address beneficiary) onlyOwner public {
        presaleEnabled[beneficiary] = false;
    }

    /**
    * @dev Forwards funds to contract wallet.
    */
    function forwardFunds() internal {
        if(now < startTime) {
            wallet.transfer(msg.value);
        } else {
            vault.deposit.value(msg.value)(msg.sender);     // Store funds in "refund vault"
        }
    }

    /**
    * @dev Returns true if endTime has been reached.
    */
    function hasEnded() public constant returns (bool) {
        return now > endTime;
    }

    /**
    * @dev Must be called after crowdsale ends, to do some extra finalization
    * work. Calls the contract's finalization function.
    */
    function finalize() onlyOwner public {
        require(!isFinalized);
        //require(hasEnded());

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
            token.finishMinting();
            assert(token.transfersEnabled());
        } else {
            vault.enableRefunds();
        }
    }

    /**
    * @dev If crowdsale is unsuccessful, investors can claim refunds
    */
    function claimRefund() public {
        require(isFinalized);
        require(!goalReached());

        vault.refund(msg.sender);
    }

    /**
    * @dev If crowdsale is unsuccessful, investors can claim refunds
    */
    function goalReached() public constant returns (bool) {
        return weiRaised >= goal;
    }

    /**
    * @dev Initial allocation of tokens
    */
    function distributeInitialFunds() internal {
        token.mint(foundationPool, FOUNDATION_POOL_TOKENS);
        token.mint(timelock1, TIMELOCK1_TOKENS);
        token.mint(legalExpensesWallet, LEGAL_EXPENSES_TOKENS);
    }

    /**
    * @dev Release time-locked tokens
    */
    function releaseLock1() public {
        timelock1.release();
    }

    /**
    * @dev Verifies KYC for given participant. This enables token transfers from participant address
    */
    function verifyKYC(address participant) onlyOwner public {
        token.unsetKycRequired(participant);
        assert(!token.kycRequired(participant));
        VerifiedKYC(participant);
    }

    /**
    * @dev Rejects KYC for given participant. This disables token transfers from participant address
    */
    function rejectKYC(address participant) onlyOwner public {
        token.setKycRequired(participant);
        assert(token.kycRequired(participant));
        RejectedKYC(participant);
    }
}
