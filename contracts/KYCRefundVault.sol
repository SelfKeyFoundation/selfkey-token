pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';


/**
 * @title KYCRefundVault
 * @dev RefundVault for refunding on KYC fail cases,
 *      regardless of refunds being "enabled" or not.
 */
contract KYCRefundVault is RefundVault {
    using SafeMath for uint256;

    mapping(address => bool) public refundEnabled;
    mapping(address => uint256) public toRefund;
    uint256 public refundableTotal = 0;

    event RefundEnabled(address investor, uint256 _funds);

    /**
     * @dev ForcedRefundVault contract constructor
     * @param _wallet — what's this do?
     */
    // solhint-disable-next-line no-empty-blocks
    function KYCRefundVault(address _wallet) public RefundVault(_wallet) {}

    /**
    * @dev Enables a particular address to be able to claim a refund
    *      This function is called on KYC rejection
    */
    function enableKYCRefund(address investor) public onlyOwner {
        refundEnabled[investor] = true;
        toRefund[investor] = toRefund[investor].add(deposited[investor]);
        refundableTotal = refundableTotal.add(deposited[investor]);
        deposited[investor] = 0;
        RefundEnabled(investor, toRefund[investor]);
    }

    /**
     * @dev Overrides RefundVault.refund function
     *      allowing enabled (KYC-rejected) participants to claim a refund
     * @param investor — An investor to be refunded.
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
     * @dev Overrides RefundVault.close function
     *      to take into account ETH still held for KYC refunds
     */
    function close() public onlyOwner {
        require(state == State.Active);
        state = State.Closed;
        Closed();
        // transfers funds except for ETH still kept for KYC refunds
        wallet.transfer(this.balance.sub(refundableTotal));
    }
}
