---
title: Welcome to Squidlor
description: A self-owned, multi-source on-chain price oracle — live on Robinhood Chain, EVM-native, and readable through the standard Chainlink interface.
---

Squidlor is a self-owned price oracle, fronted by an AI query layer:

1. **[Squidlor Oracle](/oracle)** — a multi-source on-chain price oracle. It serves crypto (BTC, ETH, SOL, BNB, XRP) and tokenized US equities (NVDA, TSLA, AAPL, GOOGL) today. Event-resolution oracles for sports, weather, and custom outcomes are next.
2. **[The Squidlor Agent](/ai)** — a chat interface and an MCP server that query and narrate live feed state, read wallets, and quote swaps.

The oracle is live on **[Robinhood Chain](/networks/robinhood-chain) mainnet (chain ID 4663)**, an Ethereum L2 for tokenized real-world assets. It cost under $1 in gas to deploy.

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
    "title": "Core concepts",
    "description": "Sources, adapters, aggregators, and feeds — the vocabulary the rest of these docs assumes.",
    "href": "/concepts",
    "icon": "book"
  },
  {
    "title": "API reference",
    "description": "The public read API: feeds, history, OHLC, events, and randomness over JSON.",
    "href": "/api",
    "icon": "code"
  },
  {
    "title": "Deployed addresses",
    "description": "Every live contract address on Robinhood Chain, per pair and per component.",
    "href": "/networks/addresses",
    "icon": "network"
  }
]
```

## Why a self-owned oracle

Most protocols rent their price data from a third-party network. Squidlor owns the whole path — relayer, verifier, aggregator — and that changes what is possible.

- **No external dependency to deprioritize your chain.** A third-party oracle network decides which chains it serves and how well. Squidlor's stack deploys from a script, so coverage is not somebody else's roadmap decision.
- **A real second source where there is only one.** Tokenized equities are the clearest case: most chains have exactly one stock oracle, which makes it a single point of failure by construction.
- **Cheap multi-asset updates.** One transaction updates every feed, which is what makes a wide asset list economically viable.
- **Push cadence as a product knob.** Because Squidlor operates its own relayer, update frequency is a decision rather than a vendor parameter.

## Chain-agnostic by construction

Contracts, indexer, relayer, and frontends are all built against the plain EVM spec and standard JSON-RPC, parameterized entirely by chain ID, RPC URL, and environment variables. Deploying to a new EVM chain is an operational exercise, not a rewrite.

The Robinhood Chain deployment proved this out: it required no Solidity changes at all.

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
    "description": "Ask five desks about feed state in natural language, or wire the MCP server's 20 tools into your own agent.",
    "href": "/ai",
    "icon": "bot"
  },
  {
    "title": "Know what you're trusting",
    "description": "What the oracle guarantees today, and what it doesn't. Read before committing real value.",
    "href": "/resources/trust-model",
    "icon": "shield"
  }
]
```
