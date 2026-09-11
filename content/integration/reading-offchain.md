---
title: Read prices off-chain
description: Consuming Squidlor feeds from a backend, bot, or dashboard, via the HTTP API, or directly over RPC with viem.
---

Off-chain, you have two options: the [HTTP API](/api) or a direct RPC read. They differ in what you have to trust and what you have to operate.

| | HTTP API | Direct RPC |
| --- | --- | --- |
| Setup | A `fetch` call | An RPC endpoint and a client library |
| Trust | Squidlor's API server | Your RPC provider |
| Freshness | Cached 10s | Live |
| History, OHLC, audit | Available | You would have to index it yourself |
| Works if Squidlor is down | No | Yes |

**Rule of thumb:** use the API for dashboards, analytics, and agents. Use direct RPC for anything that moves money or must keep working independently of Squidlor's infrastructure.

## Via the HTTP API

```typescript
const BASE = "https://api.squidlor.com/aggregator";

type FeedValue = {
  pair: string;
  chainId: number;
  value: string;      // exact decimal string
  valueRaw: string;    // raw integer as a string
  decimals: number;
  healthyCount: number;
  updatedAt: number;   // unix seconds
};

async function getPrice(chain: string, pair: string): Promise<FeedValue> {
  // Pairs use `_` in a URL: BTC/USD -> BTC_USD
  const slug = pair.replace("/", "_");
  const response = await fetch(`${BASE}/v1/${chain}/feeds/${slug}/value`, {
    signal: AbortSignal.timeout(5000),
  });

  // 503 means the aggregate is unavailable: too few healthy sources.
  // 404 means the feed or chain isn't configured on this instance.
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`${pair}: HTTP ${response.status} ${body.message ?? ""}`);
  }

  return response.json();
}

const btc = await getPrice("arbitrum", "BTC/USD");
console.log(`${btc.pair} = ${btc.value} (${btc.healthyCount} healthy sources)`);
```

### Don't do float math on prices

```typescript
// WRONG: `value` is a decimal string for a reason. parseFloat silently loses
// precision, and the error compounds through anything downstream.
const price = parseFloat(feed.value);

// RIGHT: stay in integers, using the raw value and its declared scale.
const raw = BigInt(feed.valueRaw);      // 6343490498170n
const scale = 10n ** BigInt(feed.decimals); // 100000000n
const dollars = raw / scale;             // 63434n
const cents = (raw % scale) / (scale / 100n);
```

Format for display at the very end. Keep everything in `bigint` until then.

## Via direct RPC with viem

No dependency on Squidlor's servers, just an RPC endpoint:

```typescript
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { base } from "viem/chains";

const AGGREGATOR_ABI = parseAbi([
  "function peek() view returns (int256 answerValue, uint256 freshestUpdatedAt, uint256 healthyCount)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function sourceCount() view returns (uint256)",
]);

const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

const BTC_USD = "0xA180DcB56057a9a4D5DA17978Dd95C6692Ae6345"; // BTC/USD aggregator, Base

// One multicall instead of four round trips.
const [peek, decimals, sourceCount] = await client.multicall({
  contracts: [
    { address: BTC_USD, abi: AGGREGATOR_ABI, functionName: "peek" },
    { address: BTC_USD, abi: AGGREGATOR_ABI, functionName: "decimals" },
    { address: BTC_USD, abi: AGGREGATOR_ABI, functionName: "sourceCount" },
  ],
  allowFailure: false,
});

const [answer, freshestUpdatedAt, healthyCount] = peek;

console.log({
  price: formatUnits(answer, decimals),
  ageSeconds: Math.floor(Date.now() / 1000) - Number(freshestUpdatedAt),
  health: `${healthyCount}/${sourceCount}`,
});
```

> [!IMPORTANT]
> `peek()` **reverts** when fewer than `minHealthySources` sources are healthy. With `allowFailure: false` that throws; with `allowFailure: true` you get a `status: "failure"` entry. Either way, handle it: a feed being unreadable is a normal state to encounter, not an exceptional one.

## A monitoring pattern

The most useful thing to build off-chain is not a price display. It is a health check. A feed serving a valid price from one of eight sources looks fine and is not.

```typescript
type FeedHealth = {
  pair: string;
  ok: boolean;
  reason?: string;
};

async function checkFeed(chain: string, pair: string): Promise<FeedHealth> {
  const slug = pair.replace("/", "_");

  try {
    const response = await fetch(`${BASE}/v1/${chain}/feeds/${slug}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { pair, ok: false, reason: `HTTP ${response.status}` };
    }

    const feed = await response.json();

    // The aggregate itself failed to read.
    if (feed.peekError) {
      return { pair, ok: false, reason: `peek reverted: ${feed.peekError}` };
    }

    // Degraded but "successful": the price is valid and the redundancy is gone.
    const total = feed.sources.length;
    if (total > 1 && feed.healthyCount < 2) {
      return {
        pair,
        ok: false,
        reason: `running on ${feed.healthyCount}/${total} sources`,
      };
    }

    // Name the stale sources; that's what tells you which pusher to look at.
    const stale = feed.sources
      .filter((source: { isStale: boolean; error?: string }) => source.isStale || source.error)
      .map((source: { name: string }) => source.name);

    if (stale.length > 0) {
      return { pair, ok: true, reason: `stale sources: ${stale.join(", ")}` };
    }

    return { pair, ok: true };
  } catch (error) {
    return { pair, ok: false, reason: `unreachable: ${String(error)}` };
  }
}
```

The three conditions worth alerting on, in priority order:

1. **`peekError`**: the feed has no usable price at all.
2. **`healthyCount` below 2 on a multi-source feed**: the price is valid, the protection is not.
3. **Named stale sources**: one pusher or provider is behind while others carry the feed.

Most monitoring setups catch only the first. The second is the one that precedes an incident.

## Polling cadence

The API caches for 10 seconds, so polling faster than that returns identical bytes. Poll at 10 seconds or slower, cache on your side, and back off on `500`/`503`; see [errors & limits](/api/errors).

For real-time UI, use Squidlor's WebSocket push rather than polling.

## Using the SDK

`@squidlor/oracle-sdk` wraps the direct-RPC path with per-chain address resolution. See [Oracle SDK](/integration/sdk).
