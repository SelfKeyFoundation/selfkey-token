# SelfKey contract main structure

## Contracts

* CrowdsaleConfig
* SelfKeyToken
* SelfKeyCrowdsale
* KYCRefundVault

### CrowdsaleConfig

It holds all constants to be used by the different functions of the Crowdsale contract, i.e. all "caps" and token allocation amounts (such as foundation pool, founders, legal expenses, etc)

### SelfKeyToken

Simple token contract, it implements the ERC20 standard, meaning crucial functions such as "transfer" and "balanceOf" are here. It also implements a `burn` function intended to "destroy" a certain amount of tokens, this is only callable by the contract owner, which is the `SelfKeyCrowdsale` contract.

Transfers are by default disabled, and can only be enabled by the owner (`SelfKeyCrowdsale` contract). This should be done after successful crowdsale finalization.

### SelfKeyCrowdsale

The main contract for handling all token sale logic, including private pre-sale (pre-commitments), public sale and finalization stages.

### KYCRefundVault

This is a contract that inherits from OpenZeppelin's `RefundVault`, which is a contract that takes hold of all ETH transferred to the crowdsale contract, and keeps it until the crowdsale is successfully finalized, in which case it forwards all the funds to the contract owner's wallet. If token sale is not successful (minimum goal is not reached), the contract enables itself for refunds, which have to be "claimed" by the participants through a public `claimRefund` method in the contract.

`KYCRefundVault` also adds the possibility for certain specific participants to claim refunds regardless of the general state of the vault. This is used for allowing KYC-rejected participants to withdraw their funds anytime.


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

KYC verification can be done even before sale starts and even after end date has been reached (but crowdsale has not been manually finalized) by invoking the `verifyKYC` method from a SelfKey wallet or web3-enabled webpage.

A `rejectKYC` method is also provided for cases where the given address is not compliant with the KYC process, in which case the contributed funds are returned to its owner and the purchased tokens are put back in the sale pool.

**Currently under development**: "batch" verification/rejection of KYC status is provided as well, so that the crowdsale contract owner is able to verify or reject a list of Ethereum addresses at once.

All addresses must be either verified or rejected for crowdsale finalization. In case there are pending addresses
for KYC check, they are all automatically closed as "unverified" at finalization time.


### Initial allocation of tokens

At crowdsale contract deployment time, and according to the crowdsale terms agreed upon, a percentage of tokens is splitted among certain addresses, namely:

* SelfKey Foundation pool: 49.5% (for incentivization purposes)
* Legal expenses pool: 1%
* Founders' pool: 16.5%

Founders' tokens are further splitted in the following manner:

* 1/3 is made immediately available
* 1/3 is "time-locked" for 6 months
* 1/3 is time-locked for an additional 6 months (1 year total)

### Stages of the token sale

#### Pre-sale:

All pre-sale is done privately and "off-chain". After participants' KYC status is verified, SelfKey admins manually calculate the corresponding token allocation, and then `crowdsaleContract` owner should invoke the `addPrecommitment` function to allocate the tokens to the beneficiary.

A parameter is provided to the `addPrecommitment` method so that "half-vesting" is optionally applied to a pre-commitment participant, meaning half of their allocated tokens are to be "time-locked" for a period of 6 months.

#### Sale:

Sale is enabled at `start date` which means it starts receiving any payments done directly to the contract address. The tokens corresponding to each participant are held by the contract until the sale is finalized. All contributions (in ETH) are held by the `KYCRefundVault` contract and no one (not even the crowdsale contract owner) can withdraw these funds. Only by successfully finalizing the crowdsale does the crowdsale owner have access to the funds raised.

Participants' KYC status is by default "unverified". KYC verification can occur at any time, authorizing the transfer of tokens to the corresponding wallet, or refunding in case of KYC rejection.

#### Finalization:

Finalization is manually triggered by the contract owner. This is even valid to occur before the set `end date`. Finalization process merely verifies the goal was reached or not, and invokes the `KYCRefundVault` for transfer of funds to the contract owner in case of successful crowdsale. Otherwise (the goal was not reached), the vault is enabled for refund claims.

All unsold tokens are "burned", meaning they are destroyed and substracted from the total supply.

**Note:** Any contributors' addresses still pending for KYC verification (meaning the necessary identity data was not provided yet) are considered as "rejected" when the `finalize()` method is invoked. All those automatically rejected cases are enabled for refund and the corresponding tokens burned. After crowdsale finalization, no pending KYC cases are left uncleared.

# Additional notes

* All tokens are being generated at deployment time, being held by the `SelfKeyCrowdsale` contract for due management. No more tokens can be minted after contract deployment.
* When KYC is rejected for a given participant, the whole purchase is rolled-back and all contributed ETH from this participant is put into "refundable" mode, substracting its amount from all crowdsale variables, which means such participant _must_ claim such refund even if he/she is KYC-verified for later purchases as the corresponding contributed funds are "taken apart" from the crowdsale for refund.
* Participants can be KYC-rejected and then make another purchase while trying to get their KYC data re-checked. In that case, `verifyKYC`/`rejectKYC` needs to be invoked again with such address.

# Conclusion

This is a brief summary of the KEY token sale functioning at the moment of this writing. At this point, the desired behavior of the aforementioned contracts is subject to change for enhancement of the system until it's ready for official launch. Still security audits and subsequent discussion and adjustments are expected.
