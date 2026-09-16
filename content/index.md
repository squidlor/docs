---
title: Welcome to Squidlor
description: A self-owned, multi-source on-chain price oracle on Arc, Circle's USDC-gas L1, and the products built on it. Prediction markets, an AI query layer, and one hub that signs you into all of them.
---

Squidlor is a self-owned price oracle, and a set of products that run on it:

1. **[Squidlor Oracle](/oracle)**, a multi-source on-chain price oracle. It serves crypto (BTC, ETH, SOL) and tokenized US equities (NVDA, TSLA, AAPL, GOOGL). Every pair is medianed across exchanges off-chain before it is signed, and the contracts can median a second oracle network on-chain the day one publishes on Arc.
2. **[Prediction markets](/products/markets)** on Arc: gasless Yes/No markets on where a price settles, resolved by the oracle.
3. **[The Squidlor Agent](/ai)**: Oracle Chat with six desks, and an MCP server, over live feed state, wallets, agent tokens and markets.
4. **[The hub](/products/hub)** at [app.squidlor.com](https://app.squidlor.com): connect a wallet once and open everything signed in.

Production is **[Arc mainnet](/networks/arc)** (chain 5042), Circle's L1 where gas is paid in USDC: seven pairs with both relays running. Arc Testnet runs the same seven pairs for integration work. The whole deployment cost about 0.94 USDC in gas and no Solidity changes; see [bring Squidlor to your chain](/networks/for-chains).

## Start here

```cards
[
  {
    "title": "Quick start",
    "description": "Read a Squidlor price from Solidity or over HTTP in about five minutes.",
    "href": "/quick-start",
    "icon": "rocket"
  },
  {
    "title": "Products",
    "description": "The hub, prediction markets and clippers: what each one does and where it lives.",
    "href": "/products",
    "icon": "trending"
  },
  {
    "title": "API reference",
    "description": "The public read API: feeds, realtime prices, history, OHLC, daily prices and provider scorecards over JSON.",
    "href": "/api",
    "icon": "code"
  },
  {
    "title": "Measured performance",
    "description": "Fresh rates, leg agreement, refused rounds and gas per update from the previous deployment, with the calls to reproduce them on Arc.",
    "href": "/oracle/evidence",
    "icon": "activity"
  }
]
```

## Why a self-owned oracle, in numbers

Most protocols rent their price data from a third-party network. Squidlor owns the whole path: relayer, verifier, aggregator. Every claim below is read from the public API or the chain, and [measured performance](/oracle/evidence) shows how to reproduce it.

- **Two independent paths agree.** Over 12,757 sampled rounds on the previous deployment, Squidlor's feed (six exchanges, medianed every second) and Chainlink's network disagreed by a median of 2 basis points on BTC/USD and ETH/USD, with a 95th percentile of 6 to 8.
- **It refuses rather than lies.** With two legs wired, the BTC/USD aggregator required both fresh. It declined to answer 209 of those rounds, about 1.6%, and served a stale or single-source price as a two-source median exactly zero times.
- **One transaction updates every feed.** A push carrying every feed is about 350,000 gas, about 0.007 USDC on Arc; the marginal feed is about 35,000. Chainlink's OCR transmit is 120,000 to 132,000 gas for one feed.
- **Cadence is ours to set.** Arc runs a 0.5% deviation trigger with a 300-second heartbeat, live-changeable. Chainlink's ETH/USD on Ethereum updated 30 times in the 24 hours we measured; ours updates at least 288.
- **A new chain is a day, not a roadmap.** The full Arc deployment cost about 0.94 USDC in gas; BTC and ETH on a fresh chain is about 14.5M gas one time. No third party decides whether your chain is served.
- **A real second source for tokenized equities.** Most chains have exactly one stock oracle, and Arc has none yet. Squidlor's four equity aggregators median four market-data APIs and are the first stock prices on Arc.

## Chain-agnostic by construction

Contracts, indexer, relayer, and frontends are all built against the plain EVM spec and standard JSON-RPC, parameterized entirely by chain ID, RPC URL, and environment variables. Deploying to a new EVM chain is an operational exercise, not a rewrite.

Two earlier chains proved it in July and August 2026, and Arc repeated it in September: none required a Solidity change.

> [!NOTE]
> Looking for the fastest possible path to a working integration? Go straight to the [quick start](/quick-start). If you want the conceptual model first, read [core concepts](/concepts), then [aggregation architecture](/oracle/architecture).

## What you can build

```cards
[
  {
    "title": "Read prices on-chain",
    "description": "Drop-in Chainlink-compatible feeds for lending, perps, or settlement logic.",
    "href": "/integration/reading-prices",
    "icon": "filecode"
  },
  {
    "title": "Read prices off-chain",
    "description": "Cached JSON over HTTP for dashboards, bots, and backends.",
    "href": "/integration/reading-offchain",
    "icon": "database"
  },
  {
    "title": "Query with an AI agent",
    "description": "Ask six desks about feeds and markets in natural language, or wire the MCP server's 20 tools into your own agent.",
    "href": "/ai",
    "icon": "bot"
  },
  {
    "title": "Know what you're trusting",
    "description": "What the oracle guarantees today, and what it doesn't. Read before committing real value.",
    "href": "/resources/trust-model",
    "icon": "shield"
  },
  {
    "title": "Bring Squidlor to your chain",
    "description": "For chain teams: what deploys, what it costs, how your validators become the signers, and the 30-day benchmark.",
    "href": "/networks/for-chains",
    "icon": "network"
  }
]
```
