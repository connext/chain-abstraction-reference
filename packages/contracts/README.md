# Deploy Contracts

Uses Forge scripting to deploy, verify, and run various tasks on contracts. By default the commands are set to act on Polygon contracts.

## Greeter

Deploy

```
forge script script/DeployGreeter.s.sol:DeployGreeter --sig 'run(address)' 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619 --rpc-url https://polygon.llamarpc.com --broadcast
```

Verify

```
forge verify-contract <greeter> src/Greeter.sol:Greeter --chain polygon --etherscan-api-key TSM16EF48RZEQAESQBVMJ1S74DD2NZYZIZ --constructor-args $(cast abi-encode "constructor(address)" 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619)
```

## GreeterAdapter

Deploy

```
forge script script/DeployGreeterAdapter.s.sol:DeployGreeterAdapter --sig 'run(address,address)' 0x11984dc4465481512eb5b777E44061C158CF2259 <greeter> --rpc-url https://polygon.llamarpc.com --broadcast
```

Verify

```
forge verify-contract <greeter_adapter> src/GreeterAdapter.sol:GreeterAdapter --chain polygon --etherscan-api-key TSM16EF48RZEQAESQBVMJ1S74DD2NZYZIZ --constructor-args $(cast abi-encode "constructor(address,address)" 0x11984dc4465481512eb5b777E44061C158CF2259 <greeter>)
```

Add Swapper 

```
forge script script/AddSwapper.s.sol:AddSwapper --sig 'run(address,address)' <greeter_adapter> 0xeC345E9be52f0Fca8aAd6aec3254Ed86151b060d --chain 137 --rpc-url https://polygon.llamarpc.com --broadcast
```

Check that Swapper was added

```
cast call <greeter_adapter> "allowedSwappers(address)" 0xeC345E9be52f0Fca8aAd6aec3254Ed86151b060d --rpc-url https://polygon.llamarpc.com
```

