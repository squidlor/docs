---
title: Read prices on-chain
description: Production-ready patterns for consuming Squidlor feeds from Solidity, including the staleness trap that catches most integrations.
---

Squidlor aggregators implement Chainlink's `AggregatorV3Interface`, so a migration is one address change. Getting it *right* takes a little more care, and this page is about the parts that are easy to get wrong.

## The interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
}

/// Squidlor's richer read: price plus the health data behind it.
interface ISquidlorAggregator is IAggregatorV3 {
    function peek()
        external
        view
        returns (
            int256 answerValue,
            uint256 freshestUpdatedAt,
            uint256 healthyCount
        );
    function sourceCount() external view returns (uint256);
    function poke() external returns (uint80 roundId, int256 answer);
}
```

## The staleness trap

This is the one thing to take away from this page.

`latestRoundData()` has two behaviours on a Squidlor aggregator:

- If `poke()` has been called at least once, it returns the last **committed round**, and `updatedAt` is when that round was committed.
- If it has never been called, it returns a **live aggregate** stamped with `block.timestamp`.

In the second case, `updatedAt == block.timestamp`, so:

```solidity
// BROKEN on a feed with no committed rounds: this check can never fail,
// because updatedAt is the time of *this* call, not of the data.
require(block.timestamp - updatedAt <= 1 hours, "stale");
```

You have written a staleness check that always passes, on a feed that might be reading a source that stopped updating days ago.

> [!DANGER]
> A staleness check against `latestRoundData().updatedAt` provides no protection unless you have verified that rounds are actually being committed on that feed. Check `latestRoundId()`: if it is `0`, no round has ever been committed.

### The fix: use `peek()`

`peek()` returns the freshest timestamp **among the underlying sources**, which is real data age:

```solidity
(int256 answer, uint256 freshestUpdatedAt, uint256 healthyCount) = aggregator.peek();

require(answer > 0, "invalid price");
require(block.timestamp - freshestUpdatedAt <= maxAge, "stale price");
require(healthyCount >= minSources, "insufficient sources");
```

## Recommended pattern

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISquidlorAggregator {
    function decimals() external view returns (uint8);
    function peek()
        external
        view
        returns (int256 answerValue, uint256 freshestUpdatedAt, uint256 healthyCount);
}

/// @notice Reads a Squidlor feed with explicit freshness and source-agreement bounds.
contract SquidlorPriceReader {
    ISquidlorAggregator public immutable aggregator;

    /// Maximum acceptable data age. Set per asset class, since crypto and equities
    /// have very different natural cadences.
    uint256 public immutable maxAge;

    /// Minimum sources that must agree. The aggregator's own floor is 1, which
    /// is chosen for availability; a protocol with real money at risk should
    /// insist on more where the feed has more.
    uint256 public immutable minHealthySources;

    error InvalidPrice(int256 answer);
    error StalePrice(uint256 updatedAt, uint256 age);
    error InsufficientSources(uint256 healthyCount, uint256 required);

    constructor(address aggregator_, uint256 maxAge_, uint256 minHealthySources_) {
        aggregator = ISquidlorAggregator(aggregator_);
        maxAge = maxAge_;
        minHealthySources = minHealthySources_;
    }

    /// @return price 8-decimal price
    /// @return updatedAt freshest source timestamp behind that price
    function readPrice() public view returns (uint256 price, uint256 updatedAt) {
        (int256 answer, uint256 freshestUpdatedAt, uint256 healthyCount) =
            aggregator.peek();

        if (answer <= 0) revert InvalidPrice(answer);
        if (healthyCount < minHealthySources) {
            revert InsufficientSources(healthyCount, minHealthySources);
        }

        // Guard against a source timestamped slightly ahead of this block;
        // the adapter tolerates up to a minute of clock drift, and unsigned
        // subtraction would underflow into an enormous "age".
        uint256 age = block.timestamp > freshestUpdatedAt
            ? block.timestamp - freshestUpdatedAt
            : 0;
        if (age > maxAge) revert StalePrice(freshestUpdatedAt, age);

        return (uint256(answer), freshestUpdatedAt);
    }

    /// @notice Converts a token amount into its USD value, 18-decimal fixed point.
    function valueOf(uint256 amount, uint8 tokenDecimals)
        external
        view
        returns (uint256)
    {
        (uint256 price, ) = readPrice();
        uint8 priceDecimals = aggregator.decimals(); // 8 for every Squidlor feed

        // Normalize to 18 decimals in one expression to avoid intermediate
        // truncation on small amounts.
        return (amount * price * 1e18) / (10 ** tokenDecimals) / (10 ** priceDecimals);
    }
}
```

## Choosing `maxAge`

There is no universal answer; it depends on the feed's cadence and on what a stale price would cost you.

| Feed type | Suggested `maxAge` | Why |
| --- | --- | --- |
| Crypto, Base | 15–30 minutes | The relay pushes on a 0.5% move or a 300 s heartbeat, and the Squidlor leg's on-chain window is 600 s. A bound under 10 minutes will trip on normal operation; one over an hour is looser than the feed. |
| Crypto, Robinhood Chain | 1–3 hours | The relay there runs a 1-hour heartbeat when active, and is paused as of September 2026, so the Chainlink leg (1-hour heartbeat) sets the cadence. |
| Tokenized equity | 48–72 hours | No updates overnight or at weekends. Chainlink's 24h heartbeat backs the feed. |
| Anything liquidating positions | As tight as the cadence allows | A stale price here costs users money. |

> [!WARNING]
> A too-tight `maxAge` is its own failure mode: your protocol halts during ordinary operation. A too-loose one lets you act on a price that no longer reflects reality. Pick from the feed's actual cadence (see [price feeds & assets](/oracle/feeds)), not from a number that feels safe.

## Choosing `minHealthySources`

Read `sourceCount()` for the feed and set your floor relative to it:

| Feed | Sources | Reasonable floor |
| --- | --- | --- |
| Base: BTC/USD, ETH/USD, SOL/USD | Chainlink + Squidlor, both pushed | 2, insist on agreement |
| Base: VIRTUAL/USD and the equity pairs | Chainlink + Squidlor, the Chainlink leg on a 24h heartbeat | 1, and read `updatedAt`; the pair itself runs at 1 |
| Robinhood: every pair but SOL/USD | Chainlink + Squidlor, Squidlor's relay paused | 1 until the relay resumes |
| Robinhood: SOL/USD | Squidlor only, paused | Unreadable today; `peek()` reverts |

> [!IMPORTANT]
> Demanding `healthyCount >= 2` on a feed with one healthy source makes it permanently unreadable. Check `sourceCount()` and `peek()` before choosing your floor, and revisit it when a chain's relay state changes. The [price feeds](/oracle/feeds) page carries the per-chain table.

## Migrating from Chainlink

If you already read a Chainlink feed, the mechanical change is the address. Two things are worth doing at the same time:

```solidity
// Before
AggregatorV3Interface feed = AggregatorV3Interface(CHAINLINK_BTC_USD);
(, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();

// After: same interface, plus the health data Chainlink cannot give you
ISquidlorAggregator feed = ISquidlorAggregator(SQUIDLOR_BTC_USD);
(int256 answer, uint256 updatedAt, uint256 healthyCount) = feed.peek();
```

Both are 8 decimals, so no scaling changes. The upgrade is moving from `latestRoundData` to `peek`, which gets you a real timestamp and a source count.

## Committing rounds

If your protocol needs a stable round ID to settle against, so you can prove *which* price you acted on, call `poke()` first:

```solidity
(uint80 roundId, int256 answer) = aggregator.poke();
// roundId is now replayable via getRoundData(roundId)
```

`poke()` is permissionless and writes state, so it costs gas. Only settlement and indexing paths generally need it.

## Reading the Squidlor feed alone

To read Squidlor's own price without the cross-oracle layer, point at the pair's [`SquidPriceFeed`](/contracts/price-feed). There, `latestRoundData().updatedAt` *is* a genuine publish timestamp; the trap above does not apply, because a price feed proxy has no live-read mode.

You are also giving up Layer 3 protection entirely. Do this only when you specifically want the single source.
