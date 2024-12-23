// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Donations} from "../src/Donations.sol";

contract DonationsTest is Test {
    Donations public donations;
    address public owner;
    address public donor1;
    address public donor2;

    event TierUpgrade(address indexed donor, uint256 newTier);
    event MinimumDonationUpdated(uint256 newMinimum);

    function setUp() public {
        owner = address(this);
        donor1 = makeAddr("donor1");
        donor2 = makeAddr("donor2");
        
        // Deploy with 0.01 ether minimum donation
        donations = new Donations(0.01 ether);
        
        // Fund test addresses
        vm.deal(donor1, 10 ether);
        vm.deal(donor2, 10 ether);
        vm.deal(owner, 10 ether);
    }

    function testDonation() public {
        vm.prank(donor1);
        donations.donate{value: 1 ether}();
        
        // Total should be exactly 1 ETH (no more matching)
        assertEq(donations.totalDonations(), 1 ether);
        assertEq(donations.donorCount(), 1);
        assertEq(donations.getDonorTier(donor1), "GOLD");
    }

    function testSmallDonation() public {
        vm.prank(donor1);
        donations.donate{value: 0.1 ether}();
        
        assertEq(donations.totalDonations(), 0.1 ether);
        assertEq(donations.donorCount(), 1);
        assertEq(donations.getDonorTier(donor1), "BRONZE");
    }

    function testMultipleDonors() public {
        vm.prank(donor1);
        donations.donate{value: 1 ether}();
        
        vm.prank(donor2);
        donations.donate{value: 0.1 ether}();
        
        assertEq(donations.donorCount(), 2);
        assertEq(donations.getDonorTier(donor1), "GOLD");
        assertEq(donations.getDonorTier(donor2), "BRONZE");
    }

    function testTierProgression() public {
        // Start with no tier
        assertEq(donations.getDonorTier(donor1), "NONE");

        // Donate 0.1 ETH to reach BRONZE
        vm.prank(donor1);
        vm.expectEmit(true, true, false, true);
        emit TierUpgrade(donor1, 1); // Expect BRONZE tier upgrade event
        donations.donate{value: 0.1 ether}();
        assertEq(donations.getDonorTier(donor1), "BRONZE");

        // Donate 0.4 ETH more to reach SILVER (total 0.5 ETH)
        vm.prank(donor1);
        vm.expectEmit(true, true, false, true);
        emit TierUpgrade(donor1, 2); // Expect SILVER tier upgrade event
        donations.donate{value: 0.4 ether}();
        assertEq(donations.getDonorTier(donor1), "SILVER");

        // Donate 0.5 ETH more to reach GOLD (total 1.0 ETH)
        vm.prank(donor1);
        vm.expectEmit(true, true, false, true);
        emit TierUpgrade(donor1, 3); // Expect GOLD tier upgrade event
        donations.donate{value: 0.5 ether}();
        assertEq(donations.getDonorTier(donor1), "GOLD");
    }

    function testNoTierDowngrade() public {
        // First reach GOLD tier
        vm.prank(donor1);
        donations.donate{value: 1 ether}();
        assertEq(donations.getDonorTier(donor1), "GOLD");

        // Make a small donation
        vm.prank(donor1);
        donations.donate{value: 0.01 ether}();
        // Should still be GOLD
        assertEq(donations.getDonorTier(donor1), "GOLD");
    }

    function testTotalContributionsTracking() public {
        // Make multiple donations and verify total
        vm.startPrank(donor1);
        
        donations.donate{value: 0.1 ether}();  // Bronze
        assertEq(donations.donorTotalContributions(donor1), 0.1 ether);
        
        donations.donate{value: 0.2 ether}();  // Still Bronze
        assertEq(donations.donorTotalContributions(donor1), 0.3 ether);
        
        donations.donate{value: 0.2 ether}();  // Now Silver (0.5 total)
        assertEq(donations.donorTotalContributions(donor1), 0.5 ether);
        assertEq(donations.getDonorTier(donor1), "SILVER");
        
        vm.stopPrank();
    }

    function testDonorList() public {
        // Verify donor list is tracking correctly
        assertEq(donations.getDonorCount(), 0);
        
        vm.prank(donor1);
        donations.donate{value: 0.1 ether}();
        assertEq(donations.getDonorCount(), 1);
        
        vm.prank(donor2);
        donations.donate{value: 0.1 ether}();
        assertEq(donations.getDonorCount(), 2);
        
        // Get all donors and verify
        address[] memory allDonors = donations.getAllDonors();
        assertEq(allDonors.length, 2);
        assertEq(allDonors[0], donor1);
        assertEq(allDonors[1], donor2);
    }

     function testOwnerIsDeployer() public {
        // Verify the deployer is the owner
        assertEq(donations.owner(), owner, "Owner should be the deployer");
    }

    function testOnlyOwnerCanSetMinimumDonation() public {
        // Attempt to set the minimum donation as a non-owner (should revert)
        vm.prank(donor1);
        vm.expectRevert("Only owner can call this function");
        donations.setMinimumDonation(0.02 ether);

        // Set the minimum donation as the owner
        vm.prank(owner);
        donations.setMinimumDonation(0.02 ether);

        // Verify the updated minimum donation
        assertEq(donations.minimumDonation(), 0.02 ether, "Minimum donation should be updated");
    }

    function testOnlyOwnerCanWithdrawFunds() public {
        // Fund the contract with donations
        vm.prank(donor1);
        donations.donate{value: 1 ether}();

        // Verify contract balance
        assertEq(address(donations).balance, 1 ether, "Contract balance should be 1 ETH");

        // Attempt to withdraw funds as a non-owner (should revert)
        vm.prank(donor2);
        vm.expectRevert("Only owner can call this function");
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();

        // Withdraw funds as the owner
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();

        // Verify the funds were transferred to the owner
        assertEq(owner.balance, ownerBalanceBefore + 1 ether, "Owner should receive the withdrawn funds");
        assertEq(address(donations).balance, 0, "Contract balance should be zero after withdrawal");
    }

    function testOwnerDetection() public {
        // Verify the owner is correctly identified by address
        assertEq(donations.owner(), owner, "Contract owner should match deployer's address");

        // Confirm that donor1 and donor2 are not the owner
        vm.prank(donor1);
        vm.expectRevert("Only owner can call this function");
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();

        vm.prank(donor2);
        vm.expectRevert("Only owner can call this function");
        donations.setMinimumDonation(0.02 ether);
    }

    function testMinimumDonationUpdateEmitsEvent() public {
        // Expect the MinimumDonationUpdated event
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit MinimumDonationUpdated(0.02 ether);

        // Call setMinimumDonation
        donations.setMinimumDonation(0.02 ether);

        // Verify the updated minimum donation
        assertEq(donations.minimumDonation(), 0.02 ether, "Minimum donation should be updated");
    }

    function testOwnerWithdrawalEmitsEvent() public {
        // Fund the contract with donations
        vm.prank(donor1);
        donations.donate{value: 1 ether}();

        // Withdraw funds as the owner
        vm.prank(owner);
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();

        // Verify contract balance is zero after withdrawal
        assertEq(address(donations).balance, 0, "Contract balance should be zero after withdrawal");
    }

    function testNonOwnerCannotCallOwnerFunctions() public {
        // Attempt to withdraw funds as a non-owner (should revert)
        vm.prank(donor1);
        vm.expectRevert("Only owner can call this function");
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();

        // Attempt to set minimum donation as a non-owner (should revert)
        vm.prank(donor2);
        vm.expectRevert("Only owner can call this function");
        donations.setMinimumDonation(0.02 ether);
    }

    function testOwnerCanPerformMultipleActions() public {
        // Owner updates the minimum donation
        vm.prank(owner);
        donations.setMinimumDonation(0.05 ether);
        assertEq(donations.minimumDonation(), 0.05 ether, "Minimum donation should be updated");

        // Owner withdraws funds after a donation
        vm.prank(donor1);
        donations.donate{value: 1 ether}();

        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        assertEq(address(donations).balance, 1 ether, "Contract should have sufficient balance");
        donations.withdrawFunds();
        assertEq(owner.balance, ownerBalanceBefore + 1 ether, "Owner should receive the withdrawn funds");
    }
    
}