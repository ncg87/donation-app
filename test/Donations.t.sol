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

    function setUp() public {
        owner = address(this);
        donor1 = makeAddr("donor1");
        donor2 = makeAddr("donor2");
        
        // Deploy with 0.01 ether minimum donation
        donations = new Donations(0.01 ether);
        
        // Fund test addresses
        vm.deal(donor1, 10 ether);
        vm.deal(donor2, 10 ether);
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
}