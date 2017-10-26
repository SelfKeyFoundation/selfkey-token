SelfKey contract main structure
===============================

Contracts
---------

* CrowdsaleConfig
* SelfKeyToken
* SelfKeyCrowdsale
* ForcedRefundVault


CrowdsaleConfig 
~~~~~~~~~~~~~~~

It holds all constants to be used from the different functions of the Crowdsale contract, that is all "caps" and token allocation amounts (such as foundation pool, founders, legal expenses, etc)


SelfKeyToken
~~~~~~~~~~~~

Simple token contract, it implements the ERC20 standard, meaning crucial functions such as "transfer" and "balanceOf" are here.


SelfKeyCrowdsale
~~~~~~~~~~~~~~~~

The main contract for handling all token sale logic, including pre-sale, sale and finalization stages.


ForcedRefundVault
~~~~~~~~~~~~~~~~~

This is contract that inherits from OpenZeppelin's `RefundVault`, which is a contract that takes hold of all ETH transferred to the crowdsale contract, and keeps it until the crowdsale is successfully finalized, in which case it forwards all the funds to the contrac owner's wallet. If token sale is not successful (minimum goal is not reached), the contract opens itself for refunds, which have to be "claimed" by the participants through a public method in the contract. 

In the case of ForcedRefundVault, it opens the possibility for a `forceRefund` to be made (regardless of the token sale status or date). This is used for refunding in cases of KYC rejection.


SelfKeyCrowdsale Contract Overview
----------------------------------

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

KYC Verification
~~~~~~~~~~~~~~~~

KYC verification is simply represented in the contract as a list of addresses that are said (by the contract owner) to have passed a KYC process. This process is completely (at this point at least) off-chain, the contract has no knowledge on this regard.

Stages of the token sale
~~~~~~~~~~~~~~~~~~~~~~~~

1. Pre-sale:

Once the contract is deployed, but start date is still not reached, participants are allowed to send funds to the contract, only if they are previously added to the KYC-verified list. 

Also, "pre-commitment" is possible for any off-chain contributions made before the token launch. In this case, the contract owner manually adds a record of a contribution having taken place, specifying the amount of wei, along with a "bonus factor" which is a integer percentage of bonus tokens to be granted to such contributor.

2. Sale:

Sale is enabled at `start date` which means it starts receiving any payments done directly to the contract address. The tokens corresponding to each participant are held by the contract until the sale is finalized. The contributions (in ETH) are held by the RefundVault contract. 

Participants are by default "not KYC verified". KYC verification can occur at any time, authorizing the transfer of tokens to the corresponding wallet, or refunding in case of KYC rejection.

3. Finalization:

Finalization is manually triggered by the contract owner. This is even valid to occur before the set `end date`. Finalization process merely verifies the goal was reached or not, and invokes the `RefundVault` for transfer of funds to the contract owner in case of successful crowdsale. Otherwise (the goal was not reached), the vault is enabled for refund claims.

All unsold tokens are "burned", technically meaning they are sent to an irretrievable address.

Additional notes
================

* All tokens are being generated at deployment time, being held by the `SelfKeyCrowdsale` contract for due management, including the "burning" of remaining unsold tokens.
* "KYC verification" at this point is a single transaction dealing with a single Ethereum address. For handling of "lists" (imports, exports and alike) additional systems need to be in place for multiple calls to the contract.

Conclusion
==========

This is a very brief summary of the KEY token sale functioning, at the moment of this writing. At this point, the desired behavior of the aforementioned contracts is subject to change for enhancement of the system until it's ready for official launch. Still security audits and subsequent discussion and adjustments are expected.
