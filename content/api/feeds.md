---
title: Feeds
description: List feeds, read full per-source feed state, or fetch just the latest value — with every response field explained.
---

Three endpoints, in increasing order of detail. All are live reads of on-chain state, cached for 10 seconds.

## List feeds

```http
GET /v1/:chain/feeds
```

Returns a summary of every aggregator configured for the chain.

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds
```

```json
{
  "chainId": 42161,
  "count": 7,
  "feeds": [
    {
      "chainId": 42161,
      "pair": "BTC/USD",
      "aggregator": "0x71aF698Ad533fb0e3f93a68096E1e25b3283f773",
      "description": "BTC/USD (Squidlor aggregated)",
      "median": "63434.9049817",
      "healthyCount": 1,
      "totalSources": 8,
      "freshestUpdatedAt": 1785243053
    }
  ],
  "cachedAt": "2026-07-28T12:50:53.011Z"
}
```

| Field | Meaning |
| --- | --- |
| `pair` | Normalized uppercase pair name. |
| `aggregator` | The `SquidlorOracleAggregator` address — the contract to read on-chain. |
| `median` | The aggregate answer as a decimal string, already scaled by the feed's decimals. |
| `healthyCount` | How many sources passed the staleness check on this read. |
| `totalSources` | How many sources are configured, healthy or not. |
| `freshestUpdatedAt` | Unix seconds. The most recent `updatedAt` among healthy sources. |
| `peekError` | Present only on failure — the revert reason from `peek()`. `median` is then absent. |

> [!IMPORTANT]
> Watch the ratio of `healthyCount` to `totalSources`. In the response above, 1 of 8 sources is healthy — the aggregate is technically valid because it clears `minHealthySources`, but it is effectively a single-source price. A monitoring integration should alert on that, not just on a missing value.

An empty `feeds` array means no aggregators are configured for that chain on this instance — not that the chain has no feeds. Configuration is per deployment.

## Get one feed

```http
GET /v1/:chain/feeds/:pair
```

The full state of one aggregator, including a per-source breakdown. This is the endpoint to use when you want to know *why* a price is what it is.

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD
```

```json
{
  "chainId": 42161,
  "pair": "BTC/USD",
  "aggregator": "0x71aF698Ad533fb0e3f93a68096E1e25b3283f773",
  "description": "BTC/USD (Squidlor aggregated)",
  "decimals": 8,
  "owner": "0x34f54E0Ca7f18DB6F088297d3a34D67B57B443Cb",
  "selectionMode": "MEDIAN",
  "minHealthySources": 1,
  "defaultMaxStaleness": 3600,
  "latestRoundId": "12",
  "median": "63434.9049817",
  "medianRaw": "6343490498170",
  "freshestUpdatedAt": 1785243053,
  "healthyCount": 1,
  "sources": [
    {
      "index": 0,
      "adapter": "0x…",
      "name": "chainlink",
      "enabled": true,
      "maxStaleness": 3600,
      "price": "63434.9049817",
      "priceRaw": "6343490498170",
      "updatedAt": 1785243053,
      "isStale": false
    },
    {
      "index": 1,
      "adapter": "0x…",
      "name": "squidlor",
      "enabled": true,
      "maxStaleness": 0,
      "price": "63501.2200000",
      "priceRaw": "6350122000000",
      "updatedAt": 1785150000,
      "isStale": true
    }
  ],
  "cachedAt": "2026-07-28T12:50:53.011Z"
}
```

### Aggregator fields

| Field | Meaning |
| --- | --- |
| `decimals` | Scale of `medianRaw`. 8 across every Squidlor pair. |
| `owner` | The address that can add, remove, and reorder sources. See the [trust model](/resources/trust-model). |
| `selectionMode` | `MEDIAN` or `PRIMARY_WITH_FALLBACK`. |
| `minHealthySources` | Below this count, `peek()` reverts and `median` is absent. |
| `defaultMaxStaleness` | Seconds. Applies to any source whose own `maxStaleness` is `0`. |
| `latestRoundId` | The last round committed by `poke()`. `0` means no round has ever been committed. |
| `median` / `medianRaw` | The aggregate, formatted and raw. |

### Source fields

| Field | Meaning |
| --- | --- |
| `index` | Position in the source list. Under `PRIMARY_WITH_FALLBACK` this is priority order. |
| `adapter` | The adapter contract wrapping this source. |
| `name` | Self-reported label from the adapter — `chainlink`, `squidlor`, and so on. |
| `enabled` | Disabled sources are never counted, even if fresh. |
| `maxStaleness` | Seconds. `0` means the aggregator's `defaultMaxStaleness` applies. |
| `price` / `priceRaw` | This source's own answer, formatted and raw. |
| `updatedAt` | This source's own timestamp for that answer. |
| `isStale` | Computed: `now > updatedAt + effectiveMaxStaleness`. |
| `error` | Present if reading the adapter failed. `price` is then absent. |

A source with `isStale: true` or an `error` is excluded from the median but still reported — which is what makes this endpoint useful for diagnosis rather than just display.

## Get just the value

```http
GET /v1/:chain/feeds/:pair/value
```

For consumers that only want the number: cron jobs, indexers, dashboards, spreadsheet formulas.

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD/value
```

```json
{
  "pair": "BTC/USD",
  "chainId": 42161,
  "value": "63434.9049817",
  "valueRaw": "6343490498170",
  "decimals": 8,
  "healthyCount": 1,
  "updatedAt": 1785243053
}
```

The legacy query-string route additionally returns `ok`, `totalSources`, and `mode`:

```bash
curl "https://api.squidlor.com/aggregator/v1/feeds/BTC_USD/value?chainId=42161"
```

```json
{
  "pair": "BTC/USD",
  "chainId": 42161,
  "ok": true,
  "value": "63434.9049817",
  "valueRaw": "6343490498170",
  "decimals": 8,
  "healthyCount": 1,
  "totalSources": 8,
  "updatedAt": 1785243053,
  "mode": "MEDIAN"
}
```

### When the aggregate is unavailable

If `peek()` reverts — typically because too few sources are healthy — this endpoint returns **503**, not 200 with a null:

```json
{
  "pair": "BTC/USD",
  "chainId": 42161,
  "error": "minHealthySources not met"
}
```

Handle the 503. A consumer that only checks for a 200 and reads `value` will get `undefined` and, if it is careless, treat it as zero.

```typescript
const response = await fetch(
  "https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD/value",
);

if (!response.ok) {
  // 503 = aggregate unavailable, 404 = no such feed on this chain
  throw new Error(`feed unavailable: ${response.status}`);
}

const { value, updatedAt } = await response.json();

// Decide for yourself whether this is fresh enough.
const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;
if (ageSeconds > 3600) {
  throw new Error(`price is ${ageSeconds}s old`);
}
```

## Errors

| Status | Meaning |
| --- | --- |
| `404` | No such feed on that chain, or the chain is not configured on this instance. |
| `503` | The aggregate is unavailable — `peek()` reverted. |
| `500` | RPC failure or an unexpected error. |

Full detail in [errors & limits](/api/errors).
