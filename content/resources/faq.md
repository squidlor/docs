---
title: FAQ
description: Short answers to the questions that come up most — integration, pricing, trust, and the gaps worth knowing about.
---

## Getting started

### Do I need an API key?

No. The [read API](/api) is unauthenticated and there is no signup. On-chain reads are `view` calls, so they need nothing either.

### What does it cost to read a price?

Nothing. On-chain reads are `view` calls; the HTTP API is free. Squidlor is a push oracle — the relayer pays to publish, consumers read for free.

### Is it really a one-line change from Chainlink?

Mechanically, yes: Squidlor aggregators implement `AggregatorV3Interface` at 8 decimals, so you change the address. But read [the staleness trap](/integration/reading-prices#the-staleness-trap) before you ship it — `latestRoundData().updatedAt` does not mean what it means on a Chainlink feed unless rounds are being committed.

### Which contract should I read?

The pair's `SquidlorOracleAggregator`. Addresses are in [deployed addresses](/networks/addresses). Reading a `SquidPriceFeed` directly skips the cross-oracle layer entirely.

## Prices and feeds

### What decimals do feeds use?

8, across every pair. It is hardcoded, not configurable.

### How often do prices update?

Crypto: hourly pushes, with a 3-second minimum interval available. Equities: hourly during US market hours, 09:30–16:00 ET.

Cadence is an operational knob rather than a protocol constant — see [price feeds & assets](/oracle/feeds#update-cadence).

### Why is my equity price two days old?

Because the market was closed. US equities do not trade at weekends, and a feed that keeps updating would be inventing prices. Chainlink's 24-hour heartbeat carries the price across the gap.

Widen your staleness bound for equity feeds — 48 to 72 hours is reasonable. See [handling market hours](/oracle/feeds#handling-market-hours-in-your-integration).

### What happens if sources disagree?

Under `MEDIAN`, the middle value wins. A single outlier among three sources has no effect on the answer at all.

### What if a source goes stale?

It is excluded. The aggregator serves an answer as long as `minHealthySources` remain — 1 in the live configuration. Below that, reads revert rather than returning a number nobody stands behind.

### How do I know how many sources backed a price?

Call `peek()`, which returns `healthyCount` alongside the price, or read the [API's feed detail](/api/feeds#get-one-feed) for a full per-source breakdown.

### Which pairs actually have multiple sources?

BTC/USD and ETH/USD have two (Chainlink + Squidlor). SOL/USD has one, because chain 4663 has no Chainlink SOL feed. The four equity pairs currently have one — Chainlink — with the Squidlor feeds deployed but [not yet wired in](/oracle/feeds).

## Trust and security

### Who controls the oracle?

Today, a single deployer key owns every live contract and is the sole authorized signer. That is the most consequential thing to know before relying on Squidlor. [Trust model](/resources/trust-model) states it in full, including what closes it.

### Is it decentralized?

Not yet, honestly. The architecture is built for M-of-N signing and it is running with N=1. Squidlor is lower on the decentralization spectrum than Chainlink or Pyth today.

### Can Squidlor serve me a different price than someone else?

Not on-chain — a read is an `eth_call` against public state. Over the HTTP API, in principle, yes: it is a server. That asymmetry is exactly why on-chain logic should never read the API.

### Is there a circuit breaker?

Not at the contract level. There is no maximum-deviation check between rounds. If a sudden large move should pause your protocol, implement that bound yourself.

### Has it been audited?

No third-party audit is published. Read [security properties](/contracts/security) for what the contracts enforce and what their known limitations are, and size your exposure with that in mind.

## API and tooling

### Why does `/v1/robinhood/feeds` return Arbitrum data?

The live API build predates Robinhood Chain support, and an unrecognized chain slug falls back to 42161 rather than erroring. Always check the `chainId` in the response. Until that deploy lands, read Robinhood feeds [directly on-chain](/integration/reading-prices).

### Why do the history endpoints return 503?

They require MongoDB. Without it the API runs in pure live-read mode. See [history & OHLC](/api/history).

### Are there rate limits?

None documented. Responses are cached for 10 seconds, so polling faster than that returns identical bytes. Be reasonable — [errors & limits](/api/errors) has specifics.

### Does the SDK cover Robinhood Chain?

Not yet. Pass the aggregator address explicitly via `opts.address`, or read [directly with viem](/integration/reading-offchain#via-direct-rpc-with-viem).

### Is the MCP server live?

Not confirmed. Run it locally over stdio — see [MCP server](/ai/mcp).

## Deployment

### Can Squidlor deploy on my chain?

If it runs Solidity ≥ 0.8 with standard `ecrecover` and exposes standard JSON-RPC, yes. No node software, no validator onboarding, no bridge. [Supported networks](/networks#what-a-new-chain-requires) lists the requirements.

### What does a deployment cost?

The oracle core came to $0.98 in gas on Robinhood Chain; everything Squidlor has deployed there totals $3.99.

### How long does adding a pair take?

One `SquidPriceFeed` proxy deploy, one aggregator, the source adapters, and a registry entry — plus relay and API configuration. No storage migration, because storage slots derive from the feed ID rather than contract layout.

## Still stuck?

```cards
[
  {
    "title": "Quick start",
    "description": "The shortest path to a working read.",
    "href": "/quick-start",
    "icon": "rocket"
  },
  {
    "title": "Core concepts",
    "description": "If the terminology is the obstacle, start here.",
    "href": "/concepts",
    "icon": "book"
  },
  {
    "title": "Trust model",
    "description": "The page to read before committing real value.",
    "href": "/resources/trust-model",
    "icon": "shield"
  },
  {
    "title": "API reference",
    "description": "Every endpoint and field.",
    "href": "/api",
    "icon": "code"
  }
]
```
