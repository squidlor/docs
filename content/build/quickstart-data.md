---
title: Data quickstart
description: Pull prices, history, OHLC candles and the per-source audit trail over plain HTTP for dashboards, bots and analytics.
---

Everything the chain does not store — history, candles, per-source breakdowns — lives on the REST API. No key needed to start.

## One price

```bash
curl https://api.squidlor.com/aggregator/v1/robinhood/feeds/BTC_USD/value
```

```json
{
  "pair": "BTC/USD",
  "chainId": 4663,
  "value": "63460.2815151",
  "valueRaw": "6346028151510",
  "decimals": 8,
  "healthyCount": 1,
  "updatedAt": 1785828067
}
```

Pairs use an underscore in the path (`BTC_USD`), and chains accept a slug (`robinhood`, `arbitrum`) or a numeric chain ID.

## Every feed on a chain

```bash
curl https://api.squidlor.com/aggregator/v1/robinhood/feeds
```

Good first call for a dashboard — one request gives you every pair with its live median, healthy-source count and aggregator address.

## Candles

```bash
curl "https://api.squidlor.com/aggregator/v1/robinhood/feeds/BTC_USD/ohlc?interval=1h&limit=24"
```

Intervals: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`. Candles are built from sampled medians (one sample per minute), so they reflect what the oracle published rather than exchange trades. A one-minute candle from a feed that updates every ten minutes will be flat — that is accurate, not a gap.

## History

```bash
curl "https://api.squidlor.com/aggregator/v1/robinhood/feeds/BTC_USD/history?interval=15m&from=2026-07-01T00:00:00Z"
```

`from` and `to` accept unix seconds, unix milliseconds or ISO-8601. Without `interval` you get raw samples; with one, downsampled points.

Anonymous and free-tier requests are capped at 30 days of lookback. Reaching further back returns 30 days plus `X-History-Clamped: true` rather than an error — see [rate limits](/build/rate-limits).

## The audit trail

This is the endpoint that makes the oracle checkable rather than merely usable:

```bash
curl "https://api.squidlor.com/aggregator/v1/robinhood/feeds/BTC_USD/audit?flagged=true"
```

Each record is one sampled round with every source's own price, publish time, deviation from the median in basis points, and staleness flag. `flagged=true` returns only rounds where a source deviated past the threshold or went stale.

Use it to answer "was this feed healthy at 14:32 last Tuesday?" — including for pairs you do not consume, since it is open to everyone. Like `/history`, it reaches back 30 days on the free tiers.

## Equity constituents

For US equity pairs, the chain stores only the median. This exposes the sources behind Squidlor's own leg:

```bash
curl https://api.squidlor.com/aggregator/v1/robinhood/feeds/NVDA_USD/constituents
```

The response deliberately returns both the on-chain stored value and a live recomputation. They will differ between pushes — report the on-chain figure if you are describing what a contract sees, and never substitute the live one for it.

## With the SDK

```ts
import { createClient } from '@squidlor/oracle-sdk';

const api = createClient({ apiKey: process.env.SQUIDLOR_API_KEY });

const feeds = await api.listFeeds('robinhood');
const btc = await api.getValue('robinhood', 'BTC/USD');
const candles = await api.getOhlc('robinhood', 'BTC/USD', { interval: '1h', limit: 24 });
const flagged = await api.getAudit('robinhood', 'BTC/USD', { flagged: true });
```

Errors throw `SquidlorApiError` carrying `status`, `code` and `retryAfterSec`:

```ts
import { SquidlorApiError } from '@squidlor/oracle-sdk';

try {
  await api.getValue('robinhood', 'BTC/USD');
} catch (e) {
  if (e instanceof SquidlorApiError && e.status === 429) {
    await new Promise((r) => setTimeout(r, (e.retryAfterSec ?? 60) * 1000));
  } else throw e;
}
```

## Polling politely

The server caches responses for 10 seconds and feeds only change when a pusher lands an update. Polling every second gets you the same bytes ten times and burns your quota. Once every 10–30 seconds is plenty for a live dashboard; use `updatedAt` to detect real change.

## Machine-readable spec

An OpenAPI 3.1 description of every endpoint is served at [`/openapi.json`](https://api.squidlor.com/aggregator/openapi.json) — usable for client generation or as an agent tool definition.

## Ready-made

[`squidlor-price-widget`](/build/templates) is an embeddable widget built on these endpoints, in both vanilla JS and React.
