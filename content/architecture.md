---
title: System architecture
description: How the contracts, relayers, services, and frontends fit together — and which piece to look at when something is wrong.
---

Squidlor is one system with three faces: contracts on chain, a set of backend services off chain, and the interfaces people actually touch.

## The shape of it

```text
                     ┌──────────────────────────────────────────┐
  Data providers ───▶ │ relay-pusher · pyth-pusher              │  push prices on-chain
  (CEXs, Yahoo,      │ sports-pusher                            │  push event outcomes
   Nasdaq, …)        └──────────────────┬───────────────────────┘
                                        ▼
             ┌──────────────────────────────────────────────────────┐
   ON CHAIN  │ SquidlorAdapterV2 → SquidPriceFeed (per asset)       │
             │ SquidlorOracleAggregator (per pair) ← ChainlinkSource│
             │ AggregatorRegistry · CommitRevealRandomness          │
             │ EventOracleAggregator                                │
             └──────────────────────┬───────────────────────────────┘
                                    │ read
                                    ▼
                          ┌──────────────────┐
                          │  aggregator-api  │  JSON over HTTP
                          └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
   ┌────────────────────────────────────────────────────────────┐
   │ admin (ops)  ·  landing  ·  docs                           │
   │ oracle-chat  ·  mcp                                        │
   └────────────────────────────────────────────────────────────┘
```

## Contracts

Two repositories, deployed independently.

| Repo | Contains |
| --- | --- |
| **squid-contract** | The oracle core: `SquidlorAdapterV2` and the per-asset `SquidPriceFeed` proxies that present it as a Chainlink feed. |
| **aggregator-contract** | `SquidlorOracleAggregator` instances, the source adapters (`ChainlinkSource`, `SquidSource`, …), `AggregatorRegistry`, and the economics contracts: `RewardDistributor`, `FeeCollector`, `SquidlorCommitRevealRandomness`. |

See [smart contracts](/contracts) for the per-contract reference and [deployed addresses](/networks/addresses) for live addresses.

## Backend services

The backend is a pnpm/Turborepo monorepo of independent Express services. Redis handles caching and pub/sub, Kafka carries async events, and a gateway fronts synchronous HTTP. The oracle read path is deliberately short: `aggregator-api` reads the chain directly and answers from a small in-memory cache, so a price lookup depends on nothing else being up.

| Service | Responsibility |
| --- | --- |
| **gateway** | Pure reverse proxy. Routes `/<service-path>` to each downstream service and runs JWT auth on the way through. No business logic. |
| **aggregator-api** | The public read API. Exposes on-chain oracle state as JSON over `viem`, with a short in-memory TTL cache. Every downstream consumer — the admin panel, Oracle Chat, MCP — reads through this. |
| **user** | Auth, profiles, JWT issuance, media uploads, waitlist. |
| **websocket** | Real-time push over Socket.IO. JWT-gated connections join per-user and global rooms. |
| **relay-pusher** | The price relay: reads sources, medians, signs, and pushes on-chain on a schedule. Crypto hourly; equities during US market hours. |
| **pyth-pusher** | Keeps Pyth's on-chain price cache warm for low-liquidity feeds, which can otherwise go stale for days under a pure pull model. |
| **sports-pusher** | Resolves sports events on-chain — the working pilot for [resolver oracles](/oracle/resolver-oracles). |
| **mcp** | The [MCP server](/ai/mcp). |

Every service follows the same boot sequence — connect Mongo and Redis, then listen — and reads configuration from both its own environment file and the monorepo root.

## Frontends

| App | Audience |
| --- | --- |
| **admin** | The operator control panel: feed health, source status, chain switching, relay cadence, event-outcome management, roles, validators, randomness state, earnings. |
| **landing** | The public marketing site. |
| **docs** | This site. |
| **oracle-chat** | The [natural-language interface](/ai/oracle-chat) to live feed state. |

## Chain-agnostic by construction

No component hardcodes a chain. Contracts are plain EVM with no precompile dependencies; the relayers and APIs are parameterized by chain ID and RPC URL through environment variables.

The practical consequence: bringing Squidlor to a new EVM chain is a deploy plus a configuration change. The Robinhood Chain launch required no Solidity changes at all.

> [!NOTE]
> Adding a *pair* is smaller still — one per-asset proxy deploy pointed at the existing adapter, then `addSource` calls on a new aggregator. There is no storage migration, because storage slots are derived from the feed ID rather than from contract layout. See [SquidlorAdapterV2](/contracts/adapter).
