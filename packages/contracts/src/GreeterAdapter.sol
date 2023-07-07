// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapForwarderXReceiver} from "lib/chain-abstraction-integration/contracts/destination/xreceivers/Swap/SwapForwarderXReceiver.sol";
import {IGreeter} from "./Greeter.sol";

contract GreeterAdapter is SwapForwarderXReceiver {
  IGreeter public immutable greeter;

  constructor(address _connext, address _greeter) SwapForwarderXReceiver(_connext) {
    greeter = IGreeter(_greeter);
  }

  function _greetWithTokens(address _token, uint256 _amount, string memory _greeting) internal {
    IERC20 token = IERC20(_token);
    token.approve(address(greeter), _amount);
    greeter.greetWithTokens(_token, _amount, _greeting);
  }

  function _forwardFunctionCall(
    bytes memory _preparedData,
    bytes32 /*_transferId*/,
    uint256 /*_amount*/,
    address /*_asset*/
  ) internal override returns (bool) {
    (bytes memory _forwardCallData, uint256 _amountOut, ,) = abi.decode(
      _preparedData,
      (bytes, uint256, address, address)
    );
    (address _token, string memory _greeting) = abi.decode(_forwardCallData, (address, string));

    // Forward the call
    _greetWithTokens(_token, _amountOut, _greeting);

    return true;
  }
}
