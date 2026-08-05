---
title: Contract quickstart
description: Read a Squidlor feed from Solidity with the staleness and health checks a lending market actually needs.
---

Squidlor aggregators implement Chainlink's `AggregatorV3Interface`. If your contract already reads a Chainlink feed, the change is one address.

## The minimum

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

contract PriceConsumer {
    // NVDA/USD on Robinhood Chain (4663)
    IAggregatorV3 public constant NVDA_USD =
        IAggregatorV3(0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91);

    error StalePrice(uint256 updatedAt, uint256 maxAge);
    error BadPrice(int256 answer);

    /// @notice Latest NVDA/USD price, 8 decimals, reverting if older than `maxAge` seconds.
    function nvdaPrice(uint256 maxAge) external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = NVDA_USD.latestRoundData();
        if (answer <= 0) revert BadPrice(answer);
        if (block.timestamp - updatedAt > maxAge) revert StalePrice(updatedAt, maxAge);
        return uint256(answer);
    }
}
```

Two checks that are not optional:

- **`answer <= 0`** — a non-positive price is never valid, and casting a negative `int256` to `uint256` produces an enormous number. This is how oracle-related exploits usually start.
- **`updatedAt`** — the timestamp is when the price was published on-chain. Choose `maxAge` from how often the feed actually updates, not from how often you read it.

## Use the health check

Squidlor adds `peek()` on top of the Chainlink interface: the answer, its freshest timestamp, and **how many sources were healthy** for it.

```solidity
interface ISquidlorAggregator {
    function peek() external view returns (int256 answer, uint256 freshestUpdatedAt, uint256 healthyCount);
}

contract LendingMarket {
    ISquidlorAggregator constant FEED =
        ISquidlorAggregator(0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF); // BTC/USD, 4663

    uint256 constant MIN_SOURCES = 2;
    uint256 constant MAX_AGE = 30 minutes;

    error InsufficientSources(uint256 healthy, uint256 required);
    error StalePrice(uint256 age);

    /// @dev Use this in a liquidation path. One source agreeing with itself is not consensus.
    function priceForLiquidation() public view returns (uint256) {
        (int256 answer, uint256 updatedAt, uint256 healthyCount) = FEED.peek();
        if (healthyCount < MIN_SOURCES) revert InsufficientSources(healthyCount, MIN_SOURCES);
        uint256 age = block.timestamp - updatedAt;
        if (age > MAX_AGE) revert StalePrice(age);
        return uint256(answer);
    }
}
```

Note that `peek()` itself reverts with `InsufficientHealthySources(healthy, required)` when the aggregator's own minimum is not met — the feed refuses to serve a number it does not stand behind. Your `MIN_SOURCES` is a stricter check layered on top for paths where being wrong is expensive.

## Resolve addresses at runtime

Hardcoding an address is fine and cheapest. If you want new pairs without a redeploy, read the registry:

```solidity
interface IAggregatorRegistry {
    function getAggregatorByName(string calldata pairName) external view returns (address);
}

contract DynamicConsumer {
    IAggregatorRegistry constant REGISTRY =
        IAggregatorRegistry(0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a); // 4663

    function priceOf(string calldata pair) external view returns (int256) {
        address feed = REGISTRY.getAggregatorByName(pair);
        require(feed != address(0), "unknown pair");
        (, int256 answer, , , ) = IAggregatorV3(feed).latestRoundData();
        return answer;
    }
}
```

The registry is admin-gated for writes, so a pair cannot be repointed by anyone but us — but that also means you are trusting our admin key on top of the feed itself. For a single well-known pair, the constant is the tighter choice.

## Addresses

Full list on [deployed addresses](/networks/addresses). Robinhood Chain (4663):

| Pair | Aggregator |
|---|---|
| BTC/USD | `0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF` |
| ETH/USD | `0xc0B5AEb320Cb31fB51F17c823157aCECeF225b6E` |
| SOL/USD | `0xf3B44eDd2Dd256179C79f5772d68Ca943645F38d` |
| NVDA/USD | `0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91` |
| TSLA/USD | `0x7d3A942f0Ac45d5B78e5cDFC8fF99D0CdaD1e059` |
| AAPL/USD | `0xB7227458A404EfaE56FC9A830C8Ca7Ff5aa0140e` |
| GOOGL/USD | `0xf6EB4A09Dff938cA857DB11E9B331abBdDdef1B8` |
| Registry | `0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a` |

All feeds are 8 decimals.

## Equity feeds close

`NVDA`, `TSLA`, `AAPL` and `GOOGL` track US equities and stop updating when those markets close. A `maxAge` of 30 minutes will revert every weekend.

Either widen `maxAge` for equity pairs, or gate on market hours explicitly. Do not paper over it by removing the staleness check.

## Register your contract

Once deployed, add your consumer address to your project at [build.squidlor.com](https://build.squidlor.com). We verify that the contract genuinely references a Squidlor aggregator (by scanning its bytecode and storage), and a verified on-chain consumer earns a **2× multiplier** on usage points in [Season 0](/build/rewards).

## Ready-made

[`squidlor-lending-example`](/build/templates) is a Foundry project implementing stock-collateral lending on Robinhood Chain with fork tests against the live feeds.
