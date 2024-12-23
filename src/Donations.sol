// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Donations is ReentrancyGuard {
    // State variables
    address public owner;
    uint256 public totalDonations;
    uint256 public donorCount;
    uint256 public minimumDonation;
    
    // Mapping to track individual donor contributions
    mapping(address => uint256) public donorTotalContributions;
    // Mapping to track donor tiers
    mapping(address => uint256) public donorTiers;
    // Array to keep track of all donors
    address[] public donors;
    
    // Events
    event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp);
    event TierUpgrade(address indexed donor, uint256 newTier);
    event MinimumDonationUpdated(uint256 newMinimumDonation);

    
    
    // Custom modifier for owner-only functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Tiers thresholds
    uint256 constant BRONZE_THRESHOLD = 0.1 ether;
    uint256 constant SILVER_THRESHOLD = 0.5 ether;
    uint256 constant GOLD_THRESHOLD = 1 ether;
    
    constructor(uint256 _minimumDonation) {
        owner = msg.sender;
        minimumDonation = _minimumDonation;
    }
    
    // Fallback and receive functions to accept direct ETH transfers
    receive() external payable {
        _processDonation();
    }
    
    fallback() external payable {
        _processDonation();
    }
    
    // Main donation function
    function donate() public payable {
        _processDonation();
    }
    
    // Internal function to process donations
    function _processDonation() internal {
        require(msg.value >= minimumDonation, "Donation below minimum amount");
        
        // If this is a new donor, add them to the array
        if (donorTotalContributions[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }
        
        // Update donor's total contributions
        donorTotalContributions[msg.sender] += msg.value;
        totalDonations += msg.value;
        
        // Check and update donor tier
        _updateDonorTier(msg.sender);
        
        // Emit donation event
        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }
    
    // Internal function to update donor tiers
    function _updateDonorTier(address donor) internal {
        uint256 totalContribution = donorTotalContributions[donor];
        uint256 newTier;
        
        if (totalContribution >= GOLD_THRESHOLD) {
            newTier = 3; // Gold
        } else if (totalContribution >= SILVER_THRESHOLD) {
            newTier = 2; // Silver
        } else if (totalContribution >= BRONZE_THRESHOLD) {
            newTier = 1; // Bronze
        }
        
        if (newTier > donorTiers[donor]) {
            donorTiers[donor] = newTier;
            emit TierUpgrade(donor, newTier);
        }
    }
    
    // View functions for analytics
    function getDonorCount() public view returns (uint256) {
        return donorCount;
    }
    
    function getDonorTier(address donor) public view returns (string memory) {
        uint256 tier = donorTiers[donor];
        if (tier == 3) return "GOLD";
        if (tier == 2) return "SILVER";
        if (tier == 1) return "BRONZE";
        return "NONE";
    }
    
    function getAllDonors() public view returns (address[] memory) {
        return donors;
    }
    
    // Owner functions
    function withdrawFunds() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");

        // Debugging log
        emit WithdrawalSuccess(owner, balance);
    }

    
    function setMinimumDonation(uint256 _newMinimum) public onlyOwner {
        require(_newMinimum > 0, "Minimum donation must be greater than 0");
        minimumDonation = _newMinimum;
        emit MinimumDonationUpdated(_newMinimum);
    }
    
}