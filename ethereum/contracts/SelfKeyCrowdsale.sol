pragma solidity ^0.4.15;

import './SelfKeyToken.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';


contract SelfKeyCrowdsale {
    using SafeMath for uint256;

    SelfKeyToken public token;  // Token contract

    uint256 public startTime;
    uint256 public endTime;
    uint256 public rate;        // How many token units a buyer gets per wei
    uint256 public weiRaised;   // Amount of raised money in wei
    address public wallet;

    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

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

    // fallback function can be used to buy tokens
    function () payable {
        //FallbackCall(msg.sender, msg.value);
        buyTokens(msg.sender);
    }


    function buyTokens(address beneficiary) public payable {
        require(beneficiary != 0x0);
        require(validPurchase());
        require(msg.value != 0);

        uint256 weiAmount = msg.value;
        uint256 tokens = weiAmount.mul(rate);   // Calculate token amount to be created

        // Update state
        weiRaised = weiRaised.add(weiAmount);
        token.mint(beneficiary, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);    // Trigger event

        forwardFunds();
    }


    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = now >= startTime && now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }


    function forwardFunds() internal {
        wallet.transfer(msg.value);
    }


    function hasEnded() public constant returns (bool) {
        return now > endTime;
    }
}
