pragma solidity ^0.4.15;

import './SelfKeyToken.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title SelfKeyCrowdsale
 * @dev SelfKey Token Crowdsale implementation.
*/
contract SelfKeyCrowdsale is Ownable {
    using SafeMath for uint256;

    SelfKeyToken public token;  // Token contract

    uint256 public startTime;
    uint256 public endTime;
    uint256 public rate;        // How many token units a buyer gets per wei
    uint256 public weiRaised;   // Amount of raised money in wei
    address public wallet;

    bool public isFinalized = false;

    // Crowdsale events
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
    event VerifiedKYC(address _participant);
    event RejectedKYC(address _participant);
    event Finalized();

    /**
     * @dev Crowdsale contract constructor
     */
    function SelfKeyCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet) {
        require(_endTime >= _startTime);
        require(_rate > 0);
        require(_wallet != 0x0);

        token = new SelfKeyToken();

        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        wallet = _wallet;
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
        require(validPurchase());
        require(msg.value != 0);

        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);   // Calculate token amount to be created

        // Update state
        weiRaised = weiRaised.add(weiAmount);
        token.mint(beneficiary, tokens);
        //token.setKycRequired(beneficiary);      // Set beneficiary as required for KYC
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);    // Trigger event

        forwardFunds();
    }

    /**
     * @dev Returns true if purchase is made during valid period and contribution is above 0
     */
    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = now >= startTime && now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }

    /**
     * @dev Forwards funds to contract wallet.
     */
    function forwardFunds() internal {
        wallet.transfer(msg.value);
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
        token.enableTransfers();
        assert(token.transfersEnabled());
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
