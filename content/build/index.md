---
title: Build with Squidlor
description: Everything you need to ship on Squidlor price feeds: quickstarts by persona, API keys, templates, and the builder rewards program.
---

Squidlor is a multi-source price oracle running on Base, Robinhood Chain and Arbitrum, and the oracle behind a [prediction market](/products/markets) and a [stock-paired launchpad](/products/trade) on Base. Feeds implement Chainlink's `AggregatorV3Interface`, so if your contract already reads a Chainlink feed, you change one address.

This section is for people building **on** Squidlor rather than operating it.

## Start where you are

```cards
[
  {
    "title": "Building an AI agent",
    "description": "Connect an agent to the MCP server and give it live prices, history and cross-source verification as tools.",
    "href": "/build/quickstart-agents",
    "icon": "bot"
  },
  {
    "title": "Writing a smart contract",
    "description": "Read a feed on-chain in Solidity, with the staleness and health checks a lending market actually needs.",
    "href": "/build/quickstart-contracts",
    "icon": "filecode"
  },
  {
    "title": "Building a dashboard or bot",
    "description": "Pull history, OHLC candles and the per-source audit trail over plain HTTP.",
    "href": "/build/quickstart-data",
    "icon": "trending"
  },
  {
    "title": "Starter templates",
    "description": "Five repos you can clone: agent, ACP offering, lending example, resolver, price widget.",
    "href": "/build/templates",
    "icon": "rocket"
  }
]
```

## What you can read

| Surface | What it gives you | Auth |
|---|---|---|
| On-chain aggregators | The exact value a contract sees, plus `peek()` for healthy-source count | none |
| REST API | Same medians, plus per-source breakdown, history, OHLC, audit trail | optional |
| MCP server | The above as tools any MCP client can call | optional |
| `@squidlor/oracle-sdk` | TypeScript wrapper over both paths | optional |

Nothing requires a key to start. A [free key](/build/authentication) raises your rate limit, unlocks per-project usage stats, and makes your usage count toward [builder rewards](/build/rewards).

## Get paid to build

Season 0 of the builder program rewards verifiable work: metered API usage, registered on-chain consumers, agent integrations, templates and content. Points settle on-chain through the same `RewardDistributor` that pays validators.

- [Builder rewards](/build/rewards): how points are earned and settled
- [Bounties](/build/bounties): specific things we will pay cash for
- [Showcase](/build/showcase): list what you built

## Reference

- [Authentication](/build/authentication): keys, headers, rotation
- [Rate limits & plans](/build/rate-limits): the numbers, and what happens at the ceiling
- [API reference](/api): endpoint-by-endpoint
- [Deployed addresses](/networks/addresses): every aggregator, every chain
- [Changelog](/build/changelog): what shipped when

Questions, or something missing? <build@squidlor.com>
