pragma solidity ^0.4.11;

// ----------------------------------------------------------------------------
// SelfKey Token crowdfunding - Token definition contract
// ----------------------------------------------------------------------------

import "./ERC20Interface.sol";
import "./Owned.sol";
import "./SafeMath.sol";
import "./SelfKeyTokenConfig.sol";
import "./LockedTokens.sol";


// ----------------------------------------------------------------------------
// ERC20 Token, with the addition of symbol, name and decimals
// ----------------------------------------------------------------------------
contract ERC20Token is ERC20Interface, Owned {
    using SafeMath for uint;

    // ------------------------------------------------------------------------
    // symbol(), name() and decimals()
    // ------------------------------------------------------------------------
    string public symbol;
    string public name;
    uint8 public decimals;

    // ------------------------------------------------------------------------
    // Balances for each account
    // ------------------------------------------------------------------------
    mapping(address => uint) balances;

    // ------------------------------------------------------------------------
    // Owner of account approves the transfer of an amount to another account
    // ------------------------------------------------------------------------
    mapping(address => mapping (address => uint)) allowed;


    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------
    function ERC20Token(
        string _symbol,
        string _name,
        uint8 _decimals,
        uint _totalSupply
    ) Owned() {
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balances[owner] = _totalSupply;
    }


    // ------------------------------------------------------------------------
    // Get the KEY balance of another account with address _owner
    // ------------------------------------------------------------------------
    function balanceOf(address _owner) constant returns (uint balance) {
        return balances[_owner];
    }


    // ------------------------------------------------------------------------
    // Transfer the balance from owner's account to another account
    // ------------------------------------------------------------------------
    function transfer(address _to, uint _amount) returns (bool success) {
        if (balances[msg.sender] >= _amount             // User has balance
            && _amount > 0                              // Non-zero transfer
            && balances[_to] + _amount > balances[_to]  // Overflow check
        ) {
            balances[msg.sender] = balances[msg.sender].sub(_amount);
            balances[_to] = balances[_to].add(_amount);
            Transfer(msg.sender, _to, _amount);
            return true;
        } else {
            return false;
        }
    }


    // ------------------------------------------------------------------------
    // Allow _spender to withdraw from your account, multiple times, up to the
    // _value amount. If this function is called again it overwrites the
    // current allowance with _value.
    // ------------------------------------------------------------------------
    function approve(
        address _spender,
        uint _amount
    ) returns (bool success) {
        allowed[msg.sender][_spender] = _amount;
        Approval(msg.sender, _spender, _amount);
        return true;
    }


    // ------------------------------------------------------------------------
    // Spender of tokens transfer an amount of tokens from the token owner's
    // balance to another account. The owner of the tokens must already
    // have approve(...)-d this transfer
    // ------------------------------------------------------------------------
    function transferFrom(
        address _from,
        address _to,
        uint _amount
    ) returns (bool success) {
        if (balances[_from] >= _amount                  // From a/c has balance
            && allowed[_from][msg.sender] >= _amount    // Transfer approved
            && _amount > 0                              // Non-zero transfer
            && balances[_to] + _amount > balances[_to]  // Overflow check
        ) {
            balances[_from] = balances[_from].sub(_amount);
            allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount);
            balances[_to] = balances[_to].add(_amount);
            Transfer(_from, _to, _amount);
            return true;
        } else {
            return false;
        }
    }


    // ------------------------------------------------------------------------
    // Returns the amount of tokens approved by the owner that can be
    // transferred to the spender's account
    // ------------------------------------------------------------------------
    function allowance(
        address _owner,
        address _spender
    ) constant returns (uint remaining) {
        return allowed[_owner][_spender];
    }
}


// ----------------------------------------------------------------------------
// SelfKey crowdsale token smart contract
// ----------------------------------------------------------------------------
contract SelfKeyToken is ERC20Token, SelfKeyTokenConfig {
    // ------------------------------------------------------------------------
    // Has the crowdsale been finalised?
    // ------------------------------------------------------------------------
    bool public finalised = false;

    // ------------------------------------------------------------------------
    // Number of tokens per 1,000 ETH
    // This can be adjusted as the ETH/USD rate changes
    //
    // Default: approximately $0,01 per KEY token, when ETH = $300
    // ------------------------------------------------------------------------
    uint public tokensPerKEther = 30000000;
    uint public tokensPerKEtherPreSale = 35000000;
    uint totalPreSale = 0;   // public?

    // ------------------------------------------------------------------------
    // Locked Tokens - holds the locked tokens information
    // ------------------------------------------------------------------------
    LockedTokens public lockedTokens;

    // ------------------------------------------------------------------------
    // ETH Deposited - holds the amount of ETH deposited by each participant
    // ------------------------------------------------------------------------
    mapping(address => uint) balanceEth;

    // ------------------------------------------------------------------------
    // Wallet receiving the raised funds
    // ------------------------------------------------------------------------
    address public wallet;

    // ------------------------------------------------------------------------
    // Crowdsale participant's accounts need to be KYC verified KYC before
    // the participant can move their tokens
    // ------------------------------------------------------------------------
    mapping(address => bool) public kycRequired;


    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------
    function SelfKeyToken(address _wallet)
        ERC20Token(SYMBOL, NAME, DECIMALS, 0)
    {
        wallet = _wallet;
        lockedTokens = new LockedTokens(this);
        require(address(lockedTokens) != 0x0);
    }


    // ------------------------------------------------------------------------
    // Get the ETH balance of another account with address _owner
    // ------------------------------------------------------------------------
    function ethBalanceOf(address _owner) constant returns (uint balance) {
        return balanceEth[_owner];
    }


    // ------------------------------------------------------------------------
    // Crowdsale owner can change the crowdsale wallet address
    // Can be set at any time before or during the crowdsale
    // Not relevant after the crowdsale is finalised as no more contributions
    // are accepted
    // ------------------------------------------------------------------------
    function setWallet(address _wallet) onlyOwner {
        wallet = _wallet;
        WalletUpdated(wallet);
    }
    event WalletUpdated(address newWallet);


    // ------------------------------------------------------------------------
    // Crowdsale owner can set number of tokens per 1,000 ETH
    // Can only be set before the start of the crowdsale
    // ------------------------------------------------------------------------
    function setTokensPerKEther(uint _tokensPerKEther) onlyOwner {
        require(now < START_DATE);
        require(_tokensPerKEther > 0);
        tokensPerKEther = _tokensPerKEther;
        TokensPerKEtherUpdated(tokensPerKEther);
    }
    event TokensPerKEtherUpdated(uint _tokensPerKEther);


    // ------------------------------------------------------------------------
    // Accept ethers to buy tokens during the crowdsale
    // ------------------------------------------------------------------------
    function () payable {
        proxyPayment(msg.sender);
    }


    // ------------------------------------------------------------------------
    // Accept ethers from one account for tokens to be created for another
    // account. Can be used by exchanges to purchase tokens on behalf of
    // it's user
    // ------------------------------------------------------------------------
    function proxyPayment(address participant) payable {
        // No contributions after the crowdsale is finalised
        require(!finalised);

        // No contributions after the end of the crowdsale
        require(now <= END_DATE);

        // No contributions below the minimum (can be 0 ETH)
        require(msg.value >= CONTRIBUTIONS_MIN);

        // No contributions above a maximum (if maximum is set to non-0)
        require(CONTRIBUTIONS_MAX == 0 || msg.value < CONTRIBUTIONS_MAX);

        uint exchangeRate;
        uint tokens;
        bool presale = false;

        if (now < START_DATE) {
            exchangeRate = tokensPerKEtherPreSale;
            presale = true;
        } else {
            exchangeRate = tokensPerKEther;
        }

        // Calculate number of tokens for contributed ETH
        // `18` is the ETH decimals
        // `- decimals` is the token decimals
        // `+ 3` for the tokens per 1,000 ETH factor
        tokens = msg.value * exchangeRate / 10**uint(18 - decimals + 3);

        // Check if the hard cap will be exceeded
        require(totalSupply + tokens <= TOKENS_HARD_CAP);

        // Check if presale cap will be exceeded
        if (presale) {
            require(totalPreSale + tokens <= PRESALE_CAP);
            //update presale KEY bought
            totalPreSale = totalPreSale.add(tokens);
        }

        // Add tokens purchased to account's balance and total supply
        balances[participant] = balances[participant].add(tokens);
        totalSupply = totalSupply.add(tokens);

        // Update registry of ETH deposited per participant
        balanceEth[participant] = balanceEth[participant].add(msg.value);

        // Log the tokens purchased
        Transfer(0x0, participant, tokens);
        TokensBought(participant, msg.value, this.balance, tokens,
             totalSupply, exchangeRate);

        // KYC verification required before participant can transfer the tokens
        kycRequired[participant] = true;

        // Transfer the contributed ethers to the crowdsale wallet
        if (!wallet.send(msg.value)) revert();
    }
    event TokensBought(address indexed buyer, uint ethers,
        uint newEtherBalance, uint tokens, uint newTotalSupply,
        uint _tokensPerKEther);


    // ------------------------------------------------------------------------
    // Crowdsale owner to finalise the crowdsale - adding the locked tokens to
    // this contract and the total supply
    // ------------------------------------------------------------------------
    function finalise() onlyOwner {
        // Can only finalise if raised > soft cap or after the end date
        require(totalSupply >= TOKENS_SOFT_CAP || now > END_DATE);
        require(!finalised);    // can only finalise once

        uint totalLocked = lockedTokens.totalSupplyLocked();
        uint remainingTokens = TOKENS_TOTAL;

        // Allocate initial tokens for Foundation
        balances[FOUNDATION_ACC] = balances[FOUNDATION_ACC].
            add(TOKENS_FOUNDATION);
        totalSupply = totalSupply.add(TOKENS_FOUNDATION);

        // Allocate tokens for legal fees
        balances[LEGAL_ACC] = balances[LEGAL_ACC].
            add(TOKENS_LEGAL_FEES);
        totalSupply = totalSupply.add(TOKENS_FOUNDATION);

        // Allocate locked tokens
        balances[address(lockedTokens)] = balances[address(lockedTokens)].
            add(totalLocked);
        totalSupply = totalSupply.add(totalLocked);

        // Calculate and add remaining tokens to Foundation account
        remainingTokens = remainingTokens.sub(totalSupply);
        remainingTokens = remainingTokens.sub(totalSupplyLocked());

        // send remaining tokens to foundation account
        balances[FOUNDATION_ACC] = balances[FOUNDATION_ACC].add(remainingTokens);
        totalSupply = totalSupply.add(remainingTokens);

        // Can only finalise once
        finalised = true;
        TokenSaleFinalised();
    }
    event TokenSaleFinalised();


    // ------------------------------------------------------------------------
    // Crowdsale owner to add precommitment funding token balance before the
    // crowdsale commences
    // ------------------------------------------------------------------------
    function addPrecommitment(address participant, uint balance) onlyOwner {
        require(now < START_DATE);
        require(balance > 0);
        balances[participant] = balances[participant].add(balance);
        totalSupply = totalSupply.add(balance);
        Transfer(0x0, participant, balance);
        PrecommitmentAdded(participant, balance);
    }
    event PrecommitmentAdded(address indexed participant, uint balance);


    // ------------------------------------------------------------------------
    // Transfer the balance from owner's account to another account, with KYC
    // verification check for the crowdsale participant's first transfer
    // ------------------------------------------------------------------------
    function transfer(address _to, uint _amount) returns (bool success) {
        // Cannot transfer before crowdsale ends
        require(finalised);
        // Cannot transfer if KYC verification is required
        require(!kycRequired[msg.sender]);
        // Standard transfer
        return super.transfer(_to, _amount);
    }


    // ------------------------------------------------------------------------
    // Spender of tokens transfer an amount of tokens from the token owner's
    // balance to another account, with KYC verification check for the
    // crowdsale participant's first transfer
    // ------------------------------------------------------------------------
    function transferFrom(address _from, address _to, uint _amount)
        returns (bool success)
    {
        // Cannot transfer before crowdsale ends
        require(finalised);
        // Cannot transfer if KYC verification is required
        require(!kycRequired[_from]);
        // Standard transferFrom
        return super.transferFrom(_from, _to, _amount);
    }


    // ------------------------------------------------------------------------
    // SelfKey to KYC verify the participant's account
    // ------------------------------------------------------------------------
    function kycVerify(address participant) onlyOwner {
        kycRequired[participant] = false;
        KycVerified(participant);
    }
    event KycVerified(address indexed participant);


    // ------------------------------------------------------------------------
    // If KYC process is rejected, any tokens bought are reversed
    // ------------------------------------------------------------------------
    function kycReject(address participant) onlyOwner {
        //require(balanceEth[participant] > 0);

        uint ethBalance = balanceEth[participant];
        uint keyBalance = balances[participant];

        totalSupply = totalSupply.sub(keyBalance); // ???
        balances[participant] = 0;
        balanceEth[participant] = 0;
        kycRequired[participant] = true;

        KycRejected(participant, ethBalance, keyBalance);
    }
    event KycRejected(address indexed participant, uint ethers, uint tokens);


    // ------------------------------------------------------------------------
    // Any account can burn _from's tokens as long as the _from account has
    // approved the _amount to be burnt using
    //   approve(0x0, _amount)
    // ------------------------------------------------------------------------
    function burnFrom(
        address _from,
        uint _amount
    ) returns (bool success) {
        if (balances[_from] >= _amount                  // From a/c has balance
            && allowed[_from][0x0] >= _amount           // Transfer approved
            && _amount > 0                              // Non-zero transfer
            && balances[0x0] + _amount > balances[0x0]  // Overflow check
        ) {
            balances[_from] = balances[_from].sub(_amount);
            allowed[_from][0x0] = allowed[_from][0x0].sub(_amount);
            balances[0x0] = balances[0x0].add(_amount);
            totalSupply = totalSupply.sub(_amount);
            Transfer(_from, 0x0, _amount);
            return true;
        } else {
            return false;
        }
    }


    // ------------------------------------------------------------------------
    // 1st semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_1(address account) constant returns (uint balance) {
        return lockedTokens.balanceOfLocked_1(account);
    }


    // ------------------------------------------------------------------------
    // 2nd semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_2(address account) constant returns (uint balance) {
        return lockedTokens.balanceOfLocked_2(account);
    }


    // ------------------------------------------------------------------------
    // 3rd semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_3(address account) constant returns (uint balance) {
        return lockedTokens.balanceOfLocked_3(account);
    }


    // ------------------------------------------------------------------------
    // 4th semester locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked_4(address account) constant returns (uint balance) {
        return lockedTokens.balanceOfLocked_4(account);
    }


    // ------------------------------------------------------------------------
    // Total locked balances for an account
    // ------------------------------------------------------------------------
    function balanceOfLocked(address account) constant returns (uint balance) {
        return lockedTokens.balanceOfLocked(account);
    }


    // ------------------------------------------------------------------------
    // 1st semester locked total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked_1() constant returns (uint) {
        if (finalised) {
            return lockedTokens.totalSupplyLocked_1();
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // 2nd semester locked total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked_2() constant returns (uint) {
        if (finalised) {
            return lockedTokens.totalSupplyLocked_2();
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // 3rd semester locked total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked_3() constant returns (uint) {
        if (finalised) {
            return lockedTokens.totalSupplyLocked_3();
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // 4th semester locked total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked_4() constant returns (uint) {
        if (finalised) {
            return lockedTokens.totalSupplyLocked_4();
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // Locked total supply
    // ------------------------------------------------------------------------
    function totalSupplyLocked() constant returns (uint) {
        if (finalised) {
            return lockedTokens.totalSupplyLocked();
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // Unlocked total supply
    // ------------------------------------------------------------------------
    function totalSupplyUnlocked() constant returns (uint) {
        if (finalised && totalSupply >= lockedTokens.totalSupplyLocked()) {
            return totalSupply.sub(lockedTokens.totalSupplyLocked());
        } else {
            return 0;
        }
    }


    // ------------------------------------------------------------------------
    // SelfKey can transfer out any accidentally sent ERC20 tokens
    // ------------------------------------------------------------------------
    function transferAnyERC20Token(address tokenAddress, uint amount)
      onlyOwner returns (bool success)
    {
        return ERC20Interface(tokenAddress).transfer(owner, amount);
    }
}
