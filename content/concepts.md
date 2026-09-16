---
title: Core concepts
description: The vocabulary the rest of these docs assumes: sources, adapters, aggregators, feeds, rounds, staleness, and selection modes.
---

Squidlor uses a handful of terms precisely. Getting them straight makes the rest of the documentation much shorter.

## Feed

A **feed** is a named price series, identified by a pair like `BTC/USD` or `NVDA/USD`. A feed is the thing you want; everything below is machinery for producing it trustworthily.

Feeds carry a fixed number of **decimals**: 8 across the whole Squidlor deployment, matching Chainlink's convention for USD pairs. A value of `6343490498170` at 8 decimals is `63434.90498170`.

## Source

A **source** is one independent origin of a price. Sources come in two flavours:

- **Off-chain sources**: the venues and data providers a relayer reads before it publishes: Coinbase, Binance, Bybit, Gate.io, Kraken and OKX for crypto; Yahoo Finance and Nasdaq (optionally Finnhub and Twelve Data) for equities.
- **On-chain sources**: other oracle networks already publishing on the host chain, chiefly Chainlink, plus Squidlor's own published feed.

The distinction matters because they are aggregated at different layers. See [aggregation architecture](/oracle/architecture).

## Adapter

An **adapter** is a thin contract that makes an on-chain source readable in one uniform shape. Every adapter implements the same two functions:

```solidity
interface IPriceSource {
    /// @return price   the source's latest answer, normalized to the feed's decimals
    /// @return updatedAt the source's own timestamp for that answer
    function latestPrice() external view returns (int256 price, uint256 updatedAt);

    /// @return a human-readable label, e.g. "chainlink" or "squidlor"
    function name() external view returns (string memory);
}
```

`ChainlinkSource` wraps a Chainlink aggregator, `SquidSource` wraps a Squidlor price feed, and so on. Adding a new oracle network means writing one adapter and calling `addSource`, never modifying the aggregator itself.

## Aggregator

A **`SquidlorOracleAggregator`** is one contract per pair. It holds an ordered list of sources, reads them all, discards the unhealthy ones, and combines what remains into a single answer. It is the contract your protocol should read.

It exposes the standard Chainlink `AggregatorV3Interface`, so existing consumers need no code change, only a new address.

## Selection mode

How an aggregator combines its healthy sources:

| Mode | Behaviour |
| --- | --- |
| `MEDIAN` | Sort the healthy answers and take the middle one. Moving the result requires moving the median voter, not just any single source. This is the mode used across the live deployment. |
| `PRIMARY_WITH_FALLBACK` | Use source 0 while it is healthy; fall back down the ordered list otherwise. Useful when one source is authoritative and the rest exist only as a safety net. |

Squidlor medians rather than averages at every layer, deliberately: a mean is moved by any outlier, a median only by the median voter.

## Health and staleness

A source is **healthy** when it returns a readable answer whose `updatedAt` is within the staleness window that applies to it: a per-source `maxStaleness`, or the aggregator's `defaultMaxStaleness` when the per-source value is zero.

Unhealthy sources are simply excluded. An aggregator publishes an answer as long as at least `minHealthySources` remain; below that threshold, reads revert rather than return a number nobody stands behind.

> [!WARNING]
> A healthy aggregator is not the same as a fresh price for *your* use case. The aggregator enforces its own window; your protocol must enforce the window its own risk tolerates. See [read prices on-chain](/integration/reading-prices).

Two related bounds live one layer lower, in the signer layer: Squidlor rejects price packets older than **3 minutes** or future-dated by more than **1 minute**, independent of any aggregator setting.

## Round

A **round** is a committed, numbered answer stored on-chain, in the Chainlink sense. Squidlor supports both styles of read:

- **Live reads** (`peek()`, and `latestRoundData()` before any round is committed) compute the aggregate from the sources at call time. Nothing is written.
- **Committed rounds** are created by calling `poke()`, which is permissionless. Indexers and settlement logic that need a stable, replayable round ID use these; `getRoundData(roundId)` reads them back.

Nobody needs to call `poke()` for prices to work. It exists for consumers that need a persisted identifier rather than a live number.

## Signer set

The **signer set** is the group of keys authorized to publish prices into Squidlor's own feed at the signer layer. `OracleVerifier` ECDSA-recovers each signature, dedupes against the authorized set with a bitmap so one key cannot be counted twice, and requires at least *M* distinct signers before it accepts a value.

> [!NOTE]
> The live deployment runs a 1-of-1 signer set, a single operator key. The contracts enforce M-of-N today; expanding to independent signers is an operational step, not a code change. The [trust model](/resources/trust-model) states plainly what this means for you.

## Relayer

The **relayer** is the off-chain service that reads sources, medians them, signs the result, and pays the gas to publish it. Squidlor is a **push** oracle: consumers read for free, and the relayer bears the update cost. One transaction updates every feed at once.

## Resolver

A **resolver** answers "did event Y happen?" rather than "what is the price of X?". It reads an oracle feed and turns it into a settled outcome. A price-threshold resolver compares a feed against a level, while event resolvers for sports, weather, and custom outcomes follow the same shape. See [resolver oracles](/oracle/resolver-oracles).
