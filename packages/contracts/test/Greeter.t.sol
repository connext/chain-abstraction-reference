// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Greeter.sol";

contract GreeterTest is Test {
    Greeter public greeter;
    address WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;

    function setUp() public {
        greeter = new Greeter(WETH);
    }
}
