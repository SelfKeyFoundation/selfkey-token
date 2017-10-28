pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';

/**
* @title ForcedRefundVault
* @dev RefundVault for refunding on KYC fail cases, regardless of refunds being "enabled" or not.
*/
contract ForcedRefundVault is Ownable, RefundVault {
    using SafeMath for uint256;

    function ForcedRefundVault(address _wallet)
        RefundVault(_wallet) {
        wallet = _wallet;
    }

    function forceRefund (address participant) onlyOwner returns (uint256){
        uint256 depositedValue = deposited[participant];
        if (depositedValue > 0) {
            participant.transfer(depositedValue);
            deposited[participant] = 0;
            Refunded(participant, depositedValue);
        }
        return depositedValue;
    }
}
