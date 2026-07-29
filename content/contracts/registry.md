---
title: Aggregator registry
description: Resolve aggregator addresses by pair name on-chain, so integrations don't hardcode addresses.
---

`AggregatorRegistry` maps pair names to aggregator addresses. It exists so that a consumer — a contract, an SDK, or a frontend — can discover a feed by name instead of shipping a hardcoded address per chain.

It is **UUPS-upgradeable**, deployed behind a proxy.

## Interface

```solidity
interface IAggregatorRegistry {
    /// @param pairName e.g. "BTC/USD"
    /// @return the SquidlorOracleAggregator address, or address(0) if unregistered
    function getAggregatorByName(string calldata pairName)
        external
        view
        returns (address);
}
```

Registered pair names use the canonical uppercase slash form: `BTC/USD`, `NVDA/USD`.

## Resolving a feed in a contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAggregatorRegistry {
    function getAggregatorByName(string calldata pairName) external view returns (address);
}

interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
}

contract RegistryConsumer {
    IAggregatorRegistry public immutable registry;

    error FeedNotRegistered(string pair);

    constructor(address registryAddress) {
        registry = IAggregatorRegistry(registryAddress);
    }

    function priceOf(string calldata pair) external view returns (int256) {
        address aggregator = registry.getAggregatorByName(pair);
        // An unregistered pair returns the zero address rather than reverting.
        if (aggregator == address(0)) revert FeedNotRegistered(pair);

        (, int256 answer, , , ) = IAggregatorV3(aggregator).latestRoundData();
        return answer;
    }
}
```

> [!IMPORTANT]
> `getAggregatorByName` returns `address(0)` for an unknown pair — it does not revert. Calling into the zero address does not fail the way you might hope, so check the return value explicitly. The `if (aggregator == address(0)) revert` line above is not optional defensiveness.

## Trade-off: registry lookup versus a hardcoded address

Worth deciding deliberately rather than by default.

| | Registry lookup | Hardcoded address |
| --- | --- | --- |
| Gas | An extra external call per read | None |
| New pairs | Available without redeploying your contract | Requires a redeploy |
| Address migration | The registry owner can repoint a pair | You are pinned to one address |
| Trust surface | Also trusts the registry's `superAdmin` | Only the aggregator's owner |

The last row is the one that matters. Resolving through the registry means the registry admin can change which contract your protocol reads from. That is convenient for operations and an additional trust assumption for you.

**Recommendation:** for high-value on-chain logic, resolve the address once — off-chain or at deployment — and store it immutably. Use the registry for discovery, tooling, and frontends, where flexibility is worth more than pinning.

## Live deployment

On Robinhood Chain the registry registers all seven live pairs. Proxy and implementation addresses are in [deployed addresses](/networks/addresses).

`superAdmin` is the deployer address, the same account that owns the aggregators.

## Off-chain resolution

The [Oracle SDK](/integration/sdk) supports registry resolution through `getFeedViaRegistry`, and the [API](/api/feeds#list-feeds) returns each feed's aggregator address in its response — so neither needs a hardcoded map either.
