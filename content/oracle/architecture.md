---
title: Aggregation architecture
description: Three independently-optional layers of aggregation — source, signer, and cross-oracle — each defending against a different way an oracle goes wrong.
---

Most oracles aggregate once. Squidlor aggregates three times, because there are three different things that can go wrong:

- **Bad data** — a venue prints a wick, an API returns a stale quote. Defended by *source aggregation*.
- **A bad operator** — a signing key is compromised or lies. Defended by *signer aggregation*.
- **A bad oracle network** — an entire provider stalls, halts, or is wrong. Defended by *cross-oracle aggregation*.

Each layer is independently optional. A deployment can run any subset; the live deployment runs all three.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — OFF-CHAIN SOURCE AGGREGATION                                 │
│   Binance · Coinbase · Gate.io · Bybit · Arbitrum hub (crypto)         │
│   Yahoo Finance · Nasdaq (+ Finnhub / Twelve Data) (equities)          │
│                        │  relayer medians, signs {feedId, price, ts}   │
└────────────────────────┼───────────────────────────────────────────────┘
                         ▼  updateDataFeedsValues([feedIds], ts, [packets])
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — ON-CHAIN SIGNER AGGREGATION                                  │
│   OracleVerifier: ECDSA-recovers each signer, bitmap-dedupes against   │
│   the authorized set, requires ≥ M-of-N distinct signers, medians the  │
│   verified values → SquidlorAdapter stores canonical per-asset round   │
└────────────────────────┼───────────────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — CROSS-ORACLE AGGREGATION                                     │
│   SquidSource · ChainlinkSource · (PythSource, etc. where wired)       │
│                        │                                               │
│            SquidlorOracleAggregator                                    │
│   • drops stale/unhealthy sources · medians the rest                   │
│   • exposes standard Chainlink AggregatorV3Interface                   │
└────────────────────────┼───────────────────────────────────────────────┘
                         ▼
              Consumers: DeFi protocols, resolvers, anyone reading
              via the standard Chainlink interface
```

## Layer 1 — off-chain source aggregation

The relayer fetches the same asset from several independent venues and medians them before anything touches a chain.

For crypto, the sources medianed per pair in the live deployment:

| Pair | Sources |
| --- | --- |
| BTC/USD, ETH/USD, SOL/USD | Arbitrum hub + Binance + Coinbase + Gate.io + Bybit (5) |
| BNB/USD | Binance + Gate.io + Bybit (3) |
| XRP/USD | Binance + Coinbase + Gate.io + Bybit (4) |

For equities, the relay medians free market-data APIs and pushes during US market hours only.

**What this layer buys you:** a single venue printing a bad tick — a thin-book wick, a stuck API — does not become the on-chain price. The median absorbs it.

**What it does not buy you:** if the relayer itself is wrong or malicious, every source it reports is equally suspect. That is Layer 2's problem.

## Layer 2 — on-chain signer aggregation

The relayer signs each price packet: `{feedId, price, timestamp}`. `OracleVerifier` then, on-chain:

1. ECDSA-recovers the signer address from each signature.
2. Checks it against the authorized signer set, using a **bitmap** so the same key cannot be counted twice within one update.
3. Requires at least **M distinct signers** before accepting a value.
4. Medians the verified values.
5. Stores the result as the canonical per-asset round in `SquidlorAdapterV2`.

Two bounds are enforced here regardless of any other configuration: a packet older than **3 minutes** is rejected, and so is one future-dated by more than **1 minute**.

**What this layer buys you:** with a real M-of-N set, one compromised key cannot publish a price.

> [!WARNING]
> The live deployment runs **1-of-1** — a single operator key. The M-of-N machinery is built and enforced, but with N=1 this layer currently provides no protection against operator compromise. Expanding the signer set is an operational step; see the [trust model](/resources/trust-model).

## Layer 3 — cross-oracle aggregation

`SquidlorOracleAggregator` (one instance per pair) treats every oracle network as just another source behind a uniform adapter interface. It reads them all, drops the unhealthy ones, and medians the rest.

On Robinhood Chain, BTC/USD and ETH/USD each combine a `ChainlinkSource` with a `SquidSource`. SOL/USD is Squidlor-only, because chain 4663 has no Chainlink SOL feed. The four equity pairs are currently Chainlink-only.

**What this layer buys you:** an entire oracle network can halt, stall, or go wrong without taking your price with it. The aggregator's worst case is falling back to a single healthy source — so it can never be worse than its best constituent.

## Design decisions worth knowing

**Pure EVM, no precompile dependencies.** Works on any chain with Solidity ≥ 0.8 and standard `ecrecover`. This is why chain expansion is a deploy rather than a port.

**Storage slots derived from the feed ID.** Slots are `keccak256(abi.encode(feedId, "squid.price"))` rather than positions in a contract layout. That is collision-safe across proxy upgrades, so assets can be added without any storage migration.

**One transaction updates every asset.** `updateDataFeedsValues([feedIds], timestamp)` batches all feeds into a single relayer-paid transaction, which is what makes a wide asset list economically viable.

**Adapters, not aggregator changes.** Every oracle network is a thin `*Source.sol` implementing `latestPrice()` and `name()`. Adding a provider is deploy-adapter-then-`addSource()`. `SquidlorOracleAggregator` itself never changes.

**Median, not mean — at every layer.** A mean is moved by any outlier. A median only moves if the median voter moves.

**Per-asset proxies are stateless Chainlink-compatible facades.** Existing protocols treat a `SquidPriceFeed` as an ordinary Chainlink oracle. Zero code changes on the consumer side.

## Reading the result

Consumers read the aggregator directly on-chain through the Chainlink interface, or off-chain through the [API](/api) — both paths read the same underlying state, so they cannot disagree beyond the API's cache TTL.

See [consumer interface](/oracle/interface) for the exact function surface.
