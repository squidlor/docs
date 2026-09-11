---
title: FAQ
description: Short answers to the questions that come up most: integration, pricing, trust, and the gaps worth knowing about.
---

## Getting started

### Do I need an API key?

Not to start. The [read API](/api) works unauthenticated at 30 requests/minute per IP, and on-chain reads are `view` calls that need nothing at all.

A [free key](/build/authentication) raises that to 300 requests/minute, shows you your own usage, and makes your traffic count toward [builder rewards](/build/rewards).

### What does it cost to read a price?

Nothing. On-chain reads are `view` calls; the HTTP API is free at the anonymous and free-key tiers. Squidlor is a push oracle: the relayer pays to publish, consumers read for free.

Paid plans exist for throughput and history depth, not for access to data. See [rate limits & plans](/build/rate-limits).

### Is it really a one-line change from Chainlink?

Mechanically, yes: Squidlor aggregators implement `AggregatorV3Interface` at 8 decimals, so you change the address. But read [the staleness trap](/integration/reading-prices#the-staleness-trap) before you ship it. `latestRoundData().updatedAt` does not mean what it means on a Chainlink feed unless rounds are being committed.

### Which contract should I read?

The pair's `SquidlorOracleAggregator`. Addresses are in [deployed addresses](/networks/addresses). Reading a `SquidPriceFeed` directly skips the cross-oracle layer entirely.

## Prices and feeds

### What decimals do feeds use?

8, across every pair. It is hardcoded, not configurable.

### How often do prices update?

It depends on the chain. On Base, crypto pushes on a 50 bps deviation or a 300-second heartbeat, and equities push during the US regular session, 09:30 to 16:00 ET. On Robinhood Chain the relay is paused as of September 2026.

Cadence is an operational knob rather than a protocol constant; see [price feeds & assets](/oracle/feeds#update-cadence).

### Why is my equity price two days old?

Because the market was closed. US equities do not trade at weekends, and a feed that keeps updating would be inventing prices. Chainlink's 24-hour heartbeat carries the price across the gap.

Widen your staleness bound for equity feeds; 48 to 72 hours is reasonable. See [handling market hours](/oracle/feeds#handling-market-hours-in-your-integration).

### What happens if sources disagree?

Under `MEDIAN`, the middle value wins. A single outlier among three sources has no effect on the answer at all.

### What if a source goes stale?

It is excluded. The aggregator serves an answer as long as `minHealthySources` remain, which is 1 in the live configuration. Below that, reads revert rather than returning a number nobody stands behind.

### How do I know how many sources backed a price?

Call `peek()`, which returns `healthyCount` alongside the price, or read the [API's feed detail](/api/feeds#get-one-feed) for a full per-source breakdown.

### Which pairs actually have multiple sources?

On Base, all eight (BTC, ETH, SOL, VIRTUAL, NVDA, TSLA, AAPL, GOOGL) have two: Chainlink and Squidlor. On Robinhood Chain every pair except SOL/USD is wired for two, but Squidlor's relay there is paused, so they read Chainlink alone today; SOL/USD has no Chainlink leg on that chain. See [price feeds](/oracle/feeds).

## Trust and security

### Who controls the oracle?

Today, one deployer key per chain owns every live contract, and every authorized signer key is operated by Squidlor with `requiredSigners = 1`. That is the most consequential thing to know before relying on Squidlor. [Trust model](/resources/trust-model) states it in full, including what closes it.

### Is it decentralized?

Not yet, honestly. The architecture is built for M-of-N signing and it is running with N=1. Squidlor is lower on the decentralization spectrum than Chainlink or Pyth today.

### Can Squidlor serve me a different price than someone else?

Not on-chain: a read is an `eth_call` against public state. Over the HTTP API, in principle, yes: it is a server. That asymmetry is exactly why on-chain logic should never read the API.

### Is there a circuit breaker?

Not at the contract level. There is no maximum-deviation check between rounds. If a sudden large move should pause your protocol, implement that bound yourself.

### Has it been audited?

No third-party audit is published. Read [security properties](/contracts/security) for what the contracts enforce and what their known limitations are, and size your exposure with that in mind.

## API and tooling

### Which chains does the API serve?

`base` (8453), `robinhood` (4663) and `arbitrum` (42161), as slugs or numeric ids. An unrecognized slug returns `404`; it used to fall back to Arbitrum silently, and checking `chainId` in the response is still a good habit. See [supported networks](/networks).

### Why do the history endpoints return 503?

They require MongoDB. Without it the API runs in pure live-read mode. See [history & OHLC](/api/history).

### Are there rate limits?

Yes. 30 requests a minute per IP without a key, 300 with a free key, 3,000 on Pro. Every `/v1` response carries `X-RateLimit-*` headers. Responses are also cached for 10 seconds, so polling faster than that returns identical bytes. See [rate limits & plans](/build/rate-limits).

### Does the SDK cover every chain?

`@squidlor/oracle-sdk` 0.4.0 ships addresses for Robinhood Chain and Arbitrum. For Base, pass the aggregator address via `opts.address` from [deployed addresses](/networks/addresses#base-8453), or read [directly with viem](/integration/reading-offchain#via-direct-rpc-with-viem).

### Is the MCP server live?

Yes, at `https://api.squidlor.com/mcp`, serving 20 tools over streamable HTTP. You can also run it locally over stdio. See [MCP server](/ai/mcp).

### Can I just ask a question instead of integrating?

Yes. [chat.squidlor.com](https://chat.squidlor.com) has seven desks over live feed state, wallets, Virtuals agent tokens, prediction markets and stock-paired launches, and it will mint you an API key and write your integration code in the same conversation. 15 messages a day without an account. See [Oracle Chat](/ai/oracle-chat). The [hub](/products/hub) at app.squidlor.com streams the same answers.

## Products

### What is the prediction market?

Gasless Yes/No markets on where a price settles, on Base, resolved by the oracle. Collateral is sqUSD, contest collateral you are granted rather than buy. Season 1 points run 2026-09-10 to 2026-09-23. See [prediction markets](/products/markets).

### What is a stock-paired token?

A new token whose pool is priced in a tokenized US stock (NVDAc and twelve more) instead of ETH, launched through Doppler onto Uniswap v4 on Base. Launch it from the GEYSER desk or [squidlor.trade](https://squidlor.trade), and trade it there. See [stock-paired tokens](/products/trade).

### Do I have to sign in to every product separately?

The [hub](/products/hub) signs you into the platform once, which covers markets, points and clippers. Oracle Chat and the builder portal keep their own sign-in for now, and the browser wallet still asks you to approve each new site once.

### Are `squidlor.market` and `sqdlr.live` real?

They are Squidlor's short-link domains for sharing markets. They redirect to markets.squidlor.com and never serve the app, so a wallet prompt on either one is a phishing signal.

## Deployment

### Can Squidlor deploy on my chain?

If it runs Solidity ≥ 0.8 with standard `ecrecover` and exposes standard JSON-RPC, yes. No node software and no bridge; the whole stack deploys from a script in about a week, and your validators can join later as signers. [Bring Squidlor to your chain](/networks/for-chains) has the requirements, the cost model and the 30-day benchmark we offer first.

### What does a deployment cost?

The oracle core came to $0.98 in gas on Robinhood Chain; everything Squidlor has deployed there totals $3.99. On Base at 0.05 gwei, the four equity feed proxies cost 0.000258 ETH together.

### How long does adding a pair take?

One `SquidPriceFeed` proxy deploy, one aggregator, the source adapters, and a registry entry, plus relay and API configuration. No storage migration, because storage slots derive from the feed ID rather than contract layout.

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
