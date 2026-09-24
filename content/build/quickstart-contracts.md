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
    // NVDA/USD on Arc mainnet: Squidlor's signed median, published during US market hours
    IAggregatorV3 public constant NVDA_USD =
        IAggregatorV3(0x5C792F2d7d350CFcA1661BC3d8d3B7F062Ed1bE5);

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

- **`answer <= 0`**: a non-positive price is never valid, and casting a negative `int256` to `uint256` produces an enormous number. This is how oracle-related exploits usually start.
- **`updatedAt`**: the timestamp is when the price was published on-chain. Choose `maxAge` from how often the feed actually updates, not from how often you read it.

## Use the health check

Squidlor adds `peek()` on top of the Chainlink interface: the answer, its freshest timestamp, and **how many sources were healthy** for it.

```solidity
interface ISquidlorAggregator {
    function peek() external view returns (int256 answer, uint256 freshestUpdatedAt, uint256 healthyCount);
}

contract LendingMarket {
    ISquidlorAggregator constant FEED =
        ISquidlorAggregator(0x7D86f28D1BBECf39f7BB192a1c26C7c19447E47C); // BTC/USD, Arc mainnet

    uint256 constant MIN_SOURCES = 1; // raise to 2 once a second source is added on Arc
    uint256 constant MAX_AGE = 30 minutes;

    error InsufficientSources(uint256 healthy, uint256 required);
    error StalePrice(uint256 age);

    /// @dev Use this in a liquidation path, and raise MIN_SOURCES the day a pair gains a second source.
    function priceForLiquidation() public view returns (uint256) {
        (int256 answer, uint256 updatedAt, uint256 healthyCount) = FEED.peek();
        if (healthyCount < MIN_SOURCES) revert InsufficientSources(healthyCount, MIN_SOURCES);
        uint256 age = block.timestamp - updatedAt;
        if (age > MAX_AGE) revert StalePrice(age);
        return uint256(answer);
    }
}
```

Note that `peek()` itself reverts with `InsufficientHealthySources(healthy, required)` when the aggregator's own minimum is not met; the feed refuses to serve a number it does not stand behind. Your `MIN_SOURCES` is a stricter check layered on top for paths where being wrong is expensive. Every Arc pair runs `minHealthySources = 1` today, because no third-party push oracle publishes on Arc yet; a consumer hardcoding 2 would revert on every read until a second source is added. See the [trust model](/resources/trust-model).

## Resolve addresses at runtime

Hardcoding an address is fine and cheapest. If you want new pairs without a redeploy, read the registry:

```solidity
interface IAggregatorRegistry {
    function getAggregatorByName(string calldata pairName) external view returns (address);
}

contract DynamicConsumer {
    IAggregatorRegistry constant REGISTRY =
        IAggregatorRegistry(0x3c8552764DC0f8719cC6cedab81C4659E18D9574); // Arc mainnet

    function priceOf(string calldata pair) external view returns (int256) {
        address feed = REGISTRY.getAggregatorByName(pair);
        require(feed != address(0), "unknown pair");
        (, int256 answer, , , ) = IAggregatorV3(feed).latestRoundData();
        return answer;
    }
}
```

The registry is admin-gated for writes, so a pair cannot be repointed by anyone but us, but that also means you are trusting our admin key on top of the feed itself. For a single well-known pair, the constant is the tighter choice.

## Addresses

Full list on [deployed addresses](/networks/addresses), which is generated from the deployment
manifest. Arc mainnet (5042):

| Pair | Aggregator |
|---|---|
| BTC/USD | `0x7D86f28D1BBECf39f7BB192a1c26C7c19447E47C` |
| ETH/USD | `0x9cEb5c840C618Ea4d219488D6b0516750A1dF3CE` |
| SOL/USD | `0xFF27feF2c5584Af8b13e3E630F161cc34c084E8A` |
| NVDA/USD | `0x5C792F2d7d350CFcA1661BC3d8d3B7F062Ed1bE5` |
| TSLA/USD | `0x83A54C02Cd6D01E2f722E8315F3F153f8C1dE82a` |
| AAPL/USD | `0x0062E0D202E595024A3a9C76c1621F3683f06f19` |
| GOOGL/USD | `0xf1FC679bd35cFD2155DCD3dbc9542435C2AfF2c4` |
| Registry | `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` |

Arc Testnet uses different addresses and is not listed here. Resolve them from the testnet
registry at `0x610cC0E643dF3DC452929cfD0A4ADCdDB406B587`; see
[building against testnet](/networks/arc#building-against-testnet).

All feeds are 8 decimals.

## Equity feeds close

`NVDA`, `TSLA`, `AAPL` and `GOOGL` track US equities and stop updating when those markets close. A `maxAge` of 30 minutes will revert every weekend.

Either widen `maxAge` for equity pairs, or gate on market hours explicitly. Do not paper over it by removing the staleness check.

## Register your contract

Once deployed, add your consumer address to your project at [build.squidlor.com](https://build.squidlor.com). We verify that the contract genuinely references a Squidlor aggregator (by scanning its bytecode and storage), and a verified on-chain consumer earns a **2× multiplier** on usage points in [Season 0](/build/rewards).

## Ready-made

[`squidlor-lending-example`](/build/templates) is a Foundry project implementing stock-collateral lending with fork tests against the live feeds.
