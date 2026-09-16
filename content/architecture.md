---
title: System architecture
description: How the contracts, relayers, services, and frontends fit together, and which piece to look at when something is wrong.
---

Squidlor is one system with three faces: contracts on chain, a set of backend services off chain, and the interfaces people actually touch. Since August 2026 the same oracle also settles a prediction market. Everything runs on one chain, Arc.

## The shape of it

```text
                     ┌──────────────────────────────────────────┐
  Data providers ───▶ │ relay-pusher (one process per chain)     │  push prices on-chain
  (CEXs, Yahoo,      │ pyth-pusher · sports-pusher              │  push event outcomes
   Nasdaq, …)        └──────────────────┬───────────────────────┘
                                        ▼
             ┌──────────────────────────────────────────────────────┐
   ON CHAIN  │ SquidlorAdapterV2 → SquidPriceFeed (per asset)       │
             │ SquidlorOracleAggregator (per pair) ← ChainlinkSource│
             │ AggregatorRegistry                                   │
             │ MarketFactory · FPMM · ConditionalTokens             │
             │ SquidlorPriceResolver → the adapter                  │
             └──────────┬──────────────────────────┬────────────────┘
                        │ read                     │ index + settle
                        ▼                          ▼
              ┌──────────────────┐        ┌──────────────────────┐
              │  aggregator-api  │        │ quest · ponder       │  markets, points,
              │  JSON over HTTP  │        │ netting relay        │  gasless orders
              └────────┬─────────┘        └──────────┬───────────┘
                       │                             │
   ┌───────────────────┴─────────────────────────────┴──────────────┐
   │ hub · oracle-chat · mcp · markets (dashboard) · trade          │
   │ portal · admin · landing · docs · X agent · short links        │
   └────────────────────────────────────────────────────────────────┘
```

## Contracts

Three repositories, deployed independently.

| Repo | Contains |
| --- | --- |
| **squid-contract** | The oracle core: `SquidlorAdapterV2` and the per-asset `SquidPriceFeed` proxies that present it as a Chainlink feed. |
| **aggregator-contract** | `SquidlorOracleAggregator` instances, the source adapters (`ChainlinkSource`, `SquidSource`, …), `AggregatorRegistry`, and the economics contracts: `RewardDistributor`, `FeeCollector`, `SquidlorCommitRevealRandomness`. |
| **market-contracts** | The [prediction market](/products/markets): `MarketFactory`, a Gnosis-style `FixedProductMarketMaker` over ERC-1155 `ConditionalTokens`, `SquidlorPriceResolver` (reads the adapter by feed id), `AdminResolver`, sqUSD and the netting relay. |

See [smart contracts](/contracts) for the per-contract reference and [deployed addresses](/networks/addresses) for live addresses.

## Backend services

The backend is a pnpm/Turborepo monorepo of independent Express services. Redis handles caching and pub/sub, Kafka carries async events, and a gateway fronts synchronous HTTP. The oracle read path is deliberately short: `aggregator-api` reads the chain directly and answers from a small in-memory cache, so a price lookup depends on nothing else being up.

| Service | Responsibility |
| --- | --- |
| **gateway** | Pure reverse proxy. Routes `/<service-path>` to each downstream service and runs JWT auth on the way through. No business logic. |
| **aggregator-api** | The public read API. Exposes on-chain oracle state as JSON over `viem`, with a short in-memory TTL cache. Every downstream consumer (the admin panel, Oracle Chat, MCP) reads through this. |
| **user** | Auth, profiles, JWT issuance, media uploads, waitlist. |
| **websocket** | Real-time push over Socket.IO. JWT-gated connections join per-user and global rooms. |
| **relay-pusher** | The price relay: reads sources, medians, signs, and pushes on-chain on a deviation-or-heartbeat trigger. One process per chain and asset class, each on its own signer key, because two relays on one key share a nonce sequence and race. Equities push during the US regular session, on a shared exchange calendar (`@squidlor/market-hours`) that the market service also reads. |
| **quest** | The prediction-market API behind [markets.squidlor.com](https://markets.squidlor.com): market creation and its session-hours gate, orders through the netting relay, positions, settlement, the hourly and daily round scheduler, Season 1 points and the leaderboard. |
| **chain watcher** | Indexes the market contracts on Arc (creations, trades, resolutions) into the database `quest` reads. Judge its health by indexed block against chain head, not by process status. |
| **netting relay** | Submits users' signed orders on-chain and pays the gas, nets fills, and pays out winning positions after settlement. The only component that ever moves sqUSD to a trader. |
| **pyth-pusher** | Keeps Pyth's on-chain price cache warm for low-liquidity feeds, which can otherwise go stale for days under a pure pull model. |
| **sports-pusher** | Resolves sports events on-chain; the working pilot for [resolver oracles](/oracle/resolver-oracles). Not deployed on Arc. |
| **price-stream** | The realtime half of the oracle. Holds WebSocket connections to the venues, keeps a rolling median per symbol, and publishes it to Redis once a second. `aggregator-api`, the websocket service, notifications and the relay all read from there. See [realtime prices](/api/realtime). |
| **developer** | API keys, projects, plans and usage metering. Behind every key the read API accepts and the chat's `create_api_key` tool. |
| **notification** | Price alerts and signed webhooks, including the `create_webhook` tool on MCP. |
| **defi-agent** | The capability layer behind the wallet, token and quote tools. It holds Squidlor auth, the identity mapping and the server-side policy, and it is the only service that talks to the execution engine. Quotes come back unsigned, so it holds no key material. |
| **mcp** | The [MCP server](/ai/mcp). |

Every service follows the same boot sequence (connect Mongo and Redis, then listen) and reads configuration from both its own environment file and the monorepo root.

## Frontends

| App | Audience |
| --- | --- |
| **hub** | [app.squidlor.com](https://app.squidlor.com): one sign-in and six chapters over every product. No backend of its own; it proxies the gateway and the chat server on its own origin. See [Hub](/products/hub). |
| **oracle-chat** | [Oracle Chat](/ai/oracle-chat): six desks over live feed state, wallets, Virtuals agent tokens and prediction markets, live at [chat.squidlor.com](https://chat.squidlor.com). |
| **dashboard** | [markets.squidlor.com](https://markets.squidlor.com): the prediction market, the create form and the Season 1 board. See [prediction markets](/products/markets). |
| **portal** | The builder portal at [build.squidlor.com](https://build.squidlor.com): projects, API keys, usage charts and plans. |
| **admin** | The operator control panel: feed health, source status, chain switching, relay cadence, event-outcome management, clippers review, chat providers, roles, randomness state, earnings. |
| **landing** | The public marketing site at [squidlor.com](https://squidlor.com), including [Clippers](/products/clippers). |
| **docs** | This site. |
| **agent** | The X agent, [@Squidlor_Agent](https://x.com/Squidlor_Agent). Replies to mentions with oracle prices and Virtuals data; replies are drafted for review. |
| **short links** | `squidlor.market` and `sqdlr.live`: market share links with rendered preview cards. Redirect only; they never serve the app. |

## Chain-agnostic by construction

No component hardcodes a chain. Contracts are plain EVM with no precompile dependencies; the relayers and APIs are parameterized by chain ID and RPC URL through environment variables.

The practical consequence: bringing Squidlor to a new EVM chain is a deploy plus a configuration change. The Arc launch, like the two chain launches before it, required no Solidity change.

> [!NOTE]
> Adding a *pair* is smaller still: one per-asset proxy deploy pointed at the existing adapter, then `addSource` calls on a new aggregator. There is no storage migration, because storage slots are derived from the feed ID rather than from contract layout. See [SquidlorAdapterV2](/contracts/adapter).
