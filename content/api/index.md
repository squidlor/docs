---
title: API overview
description: The public read API. API root, chain addressing, pair formatting, caching, and the optional API key.
---

The `aggregator-api` service exposes Squidlor's on-chain oracle state as JSON over HTTPS. It is read-only, works without a key, and reads the same contract state your own `eth_call` would. It serves one chain, Arc; see [supported networks](/networks).

## API root

```text
https://api.squidlor.com/aggregator
```

Every path below is relative to that. So `/v1/feeds` means `https://api.squidlor.com/aggregator/v1/feeds`.

Running the service yourself, it listens on port `5010` by default and the root is just the host.

## Authentication

**Optional.** Every endpoint works without a key: the data is public on-chain state and the API is a convenience layer over it. That path is supported and is not going away.

A key raises your limits and lets you see your own usage:

| | Requests/minute | History lookback |
|---|---|---|
| No key | 30 (per IP) | 30 days |
| Free key | 300 | 30 days |
| Pro | 3,000 | unlimited |

```bash
curl -H "Authorization: Bearer sq_live_..." \
  https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD/value
```

Get one at [build.squidlor.com](https://build.squidlor.com). Full detail in [authentication](/build/authentication) and [rate limits](/build/rate-limits); error codes in [errors & limits](/api/errors).

## Two ways to address a chain

**Chain-scoped paths** (preferred). The chain is part of the path:

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds
curl https://api.squidlor.com/aggregator/v1/5042002/feeds
```

`:chain` accepts either the slug or the numeric chain ID of the configured network:

| Slug | Chain ID |
| --- | --- |
| `arc` | 5042002 on Arc Testnet; the mainnet id once the API serves mainnet |

**Legacy query-string paths**, still mounted for backwards compatibility:

```bash
curl "https://api.squidlor.com/aggregator/v1/feeds?chainId=5042002"
```

These default to the configured chain when `chainId` is omitted. New integrations should use the chain-scoped form: a feed is then addressable as `(chain, pair)` with no query string, which is what the SDK and frontends use.

> [!NOTE]
> An unrecognised slug returns `404`. Earlier multi-chain builds fell back to a default chain silently, so a typo returned another chain's prices with that chain's `chainId`; checking `chainId` in the response is still a good habit.

## Pair formatting

A pair contains a slash, which cannot appear in a path segment. Substitute an underscore:

| Pair | In a URL |
| --- | --- |
| `BTC/USD` | `BTC_USD` |
| `NVDA/USD` | `NVDA_USD` |

Pairs are case-insensitive on the way in and normalized to uppercase in responses.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/:chain/feeds` | [List every configured feed](/api/feeds#list-feeds) with a summary of each |
| `GET /v1/:chain/feeds/:pair` | [Full feed state](/api/feeds#get-one-feed), including every source |
| `GET /v1/:chain/feeds/:pair/value` | [Just the number](/api/feeds#get-just-the-value) |
| `GET /v1/:chain/feeds/:pair/history` | [Sampled median series](/api/history#history) |
| `GET /v1/:chain/feeds/:pair/ohlc` | [OHLC candles](/api/history#ohlc-candles) |
| `GET /v1/:chain/feeds/:pair/audit` | [Per-source audit trail](/api/history#audit-trail) |
| `GET /v1/:chain/feeds/:pair/constituents` | The live quotes behind Squidlor's own equity leg, and what it would publish now |
| `GET /v1/:chain/providers`, `/providers/:provider` | [Provider scorecards](/api/providers#provider-scorecards): fresh rate and deviation per source over any window |
| `GET /v1/:chain/feeds/:pair/at` | [Point-in-time read](/api/providers#point-in-time-reads), nearest recorded observation with its distance |
| `GET /v1/:chain/feeds/:pair/at/proof` | [Merkle proof](/api/providers#proofs) of a past observation against an on-chain root |
| `GET /v1/prices`, `/v1/prices/:symbol`, `/v1/prices/stream` | [Realtime off-chain medians](/api/realtime), 200 symbols, one tick a second |
| `GET /v1/daily…` | [Daily price book](/api/daily), one price per asset per 00:00 UTC, permanent |
| `GET /health` | Service liveness |
| `GET /` | Endpoint index |

## Caching and freshness

Responses are served from an in-memory TTL cache, **10 seconds by default**. Every response that reads live chain state carries a `cachedAt` timestamp so you can tell how old the read is.

This matters for how you interpret the two timestamps in a response:

- **`cachedAt`**: when the API last read the chain.
- **`updatedAt`** / **`freshestUpdatedAt`**: when the underlying *data* was last published on-chain by a source.

They answer different questions. A response can be freshly cached (`cachedAt` one second ago) and carry data that is hours old (`updatedAt`), which is exactly what you would see on an equity feed over a weekend.

> [!IMPORTANT]
> Never use this API as the price input to on-chain logic. It is an HTTP endpoint, it can be cached, and it can be man-in-the-middled, none of which is true of an `eth_call`. For contracts, [read the aggregator directly](/integration/reading-prices). This API is for dashboards, bots, analytics, and agents.

## History requires a database

The `history`, `ohlc`, and `audit` endpoints only work when the API instance is configured with MongoDB. Without it, the service runs in pure live-read mode and those three endpoints return `503`:

```json
{ "message": "history not enabled: set MONGODB_URI for the aggregator-api" }
```

The live-read endpoints work either way. See [history & OHLC](/api/history).
