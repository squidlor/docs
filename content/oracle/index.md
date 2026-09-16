---
title: Squidlor Oracle
description: A self-owned, multi-source on-chain price oracle for crypto and tokenized US equities, readable through the standard Chainlink interface.
---

Squidlor Oracle is a multi-asset price oracle covering crypto (BTC, ETH, SOL) and tokenized US equities (NVDA, TSLA, AAPL, GOOGL), seven pairs against USD, on Arc. It is a **push** oracle: a relayer pays to publish prices on-chain, and consumers read them for free.

Every asset is served through a multi-source aggregator rather than a single feed, so no individual venue, provider, or oracle network can move a Squidlor price on its own.

```cards
[
  {
    "title": "Aggregation architecture",
    "description": "Three independent layers, each defending against a different failure mode.",
    "href": "/oracle/architecture",
    "icon": "layers"
  },
  {
    "title": "Consumer interface",
    "description": "The exact functions your contract calls, and what each one guarantees.",
    "href": "/oracle/interface",
    "icon": "filecode"
  },
  {
    "title": "Price feeds & assets",
    "description": "Which pairs exist, which sources back each one, and how often they update.",
    "href": "/oracle/feeds",
    "icon": "activity"
  },
  {
    "title": "How it compares",
    "description": "An honest side-by-side against Chainlink, Pyth, API3, UMA, and Chronicle.",
    "href": "/oracle/comparison",
    "icon": "gauge"
  }
]
```

## How it works, briefly

For **crypto**, an off-chain relay reads each price from several independent exchanges (Coinbase, Binance, Bybit, Gate.io, Kraken and OKX), takes the median, signs it, and pushes it on-chain. That Squidlor feed is then combined on-chain with the host chain's Chainlink feed wherever one exists. On Arc no other oracle network has published feed addresses yet, so each aggregator runs on the Squidlor leg alone until one does.

For **tokenized equities**, most chains provide only one stock oracle, which makes that oracle a single point of failure. Squidlor runs its own second source: the relay medians four market-data APIs (Yahoo Finance, Nasdaq, Finnhub and Twelve Data) and pushes during the US regular session, 09:30 to 16:00 ET, on a deviation-or-heartbeat trigger. Where the chain has a Chainlink stock feed, it carries the price overnight and the two are combined on-chain. Arc has none yet, so the equity aggregators serve the Squidlor leg and report the last session's close outside market hours; the [prediction market](/products/markets) settles against that leg and refuses expiries outside the session.

## Operating characteristics

| Property | What Squidlor delivers |
| --- | --- |
| Update latency | Configurable. Arc runs a 0.5% deviation trigger with a 300-second heartbeat; the contracts accept an update every 3 seconds. Off-chain the median refreshes every second. |
| Stale tolerance | Configurable per consumer. The oracle itself rejects price packets older than 3 minutes, or future-dated by more than 1 minute. |
| Signer consensus | Threshold-of-N multi-sig. The contracts enforce M-of-N; the live deployment runs 1-of-1 with an operator key. |
| Decimals | 8, across every pair. |
| Cost to read | Free: a `view` call on-chain, or an unauthenticated HTTP request off-chain. |
| Cost to add an asset | One per-asset proxy deploy against the existing adapter. No storage migration. |

## Where it is live

The oracle is deployed on one chain:

| Chain | Pairs | State |
| --- | --- | --- |
| **[Arc](/networks/arc)** | 7: BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL | Both relays running. One on-chain source per pair (Squidlor's feed) until another oracle network publishes on Arc. The prediction market lives here. On Arc Testnet today; mainnet from 2026-09-16. |

The whole Arc deployment, oracle and prediction market together, cost about 0.94 USDC in gas.

[Deployed addresses](/networks/addresses) lists every live contract.

## What is built, and what isn't

Squidlor documents this plainly rather than implying more decentralization than exists.

| Component | Status |
| --- | --- |
| Multi-signer ECDSA verification (`OracleVerifier`) | Built; enforces M-of-N |
| On-chain median at the signer layer | Built |
| Authorized-signer bitmap dedupe | Built |
| Per-asset staleness windows (3-min / 1-min bounds) | Built |
| Chainlink `AggregatorV3Interface` facade | Built as `SquidPriceFeed` |
| Cross-oracle aggregator and adapters | Built and live on Arc, with one source wired per pair until a second oracle network publishes there |
| Multi-source off-chain fetcher (crypto) | Built |
| Multi-operator M-of-N signer set | **Not yet**. `requiredSigners = 1`; there is one signer key per relay process, but all are operated by Squidlor |
| Per-source health metrics and dashboards | Partial; surfaced in the admin panel's aggregator tab |
| Equity feeds combined with a second on-chain source | Built and proven on the previous deployment (2026-09-02). On Arc the equity aggregators are Squidlor-only until a stock oracle publishes there |
| Price resolver for prediction markets | **Live on Arc**. `SquidlorPriceResolver` settles markets against the adapter's rounds |

> [!WARNING]
> Two things matter when you are sizing risk. Every signer key is operated by Squidlor and `requiredSigners` is 1, so the M-of-N machinery protects nothing yet. And on Arc every aggregator has one on-chain source today, so the cross-oracle layer protects nothing yet either: what you get is the off-chain median across exchanges, signed by one operator. Read the [trust model](/resources/trust-model) before you rely on it.

## Resolvers

The oracle answers "what is the price of X?". A resolver answers "did Y happen?". The first one in production is the price resolver behind the [prediction market](/products/markets): "was BTC above $81,400 at 14:30 UTC?" is settled by reading the adapter's round. Sports resolution ran as a pilot on an earlier deployment, and weather, elections and custom outcomes are designed. See [resolver oracles](/oracle/resolver-oracles).
