// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IWeth {
    function deposit() external payable;

    function withdraw(uint256 value) external;
}
