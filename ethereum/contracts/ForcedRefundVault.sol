pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';

/**
* @title ForcedRefundVault
* @dev RefundVault for refunding on KYC fail cases, regardless of refunds being "enabled" or not.
*/
contract ForcedRefundVault is RefundVault {
    using SafeMath for uint256;

    mapping(address => bool) public refundEnabled;
    mapping(address => uint256) public toRefund;
    uint256 public refundableTotal = 0;

    event RefundEnabled(address investor, uint256 _funds);

    /**
     * @dev ForcedRefundVault contract constructor
     */
    function ForcedRefundVault(address _wallet)
        RefundVault(_wallet) {
    }

    /**
    * @dev Enables a particular address to be able to claim a refund
    * This method should be called on KYC rejection
    */
    function enableKYCRefund(address investor) onlyOwner public {
        refundEnabled[investor] = true;
        toRefund[investor] = toRefund[investor].add(deposited[investor]);
        refundableTotal = refundableTotal.add(deposited[investor]);
        deposited[investor] = 0;
        RefundEnabled(investor, toRefund[investor]);
    }

    /**
    * @dev Overrides RefundVault.refund method for allowing enabled (KYC-rejected) participants to claim a refund
    */
    function refund(address investor) public {
        require(state == State.Refunding || refundEnabled[investor]);

        uint256 depositedValue;

        if (state == State.Refunding) {
            depositedValue = deposited[investor];
        } else {
            depositedValue = toRefund[investor];
            refundableTotal = refundableTotal.sub(depositedValue);
            refundEnabled[investor] = false;
            toRefund[investor] = 0;
        }

        investor.transfer(depositedValue);
        Refunded(investor, depositedValue);
    }

    /**
    * @dev Overrides RefundVault.close method for taking into account ETH still held for KYC refunds
    */
    function close() onlyOwner public {
        require(state == State.Active);
        state = State.Closed;
        Closed();
        // transfers funds except for ETH still kept for KYC refunds
        wallet.transfer(this.balance.sub(refundableTotal));
    }
}
