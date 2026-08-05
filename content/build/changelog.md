---
title: Changelog
description: What shipped on the builder platform, newest first.
---

Changes to the API, SDK, MCP server and builder platform. Contract deployments are on [deployed addresses](/networks/addresses).

## Builder platform launch

**API keys and plans.** The read API now accepts an optional `sq_live_…` key. Keyless access is unchanged and stays supported — a key raises your rate limit from 30/min to 300/min, unlocks per-project usage stats, and makes your traffic count toward rewards. See [authentication](/build/authentication).

**Rate limits are now enforced.** Anonymous 30/min per IP, free 300/min, Pro 3,000/min, Institutional unlimited. Every `/v1` response carries `X-RateLimit-*` and `X-Squidlor-Tier`. See [rate limits](/build/rate-limits).

**History lookback cap.** Anonymous and free tiers reach back 30 days on `/history` and `/ohlc`. Longer windows are clamped with `X-History-Clamped: true` rather than rejected. Pro is uncapped.

**`@squidlor/oracle-sdk` 0.2.0 on npm.** Adds all 7 Robinhood Chain feeds and the registry, bakes in the Qubetics addresses, completes the Arbitrum map, and adds a REST client (`getValue`, `getHistory`, `getOhlc`, `getAudit`, `createClient`). `feed.health()` exposes the aggregator's `peek()`. The `InsufficientHealthySources` revert is now decoded into a typed `StaleFeedError` instead of an undecodable selector.

```bash
npm install @squidlor/oracle-sdk viem
```

**MCP server live at `https://api.squidlor.com/mcp`.** Seven tools: `list_feeds`, `get_price`, `compare_oracles`, `get_price_history`, `get_ohlc`, `get_audit_trail`, `list_events`. Accepts an optional bearer key; requests arriving through MCP are counted under the `mcp` usage family. See [agent quickstart](/build/quickstart-agents).

**OpenAPI 3.1 spec** at [`/openapi.json`](https://api.squidlor.com/aggregator/openapi.json) covering every endpoint, the auth scheme and the rate-limit headers.

**Builder portal** at [build.squidlor.com](https://build.squidlor.com) — wallet or email sign-in, projects, API keys, usage charts, showcase submission, plan management.

**Showcase, bounties and Season 0 rewards.** See [rewards](/build/rewards) and [bounties](/build/bounties).

**Three API correctness fixes.** An unrecognised chain slug now returns `404` instead of
silently serving Arbitrum data — a typo like `/v1/robinhoood/feeds` was previously answered
with another chain's prices. A malformed `chainId` on the legacy query-param routes now
returns `400 INVALID_CHAIN_ID` instead of `500`. And `/audit` is lookback-capped alongside
`/history` and `/ohlc`, since an audit record carries its round's median.

**Docs.** This whole "Build with Squidlor" section is new. The old claim that the API has "no rate limit and no API key" has been corrected everywhere it appeared.

## Earlier

Robinhood Chain (4663) went live with 7 aggregated feeds — BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL against USD — plus the registry and economics contracts. History, OHLC and audit endpoints shipped on the public API.
