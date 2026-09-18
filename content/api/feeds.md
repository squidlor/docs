---
title: Feeds
description: List feeds, read full per-source feed state, or fetch just the latest value, with every response field explained.
---

Three endpoints, in increasing order of detail. All are live reads of on-chain state, cached for 10 seconds.

## List feeds

```http
GET /v1/:chain/feeds
```

Returns a summary of every aggregator configured for the chain.

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds
```

```json
{
  "chainId": 5042,
  "count": 7,
  "feeds": [
    {
      "chainId": 5042,
      "pair": "BTC/USD",
      "aggregator": "0x9a4e4d5f83e3ad9568Ee2919cc0A4Ba7a4c0F735",
      "kind": "aggregator",
      "description": "BTC/USD (Squidlor aggregated, Arc)",
      "median": "79903",
      "healthyCount": 1,
      "totalSources": 1,
      "freshestUpdatedAt": 1789739907
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `pair` | Normalized uppercase pair name. |
| `aggregator` | The `SquidlorOracleAggregator` address, the contract to read on-chain. |
| `median` | The aggregate answer as a decimal string, already scaled by the feed's decimals. |
| `healthyCount` | How many sources passed the staleness check on this read. |
| `totalSources` | How many sources are configured, healthy or not. |
| `freshestUpdatedAt` | Unix seconds. The most recent `updatedAt` among healthy sources. |
| `peekError` | Present only on failure: the revert reason from `peek()`. `median` is then absent. |

> [!IMPORTANT]
> Watch the ratio of `healthyCount` to `totalSources`. Every Arc pair runs one source today, so a healthy read is 1 of 1: valid, but with nothing corroborating it. Alert on `healthyCount` reaching 0, which is when `peek()` reverts and `median` disappears, and re-check the ratio once a second source is wired.

An empty `feeds` array means no aggregators are configured for that chain on this instance, not that the chain has no feeds. Configuration is per deployment.

## Get one feed

```http
GET /v1/:chain/feeds/:pair
```

The full state of one aggregator, including a per-source breakdown. This is the endpoint to use when you want to know *why* a price is what it is.

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD
```

```json
{
  "chainId": 5042,
  "pair": "BTC/USD",
  "aggregator": "0x9a4e4d5f83e3ad9568Ee2919cc0A4Ba7a4c0F735",
  "kind": "aggregator",
  "description": "BTC/USD (Squidlor aggregated, Arc)",
  "decimals": 8,
  "owner": "0xB57BBda48C33fF725E93D604023D56D9C5b00e2a",
  "selectionMode": "MEDIAN",
  "minHealthySources": 1,
  "defaultMaxStaleness": 600,
  "latestRoundId": "0",
  "median": "79903",
  "medianRaw": "7990300000000",
  "freshestUpdatedAt": 1789739907,
  "healthyCount": 1,
  "sources": [
    {
      "index": 0,
      "adapter": "0x12AeA54771C43CB6A0d393B930c642F28389210B",
      "name": "squidlor:BTC/USD",
      "enabled": true,
      "maxStaleness": 900,
      "price": "79903",
      "priceRaw": "7990300000000",
      "updatedAt": 1789739907,
      "isStale": false
    }
  ],
  "cachedAt": "2026-09-18T14:00:34.719Z"
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
| `name` | Self-reported label from the adapter, e.g. `squidlor:BTC/USD`. Arc runs one source per pair today, so it is `squidlor` on every feed. |
| `enabled` | Disabled sources are never counted, even if fresh. |
| `maxStaleness` | Seconds. `0` means the aggregator's `defaultMaxStaleness` applies. |
| `price` / `priceRaw` | This source's own answer, formatted and raw. |
| `updatedAt` | This source's own timestamp for that answer. |
| `isStale` | Computed: `now > updatedAt + effectiveMaxStaleness`. |
| `error` | Present if reading the adapter failed. `price` is then absent. |

A source with `isStale: true` or an `error` is excluded from the median but still reported, which is what makes this endpoint useful for diagnosis rather than just display.

## Get just the value

```http
GET /v1/:chain/feeds/:pair/value
```

For consumers that only want the number: cron jobs, indexers, dashboards, spreadsheet formulas.

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD/value
```

```json
{
  "pair": "BTC/USD",
  "chainId": 5042,
  "value": "80332.85",
  "valueRaw": "8033285000000",
  "decimals": 8,
  "healthyCount": 1,
  "updatedAt": 1789740074
}
```

The legacy query-string route additionally returns `ok`, `totalSources`, and `mode`:

```bash
curl "https://api.squidlor.com/aggregator/v1/feeds/BTC_USD/value?chainId=5042"
```

```json
{
  "pair": "BTC/USD",
  "chainId": 5042,
  "ok": true,
  "value": "80332.85",
  "valueRaw": "8033285000000",
  "decimals": 8,
  "healthyCount": 1,
  "totalSources": 1,
  "updatedAt": 1789740074,
  "mode": "MEDIAN",
  "kind": "aggregator"
}
```

### When the aggregate is unavailable

If `peek()` reverts, typically because too few sources are healthy, this endpoint returns **503**, not 200 with a null:

```json
{
  "pair": "BTC/USD",
  "chainId": 5042,
  "error": "minHealthySources not met"
}
```

Handle the 503. A consumer that only checks for a 200 and reads `value` will get `undefined` and, if it is careless, treat it as zero.

```typescript
const response = await fetch(
  "https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD/value",
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
| `503` | The aggregate is unavailable; `peek()` reverted. |
| `500` | RPC failure or an unexpected error. |

Full detail in [errors & limits](/api/errors).
