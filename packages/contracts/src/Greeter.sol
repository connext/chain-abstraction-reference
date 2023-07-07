// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGreeter {
  function greetWithTokens(address _token, uint256 _amount, string calldata _greeting) external;
}

contract Greeter is IGreeter {
  string public greeting;
  IERC20 public WETH;

  event GreetingUpdated(string _greeting);

  constructor(address _WETH) {
    WETH = IERC20(_WETH);
  }

  function greetWithTokens(address _token, uint256 _amount, string calldata _greeting) external override {
    IERC20 token = IERC20(_token);

    require(_token == address(WETH), "Token must be WETH");
    require(_amount > 0, "Amount cannot be zero");
    require(
      token.allowance(msg.sender, address(this)) >= _amount,
      "User must approve amount"
    );

    token.transferFrom(msg.sender, address(this), _amount);

    greeting = _greeting;
    emit GreetingUpdated(_greeting);
  }
}
