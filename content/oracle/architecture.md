---
title: Aggregation architecture
description: Three independently-optional layers of aggregation (source, signer, and cross-oracle), each defending against a different way an oracle goes wrong.
---

Most oracles aggregate once. Squidlor aggregates three times, because there are three different things that can go wrong:

- **Bad data**: a venue prints a wick, an API returns a stale quote. Defended by *source aggregation*.
- **A bad operator**: a signing key is compromised or lies. Defended by *signer aggregation*.
- **A bad oracle network**: an entire provider stalls, halts, or is wrong. Defended by *cross-oracle aggregation*.

Each layer is independently optional. A deployment can run any subset; the live deployment runs all three.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: OFF-CHAIN SOURCE AGGREGATION                                   │
│   Binance · Coinbase · Gate.io · Bybit · Arbitrum hub (crypto)         │
│   Yahoo Finance · Nasdaq (+ Finnhub / Twelve Data) (equities)          │
│                        │  relayer medians, signs {feedId, price, ts}   │
└────────────────────────┼───────────────────────────────────────────────┘
                         ▼  updateDataFeedsValues([feedIds], ts, [packets])
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: ON-CHAIN SIGNER AGGREGATION                                    │
│   OracleVerifier: ECDSA-recovers each signer, bitmap-dedupes against   │
│   the authorized set, requires ≥ M-of-N distinct signers, medians the  │
│   verified values → SquidlorAdapter stores canonical per-asset round   │
└────────────────────────┼───────────────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: CROSS-ORACLE AGGREGATION                                       │
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

## Layer 1: off-chain source aggregation

The relayer fetches the same asset from several independent venues and medians them before anything touches a chain.

For crypto, the sources medianed per pair in the live deployment:

| Pair | Sources |
| --- | --- |
| BTC/USD, ETH/USD, SOL/USD | Arbitrum hub + Binance + Coinbase + Gate.io + Bybit (5) |
| BNB/USD | Binance + Gate.io + Bybit (3) |
| XRP/USD | Binance + Coinbase + Gate.io + Bybit (4) |

For equities, the relay medians free market-data APIs and pushes during US market hours only.

**What the Arbitrum hub actually contributes.** The hub is a `SquidlorOracleAggregator` of the same kind described in Layer 3, and it is frequently described as a Chainlink + Pyth + DIA median. Measured on 2026-08-05, that overstates it. BTC/USD runs in `PRIMARY_WITH_FALLBACK` mode, so it returns its first healthy source (Chainlink) and never medians at all. Its Pyth source is enabled but 25.8 h behind, and DIA, RedStone, API3, Chronicle and Stork are all disabled on-chain. ETH/USD does median, but only Chainlink and the Uniswap V3 TWAP were inside their windows at read time; SOL/USD reduced to Chainlink alone. So the hub reads today as **Chainlink, with a TWAP cross-check on two pairs**, one venue in the relay's five, not a pre-medianed composite of three oracle networks.

That is not fatal to Layer 1: the four CEX reads are independent of it, and the median only needs the hub to be *a* source, not a good one. But nothing should be described as defended by cross-oracle aggregation on the strength of the hub. The per-source measurements, and the two configuration bugs behind them, are recorded in `aggregator-contract/docs/HUB_SOURCE_STATE.md`.

**How the price is computed.** A dedicated `price-stream` service holds live WebSocket connections to the venues and publishes a fresh median **every second**. The relay reads that same number, so the price a chart shows and the price a contract stores cannot disagree about what the market did, only about when it was last published. See [realtime prices](/api/realtime) for the consumer side. The relay keeps a REST fallback and does not hard-depend on the stream: it is the process that keeps the oracle alive.

**When it publishes.** Off-chain updates every second; on-chain updates only on a trigger, the same rule every production push oracle uses. A feed goes on-chain when it has moved **≥ 0.5%** from its stored value, or when that value reaches the heartbeat: **300 seconds on Base**, 1 hour on Robinhood Chain when its relay runs. Both are measured against the adapter's own state, not against what the relay last attempted, so the numbers mean what a consumer reads. Feeds already past half their heartbeat ride along in a transaction another feed has already paid for. Both triggers are changeable live from the operator panel without restarting the relay.

**What this layer buys you:** a single venue printing a bad tick (a thin-book wick, a stuck API) does not become the on-chain price. The median absorbs it.

**What it does not buy you:** if the relayer itself is wrong or malicious, every source it reports is equally suspect. That is Layer 2's problem.

## Layer 2: on-chain signer aggregation

The relayer signs each price packet: `{feedId, price, timestamp}`. `OracleVerifier` then, on-chain:

1. ECDSA-recovers the signer address from each signature.
2. Checks it against the authorized signer set, using a **bitmap** so the same key cannot be counted twice within one update.
3. Requires at least **M distinct signers** before accepting a value.
4. Medians the verified values.
5. Stores the result as the canonical per-asset round in `SquidlorAdapterV2`.

Two bounds are enforced here regardless of any other configuration: a packet older than **3 minutes** is rejected, and so is one future-dated by more than **1 minute**.

**What this layer buys you:** with a real M-of-N set, one compromised key cannot publish a price.

> [!WARNING]
> The live deployment runs **1-of-1**, a single operator key. The M-of-N machinery is built and enforced, but with N=1 this layer currently provides no protection against operator compromise. Expanding the signer set is an operational step; see the [trust model](/resources/trust-model).

## Layer 3: cross-oracle aggregation

`SquidlorOracleAggregator` (one instance per pair) treats every oracle network as just another source behind a uniform adapter interface. It reads them all, drops the unhealthy ones, and medians the rest.

On Base, all eight pairs combine a `ChainlinkSource` with a `SquidSource`, the four equity pairs included. On Robinhood Chain every pair except SOL/USD is wired the same way (chain 4663 has no Chainlink SOL feed), but Squidlor's relay there is paused as of September 2026, so those pairs read Chainlink alone until it resumes. See [price feeds](/oracle/feeds) for the per-chain table.

**What this layer buys you:** an entire oracle network can halt, stall, or go wrong without taking your price with it. The aggregator's worst case is falling back to a single healthy source, so it can never be worse than its best constituent.

## Design decisions worth knowing

**Pure EVM, no precompile dependencies.** Works on any chain with Solidity ≥ 0.8 and standard `ecrecover`. This is why chain expansion is a deploy rather than a port.

**Storage slots derived from the feed ID.** Slots are `keccak256(abi.encode(feedId, "squid.price"))` rather than positions in a contract layout. That is collision-safe across proxy upgrades, so assets can be added without any storage migration.

**One transaction updates every asset.** `updateDataFeedsValues([feedIds], timestamp)` batches all feeds into a single relayer-paid transaction, which is what makes a wide asset list economically viable.

**Adapters, not aggregator changes.** Every oracle network is a thin `*Source.sol` implementing `latestPrice()` and `name()`. Adding a provider is deploy-adapter-then-`addSource()`. `SquidlorOracleAggregator` itself never changes.

**Median, not mean, at every layer.** A mean is moved by any outlier. A median only moves if the median voter moves.

**Per-asset proxies are stateless Chainlink-compatible facades.** Existing protocols treat a `SquidPriceFeed` as an ordinary Chainlink oracle. Zero code changes on the consumer side.

## Reading the result

Consumers read the aggregator directly on-chain through the Chainlink interface, or off-chain through the [API](/api); both paths read the same underlying state, so they cannot disagree beyond the API's cache TTL.

See [consumer interface](/oracle/interface) for the exact function surface.
