---
title: Changelog
description: What shipped on the builder platform, newest first.
---

Changes to the API, SDK, MCP server and builder platform. Contract deployments are on [deployed addresses](/networks/addresses).

## Arc mainnet, September 2026

**Arc mainnet is live, chain 5042.** The whole stack is deployed and both relays are pushing:
the adapter, the `SquidPriceFeed` proxies, seven aggregators, the registry, and the prediction
market. The API slug `arc` now resolves to 5042, and every documented endpoint, SDK call and
agent tool answers for mainnet. Addresses are on [deployed addresses](/networks/addresses).

**Arc Testnet (5042002) stays up for integration.** Same seven pairs, same contracts, different
addresses. It is deliberately **not** on the public API: `/v1/5042002/feeds` returns `chain not
supported`. Read it over `https://rpc.testnet.arc.io` and resolve addresses from the testnet
registry. See [building against testnet](/networks/arc#building-against-testnet).

**Squidlor runs on [Arc](/networks/arc), and only Arc.** Circle's L1, gas paid in USDC. Any chain
slug other than `arc` returns `404` rather than quietly answering with data it does not have.

**Seven pairs.** BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL against USD. Each has one on-chain leg,
Squidlor's own signed median, because no third-party push oracle publishes on Arc yet. The
cross-oracle comparison still happens, off-chain, before the relay signs. The aggregator supports
adding a source to a live pair, so a second leg needs no redeploy. See the [trust model](/resources/trust-model).

**Gas is a dollar.** The full deploy measured about 46.8M gas, roughly 0.94 USDC at Arc's 20 gwei
floor. The prediction market's paid creation fee is now exactly its USD amount in USDC, with no
price feed in the path: the fee quote needs no conversion when the gas token is already a dollar.

**One chain, one config.** Chain identity and every contract address are written into each
service's env by one script from the deployment manifest, so moving between Arc testnet and
mainnet is a profile switch rather than an edit. Nothing in the code names a chain.

**`@squidlor/oracle-sdk` 1.0.0.** One chain, `arc`, with its address table generated from the
deployment manifest at publish time. `getFeed("arc", "BTC/USD")` needs no address.

## Markets and the hub, September 2026

**The hub is live at [app.squidlor.com](https://app.squidlor.com).** Connect a wallet once, sign one message, and every product is one click away: chat, markets, build, clippers, docs. Chat answers stream in place. No backend changed; the hub proxies the gateway and the chat server on its own origin. See [Hub](/products/hub).

**The prediction market opened trading.** Gasless Yes/No markets on where a price settles, sqUSD contest collateral, settlement by `SquidlorPriceResolver` reading the adapter's rounds. Platform-created hourly and daily rounds, plus user-created markets. Tokenized-stock markets are gated by a shared exchange calendar (`@squidlor/market-hours`) so a market can never expire when the feed is not publishing. Season 1 points run 2026-09-16 to 2026-09-29: top 1,000 wallets share 1,000,000 SQDLR (revised 2026-09-18 from 10,000,000), flat bonuses, no multipliers. Short links on `squidlor.market`. See [prediction markets](/products/markets).

**TIDE, a seventh desk, covers the prediction market.** Open markets, odds as probabilities, positions, contest standing, and, when the relay is configured, orders and market creation from the conversation. Prices are cents, balances are sqUSD, and the desk will not write either with a dollar sign.

**DEX market data on every desk.** `get_trending_tokens`, `find_dex_token` and `get_trending_coins` read GeckoTerminal, so "what is trending right now" gets an answer instead of the oracle feed list. Every desk now names three data scopes: oracle feeds, the wallet engine, and DEX market data.

**Routing got stickier.** The desk holding the thread gets a bonus in the router, so a one-word overlap no longer moves a conversation to the equities desk mid-flow. Every desk now shares one rule set, including "never claim a transaction is waiting unless a tool built one this turn".

**Equity sources prove their freshness.** Every equity quote source now returns a timestamp and a push refuses to go out without two fresh ones. This is what makes extended-hours pushes safe; they are built and off.

**`@squidlor/oracle-sdk` 0.4.0.** A `./rest` subpath for consumers who do not want viem, `getEvents`, `getRealtimePrices`, and history-proof helpers.

**Docs.** This site gained a Products section and a pass over every page that said "five desks" or "not yet wired".

## The AI layer, August 2026

**Oracle Chat is live at [chat.squidlor.com](https://chat.squidlor.com).** Five persona desks plus an AUTO router that reads your question and hands it to the desk that owns it. Every desk can sign you in, mint an API key, set up a price alert and hand you working integration code, because "give me a key" lands wherever the router sends it. See [Oracle Chat](/ai/oracle-chat).

**REEF, a fifth desk, covers Virtuals Protocol agent tokens.** Movers, leaderboards, project snapshots, and pool history with an all-time high and a derived peak market cap. Those numbers are Virtuals' own and a pool index's, not Squidlor medians, and REEF says so every time. Squidlor operates no feed for any agent token.

**The MCP server now serves 20 tools.** New since launch: `get_provider_scorecard`, which answers whether a source has behaved over time rather than in one reading, and `get_price_at`, which returns the median as of a past timestamp with the rounds behind it. `list_flagged`, `get_realtime_prices`, `get_squidlor_breakdown`, `generate_integration`, the four webhook tools and `get_my_usage` are all documented on the [MCP server](/ai/mcp) page.

**Oracle Chat and the MCP server now share one tool package.** `@squidlor/oracle-tools` holds the definitions, the execution path and the result enrichment. MCP callers used to get flat JSON while the chat desks got coverage verdicts, print-age annotation and explorer links: the same question, a worse answer, purely because of where it was asked.

**Wallet reads, swap quotes, scheduled tasks and stored preferences.** KRAKEN reads balances, holdings and transactions from a third-party wallet engine, quotes swaps and sends, schedules price watches and TWAP slices, and remembers standing preferences. Every quote comes back unsigned with an expiry, and the user signs it in their own wallet. Three separate switches gate quotes, tasks and memory, all off unless an operator turns them on.

**Chat allowances, and wallet sign-in.** 15 messages a day anonymously, 60 after signing a message with a wallet, 100 with an account. Counts are stored rather than held in memory, so a deploy no longer hands everyone a fresh allowance. Signing costs no gas and moves nothing; it exists so "my history is private to me" is true rather than hopeful. Paid credits over x402 are built and switched off in production.

**Transcripts moved server-side.** The browser sends a session id and one message instead of the whole conversation. The old shape still works while deployed bundles catch up.

## Builder platform launch

**API keys and plans.** The read API now accepts an optional `sq_live_…` key. Keyless access is unchanged and stays supported; a key raises your rate limit from 30/min to 300/min, unlocks per-project usage stats, and makes your traffic count toward rewards. See [authentication](/build/authentication).

**Rate limits are now enforced.** Anonymous 30/min per IP, free 300/min, Pro 3,000/min, Institutional unlimited. Every `/v1` response carries `X-RateLimit-*` and `X-Squidlor-Tier`. See [rate limits](/build/rate-limits).

**History lookback cap.** Anonymous and free tiers reach back 30 days on `/history` and `/ohlc`. Longer windows are clamped with `X-History-Clamped: true` rather than rejected. Pro is uncapped.

**`@squidlor/oracle-sdk` on npm.** Feed and registry coverage for every live pair, plus a REST client (`getValue`, `getHistory`, `getOhlc`, `getAudit`, `createClient`). `feed.health()` exposes the aggregator's `peek()`. The `InsufficientHealthySources` revert is now decoded into a typed `StaleFeedError` instead of an undecodable selector.

```bash
npm install @squidlor/oracle-sdk viem
```

**MCP server live at `https://api.squidlor.com/mcp`.** Seven tools at launch: `list_feeds`, `get_price`, `compare_oracles`, `get_price_history`, `get_ohlc`, `get_audit_trail`, `list_events`. Accepts an optional bearer key; requests arriving through MCP are counted under the `mcp` usage family. See [agent quickstart](/build/quickstart-agents).

**OpenAPI 3.1 spec** at [`/openapi.json`](https://api.squidlor.com/aggregator/openapi.json) covering every endpoint, the auth scheme and the rate-limit headers.

**Builder portal** at [build.squidlor.com](https://build.squidlor.com): wallet or email sign-in, projects, API keys, usage charts, showcase submission, plan management.

**Showcase, bounties and Season 0 rewards.** See [rewards](/build/rewards) and [bounties](/build/bounties).

**Two API correctness fixes.** A malformed `chainId` on the legacy query-param routes now
returns `400 INVALID_CHAIN_ID` instead of `500`. And `/audit` is lookback-capped alongside
`/history` and `/ohlc`, since an audit record carries its round's median.

**Docs.** This whole "Build with Squidlor" section is new. The old claim that the API has "no rate limit and no API key" has been corrected everywhere it appeared.
