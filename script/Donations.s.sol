// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Donations} from "../src/Donations.sol";

contract DonationsScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy with 0.01 ether minimum donation
        Donations donations = new Donations(0.01 ether);

        vm.stopBroadcast();
    }
}