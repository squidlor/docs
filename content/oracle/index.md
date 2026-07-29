---
title: Squidlor Oracle
description: A self-owned, multi-source on-chain price oracle for crypto and tokenized US equities, readable through the standard Chainlink interface.
---

Squidlor Oracle is a multi-asset price oracle covering crypto (BTC, ETH, SOL, BNB, XRP) and tokenized US equities (NVDA, TSLA, AAPL, GOOGL). It is a **push** oracle: a relayer pays to publish prices on-chain, and consumers read them for free.

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

For **crypto**, an off-chain relay reads each price from several independent venues — the Arbitrum oracle hub plus Binance, Coinbase, Gate.io, and Bybit — takes the median, signs it, and pushes it on-chain. That Squidlor feed is then combined on-chain with the host chain's Chainlink feed wherever one exists.

For **tokenized equities**, most chains provide only one stock oracle, which makes that oracle a single point of failure. Squidlor runs its own second source: the relay medians free market-data APIs (Yahoo Finance and Nasdaq, optionally Finnhub and Twelve Data) and pushes hourly during US market hours, 09:30–16:00 ET. The chain's own Chainlink stock feed carries the price overnight.

## Operating characteristics

| Property | What Squidlor delivers |
| --- | --- |
| Update latency | Configurable. A 3-second minimum interval today, pushed as often as the relayer is willing to pay gas for. |
| Stale tolerance | Configurable per consumer. The oracle itself rejects price packets older than 3 minutes, or future-dated by more than 1 minute. |
| Signer consensus | Threshold-of-N multi-sig. The contracts enforce M-of-N; the live deployment runs 1-of-1 with an operator key. |
| Decimals | 8, across every pair. |
| Cost to read | Free — a `view` call on-chain, or an unauthenticated HTTP request off-chain. |
| Cost to add an asset | One per-asset proxy deploy against the existing adapter. No storage migration. |

## Where it is live

The oracle is deployed on **[Robinhood Chain](/networks/robinhood-chain) mainnet (chain ID 4663)**, with aggregators for seven pairs. It cost $0.98 in gas to deploy.

[Deployed addresses](/networks/addresses) lists every live contract.

## What is built, and what isn't

Squidlor documents this plainly rather than implying more decentralization than exists.

| Component | Status |
| --- | --- |
| Multi-signer ECDSA verification (`OracleVerifier`) | Built — enforces M-of-N |
| On-chain median at the signer layer | Built |
| Authorized-signer bitmap dedupe | Built |
| Per-asset staleness windows (3-min / 1-min bounds) | Built |
| Chainlink `AggregatorV3Interface` facade | Built — `SquidPriceFeed` |
| Cross-oracle aggregator and adapters | Built and live on Robinhood Chain |
| Multi-source off-chain fetcher (crypto) | Built |
| Multi-operator M-of-N signer set | **Not yet** — a single operator key today |
| Per-source health metrics and dashboards | Partial — surfaced in the admin panel's aggregator tab |
| Equity feeds wired as a second on-chain source | **Not yet** — standalone Squid equity feeds are deployed but the equity aggregators are still Chainlink-only |

> [!WARNING]
> Two of those gaps matter when you are sizing risk. The signer set is currently one key, and the four equity aggregators read only Chainlink, so for equities the multi-source guarantee does not yet hold on-chain. Read the [trust model](/resources/trust-model) before you rely on either.

## Next: resolver oracles

The oracle today answers "what is the price of X?". The next expansion answers "did event Y happen?" — sports results, weather thresholds, elections, and custom outcomes. A working pilot already runs for sports. See [resolver oracles](/oracle/resolver-oracles).
