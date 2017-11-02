# SelfKey contract main structure

## Contracts

* CrowdsaleConfig
* SelfKeyToken
* SelfKeyCrowdsale
* KYCRefundVault

### CrowdsaleConfig

It holds all constants to be used by the different functions of the Crowdsale contract, i.e. all "caps" and token allocation amounts (such as foundation pool, founders, legal expenses, etc)

### SelfKeyToken

Simple token contract, it implements the ERC20 standard, meaning crucial functions such as "transfer" and "balanceOf" are here. It also implements a `burn` function intended to "destroy" a certain amount of tokens, this is only callable
by the contract owner, which is the `SelfKeyCrowdsale` contract.

### SelfKeyCrowdsale

The main contract for handling all token sale logic, including pre-sale, sale and finalization stages.

### KYCRefundVault

This is a contract that inherits from OpenZeppelin's `RefundVault`, which is a contract that takes hold of all ETH transferred to the crowdsale contract, and keeps it until the crowdsale is successfully finalized, in which case it forwards all the funds to the contract owner's wallet. If token sale is not successful (minimum goal is not reached), the contract enables itself for refunds, which have to be "claimed" by the participants through a public `claimRefund` method in the contract.

In the case of `KYCRefundVault`, it adds the possibility for certain participants to claim refunds regardless of the
general state of the vault. This is used for allowing KYC-rejected participants to withdraw their funds.


## SelfKeyCrowdsale Contract Overview

Besides the parameters "hard-coded" in `SelfKeyConfig`, the following parameters are passed to the Crowdsale contract at deployment time:

* Start time
* End time
* Rate (how many tokens per wei)
* Pre-sale rate (for public pre-sale purchases)
* Contract owner wallet
* Goal (minimum expected to raise)

And the more "SelfKey-specific" parameters:

* Foundation pool wallet address
* Founders pool wallet address
* Legal Expenses wallet address

### KYC Verification

The `SelfKeyCrowdsale` contract features a list of addresses that are said (by the contract owner) to have passed a KYC process. This process is completely off-chain and depending on other systems, the contract has no knowledge on this regard, it only marks given addresses as verfied.

KYC verification can be done even before sale starts and even after sale finalization by invoking the `verifyKYC` method.
A `rejectKYC` method is also provided for cases where the given address is not compliant with the KYC process, in which
case the contributed funds are returned to its owner and the purchased tokens are put back in the sale pool.


### Stages of the token sale

1. Pre-sale:

Once the contract is deployed, but start date is still not reached, participants are allowed to send funds to the contract, only if they are previously added to the KYC-verified list.

Also, "pre-commitment" is possible for any off-chain contributions made before the token launch. In this case, the contract owner manually adds a record of a contribution having taken place, specifying the amount of wei, along with a "bonus factor" which is a integer percentage of bonus tokens to be granted to such contributor.

2. Sale:

Sale is enabled at `start date` which means it starts receiving any payments done directly to the contract address. The tokens corresponding to each participant are held by the contract until the sale is finalized. The contributions (in ETH) are held by the `KYCRefundVault` contract.

Participants are by default "not KYC verified". KYC verification can occur at any time, authorizing the transfer of tokens to the corresponding wallet, or refunding in case of KYC rejection.

3. Finalization:

Finalization is manually triggered by the contract owner. This is even valid to occur before the set `end date`. Finalization process merely verifies the goal was reached or not, and invokes the `KYCRefundVault` for transfer of funds to the contract owner in case of successful crowdsale. Otherwise (the goal was not reached), the vault is enabled for refund claims.

All unsold tokens are "burned", meaning they are destroyed and substracted from the total supply.

**Note:** Token sale finalization requires all pending KYC process to be cleared, meaning `lockedTotal` must be equal _zero_.

# Additional notes

* All tokens are being generated at deployment time, being held by the `SelfKeyCrowdsale` contract for due management.
No more tokens can be minted after contract deployment.
* KYC _verification_ and _rejection_  are at this point single transactions dealing with single Ethereum addresses. For the handling of "lists" (imports, exports and alike) additional systems need to be in place for multiple calls to the contract.
* Sending ETH directly to the SelfKeyCrowdsale contract means the sender is the crowdsale participant. By calling the buyTokens directly, sender can specify another address as the beneficiary of the tokens, purchasing on behalf of the latter.
* When KYC is rejected for a given participant, the whole purchase is rolled-back and all contributed ETH from this participant is put into "refundable" mode, substracting its amount from all counters, which means such participant _must_ claim the refund even if he/she is KYC-verified for later purchases. After a rejection, any successful verification doesn't (and cannot) take into account previous rejected contributions (as these are taken apart for user withdrawal).
* Since participants can be KYC-rejected and then make another purchase, KYC verification must be done on a _per purchase_ basis.

# Conclusion

This is a brief summary of the KEY token sale functioning at the moment of this writing. At this point, the desired behavior of the aforementioned contracts is subject to change for enhancement of the system until it's ready for official launch. Still security audits and subsequent discussion and adjustments are expected.
