---
title: Errors & limits
description: Every status code the API returns, what each one actually means, and how to build a client that degrades sensibly.
---

## Status codes

| Status | Meaning | What to do |
| --- | --- | --- |
| `200` | Success. | Check the payload; a `200` can still carry a `peekError` or `aggregated.error`. |
| `400` | Invalid parameter. Almost always a bad `interval`. | Fix the request. The message lists valid values. |
| `404` | Feed, event, or chain not configured on this instance. | Do not retry. Configuration, not a transient failure. |
| `503` | The aggregate is unavailable (`peek()` reverted), or history is not enabled. | Retry with backoff for the first case; the second will not resolve without a server config change. |
| `500` | RPC failure or unexpected error. | Retry with backoff. |

Error bodies carry a single `message` field:

```json
{ "message": "Feed not found: XAU/USD on chain 4663" }
```

## The two failure modes worth distinguishing

**`404`: nothing is misconfigured on your end necessarily, but nothing will change.** The chain has no aggregator map on this instance, or the pair genuinely does not exist. Retrying is pointless. This is also what you get for a chain the instance does not know at all:

```json
{ "message": "chain not supported: 4663" }
```

**`503` on a value endpoint: the feed exists but has no usable answer right now.** Too few healthy sources. This is transient and worth retrying, and it is also worth alerting on, because it means the feed is degraded.

```json
{
  "pair": "BTC/USD",
  "chainId": 8453,
  "error": "minHealthySources not met"
}
```

> [!IMPORTANT]
> The most common integration bug in this API is treating a `503` as a `200` with a missing value. `value` is `undefined`, and a client that does arithmetic on it produces `NaN`, or worse, coerces it to `0` and reports the price of BTC as zero. Always check the status first.

## Degraded success

Two cases return `200` while carrying bad news in the body.

**`peekError` on a feed object.** The per-source data was readable but the aggregate was not. `median` is absent.

```json
{
  "pair": "SOL/USD",
  "peekError": "minHealthySources not met",
  "sources": [ { "name": "squidlor", "isStale": true } ]
}
```

**A low `healthyCount`.** This is the subtle one: the request succeeded, a price came back, and it is technically valid. But `healthyCount: 1` of `totalSources: 8` means the multi-source guarantee is not currently holding for that feed.

```typescript
const feed = await fetchFeed("arbitrum", "BTC_USD");

if (feed.peekError) {
  throw new Error(`aggregate unavailable: ${feed.peekError}`);
}

// A valid price from one source is not the same as a valid price from five.
if (feed.healthyCount < 2 && feed.sources.length > 1) {
  logger.warn(
    `${feed.pair} is running on ${feed.healthyCount}/${feed.sources.length} sources`,
  );
}
```

## Rate limits

| Tier | Requests/minute | Counted per |
|---|---|---|
| Anonymous (no key) | 30 | IP address |
| Free key | 300 | key |
| Pro | 3,000 | key |
| Institutional | unlimited | key |

Every `/v1` response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` and `X-Squidlor-Tier`. Exceeding the allowance returns `429` with `code: "RATE_LIMITED"`, a `Retry-After` header and `retryAfterSec` in the body.

`X-Squidlor-Tier` is the quickest way to confirm your key is being read; if you sent one and see `anon`, it did not arrive.

An unrecognised chain is a `404`, not a fallback: `/v1/robinhoood/feeds` (typo) returns
`chain not supported: robinhoood` rather than quietly serving another chain's prices. On the
legacy query-param routes, a malformed `chainId` is a `400` with `code: INVALID_CHAIN_ID`.

Two authentication errors are worth knowing:

- `401 INVALID_API_KEY`: the key does not exist or was revoked. A bad key is an error rather than a silent downgrade, so a broken deploy is loud.
- `X-Squidlor-Key-Unverified: true` on a `200`: our key lookup was degraded, so your valid key was served at anonymous limits instead of being rejected.

On the anonymous and free tiers, `/history`, `/ohlc` and `/audit` reach back 30 days. Longer windows are **clamped, not rejected**: you get `200` with 30 days of data plus `X-History-Clamped: true` and `X-History-Lookback-Days`.

See [authentication](/build/authentication) and [rate limits & plans](/build/rate-limits) for the full picture.

Responses are cached for 10 seconds, so polling faster than that returns identical bytes and buys you nothing. Practical guidance:

- **Poll at 10 seconds or slower.** Anything faster is served from cache and still counts against your limit.
- **Cache on your side too**, especially if you fan a single price out to many users.
- **Back off on `500` and `503`** with exponential delay and jitter, rather than retrying in a tight loop.
- **For real-time UI**, prefer Squidlor's WebSocket push over polling this API.

## Timeouts and retries

Every live-read endpoint makes on-chain calls, so latency depends on the RPC endpoint behind the service. A cold read that misses the cache and multicalls eight sources is meaningfully slower than a cache hit.

Set a client timeout of a few seconds and retry rather than hanging:

```typescript
async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      // 404 and 400 are permanent; retrying wastes time and adds load.
      if (response.status === 404 || response.status === 400) return response;
      if (response.ok) return response;
    } catch {
      // Network error or timeout; fall through to the backoff.
    }

    // Exponential backoff with jitter, skipped after the final attempt.
    if (attempt < attempts - 1) {
      const delay = 2 ** attempt * 500 + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`request failed after ${attempts} attempts: ${url}`);
}
```

## Health check

```bash
curl https://api.squidlor.com/aggregator/health
```

Reports service liveness only. It does not tell you whether feeds are healthy; for that, read `/v1/:chain/feeds` and inspect `healthyCount` per feed.

That distinction matters for monitoring: a green health check with every feed on one source is a system that looks fine and is not.
