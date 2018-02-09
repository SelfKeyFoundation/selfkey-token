pragma solidity ^0.4.19;

import './SelfKeyToken.sol';
import './SelfKeyCrowdsale.sol';

import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


/**
 * @title SelfKeyAirdrop
 * @dev SelfKey SelfKey promotional airdropping mechanism
 */
contract SelfKeyAirdrop is Ownable {
    using SafeERC20 for SelfKeyToken;

    mapping(address => bool) public airdropped;
    mapping(address => bool) public isAirdropper;

    uint256 public airdropAmount = 10000000000000000000;
    uint256 public airdropCount = 0;

    SelfKeyCrowdsale public crowdsale;
    SelfKeyToken public token;

    /**
     * @dev restricts a method to be only callable by addresses whitelisted as "airdroppers"
     */
    modifier airdropperOnly() {
        require(isAirdropper[msg.sender]);
        _;
    }

    /**
     * @dev SelfKeyAirdrop contract constructor
     * @param crowdsaleAddress - address of the SelfKey crowdsale contract
     */
    function SelfKeyAirdrop (address crowdsaleAddress, address tokenAddress) public {
        crowdsale = SelfKeyCrowdsale(crowdsaleAddress);
        token = SelfKeyToken(tokenAddress);
    }

    /**
     * @dev Adds an address to the whitelist of Airdroppers
     * @param _address - address of the airdropper
     */
    function addAirdropper (address _address) public onlyOwner {
        isAirdropper[_address] = true;
    }

    /**
     * @dev Removes an address from the whitelist of Airdroppers
     * @param _address - address of the airdropper to be removed
     */
    function removeAirdropper (address _address) public onlyOwner {
        isAirdropper[_address] = false;
    }

    /**
     * @dev Changes default airdrop amount
     * @param amount - new amount to set as airdrop amount
     */
    function setAirdropAmount (uint256 amount) public onlyOwner {
        require(amount > 0);

        airdropAmount = amount;
    }

    /**
     * @dev Withdraws a certain amount of tokens to the contract owner
     * @param amount - amount of tokens for withdrawal
     */
    function withdrawTokens (uint256 amount) public onlyOwner {
        token.safeTransfer(owner, amount);
    }

    /**
     * @dev Triggers 'airdrop' for a certain address.
     *      It requires the address to be verifier previously for the SelfKey Crowdsale
     * @param _to - address to whom the airdrop is being done
     */
    function airdrop (address _to) public airdropperOnly {
        require(crowdsale.kycVerified(_to));
        require(!airdropped[_to]);

        airdropCount = airdropCount + 1;
        airdropped[_to] = true;
        token.safeTransfer(_to, airdropAmount);
    }
}
