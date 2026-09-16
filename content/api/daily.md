---
title: Daily prices
description: One price per asset per 00:00 UTC boundary, kept permanently: every streamed token, every tracked stock, and every on-chain feed.
---

Every other price endpoint answers "now" or "recently". This one is the long-run record: a single price for every asset we track, taken at each **00:00 UTC** boundary, and kept indefinitely.

| Endpoint | Cadence | Retention | Covers |
| --- | --- | --- | --- |
| `/v1/prices` | 1 second | none (live only) | streamed tokens |
| `/v1/:chain/feeds/:pair/history` | ~60 seconds | 90 days | on-chain pairs |
| `/v1/daily/:symbol` | 1 day | **permanent** | tokens, stocks, on-chain pairs |

> [!WARNING]
> Requires the API instance to have `MONGODB_URI` configured. Without it these endpoints return **503** `DAILY_UNAVAILABLE`; live reads are unaffected.

## Asset classes

A row belongs to exactly one class, and the class decides how the price was measured.

| `assetClass` | `symbol` | Measured as |
| --- | --- | --- |
| `crypto` | `BTC`, `SOL` | median across live venue WebSockets, captured at the boundary |
| `equity` | `NVDA`, `TSLA` | median of independent quote APIs, captured at the boundary |
| `onchain` | `BTC/USD` | the on-chain aggregator's answer at the boundary |

`crypto` and `onchain` can both hold the same asset. They are two different measurements (the off-chain market, and the value contracts actually read, which only updates on a 0.5% deviation or the hourly heartbeat), so they are stored and returned separately rather than merged.

The same pair on two chains is likewise two rows, not one: rows stored from earlier chains keep their own `chainId` and are not merged into Arc's.

## Reading `source` before you settle

Every row says where its number came from. This matters more than the number for anything that resolves money.

| `source` | Meaning |
| --- | --- |
| `price-stream` | our venue median, observed at the boundary |
| `equity-median` | our quote-API median, observed at the boundary |
| `onchain:<chainId>` | the on-chain answer, read at the boundary |
| `feed-round` | recovered afterwards from the nearest 60-second history sample |
| `backfill:<vendor>` | an external daily candle, seeded for days that predate our recording |

`offsetMs` is how far the observation sits from the boundary: `0` for a backfilled candle (the vendor's daily bucket *is* the boundary), a second or two for a live capture, and hours for a snapshot taken by hand after a missed midnight. A better source never gets overwritten by a worse one, whichever runs later.

## Coverage

```http
GET /v1/daily/coverage
```

Call this before charting a series. A series read returns the rows it has, so a range with holes looks identical to a shorter range; this is where the holes are visible.

```bash
curl "https://api.squidlor.com/aggregator/v1/daily/coverage"
```

```json
{
  "classes": [
    { "assetClass": "crypto", "rows": 41230, "symbolCount": 203, "firstDay": "2020-01-01", "lastDay": "2026-08-27" },
    { "assetClass": "equity", "rows": 9760, "symbolCount": 4, "firstDay": "2020-01-01", "lastDay": "2026-08-27" },
    { "assetClass": "onchain", "rows": 1680, "symbolCount": 14, "firstDay": "2026-08-01", "lastDay": "2026-08-27" }
  ],
  "recentGaps": { "window": "2026-07-28..2026-08-27", "missingDays": [] }
}
```

Days before a class's `firstDay` are pre-history, not gaps, and are never reported as missing.

## One day, every asset

```http
GET /v1/daily
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `day` | latest day held | `YYYY-MM-DD`, an ISO timestamp, or a unix time. |
| `class` | all | `crypto`, `equity` or `onchain`. |
| `chain` | all | For `class=onchain`: `arc`, or its chain id. |
| `symbols` | all | Comma-separated, e.g. `BTC,ETH,NVDA`. |
| `limit` | `1000` | Maximum rows. |

It defaults to the most recent day held rather than today, so a call made before tonight's capture does not return an empty board for a boundary that has not happened yet.

```bash
curl "https://api.squidlor.com/aggregator/v1/daily?day=2026-08-27&class=onchain&chain=arc"
```

```json
{
  "day": "2026-08-27",
  "at": "2026-08-27T00:00:00.000Z",
  "count": 5,
  "prices": [
    {
      "assetClass": "onchain",
      "symbol": "NVDA/USD",
      "quote": "USD",
      "day": "2026-08-27",
      "at": "2026-08-27T00:00:00.000Z",
      "observedAt": "2026-08-27T00:00:01.204Z",
      "offsetMs": 1204,
      "price": 221.125,
      "priceRaw": "22112500000",
      "decimals": 8,
      "source": "onchain:5042",
      "chainId": 5042,
      "contributorCount": 3
    }
  ]
}
```

## One asset over time

```http
GET /v1/daily/:symbol
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `class` | all | Pick one measurement rather than mixing them. |
| `chain` | - | Required when a pair is stored for more than one chain. |
| `from` / `to` | - | `YYYY-MM-DD`, ISO timestamp or unix time. Inclusive. |
| `limit` | `400` | Newest N rows in range, returned **oldest-first**. |

`:symbol` is a ticker (`BTC`, `NVDA`) for off-chain rows or a pair for on-chain ones, written with `_` for `/`, as in `BTC_USD`. With `class=onchain`, a bare ticker is read as `TICKER/USD`.

```bash
curl "https://api.squidlor.com/aggregator/v1/daily/BTC?from=2026-08-25"
```

```json
{
  "symbol": "BTC",
  "assetClass": "crypto",
  "count": 3,
  "from": "2026-08-25",
  "to": "2026-08-27",
  "prices": [
    { "day": "2026-08-25", "price": 78992.76, "source": "price-stream", "offsetMs": 812 },
    { "day": "2026-08-26", "price": 78539.13, "source": "price-stream", "offsetMs": 745 },
    { "day": "2026-08-27", "price": 79023.75, "source": "price-stream", "offsetMs": 903 }
  ]
}
```

A pair published on several chains returns **400** `AMBIGUOUS_CHAIN` listing them, rather than interleaving two chains into what looks like one line:

```json
{
  "code": "AMBIGUOUS_CHAIN",
  "message": "BTC/USD is stored for 2 chains (5042, 1). Add ?chain= to pick one.",
  "chains": [5042, 1]
}
```

## One asset, one day

```http
GET /v1/daily/:symbol/:day
```

The settlement shape: exact day in, one price out, **404** `NO_SNAPSHOT` when nothing is stored for it. It never substitutes a neighbouring day; a settlement that silently used the wrong day is worse than one that failed. When you want the nearest observation with the distance attached instead, use [`/at`](/api/providers#point-in-time-reads).

```bash
curl "https://api.squidlor.com/aggregator/v1/daily/NVDA/2026-08-27"
```

```json
{
  "symbol": "NVDA",
  "day": "2026-08-27",
  "at": "2026-08-27T00:00:00.000Z",
  "price": {
    "assetClass": "equity",
    "symbol": "NVDA",
    "price": 209.66,
    "source": "equity-median",
    "contributors": ["yahoo", "nasdaq", "finnhub", "twelvedata"],
    "session": "2026-08-26",
    "sessionInferred": true
  }
}
```

## Where the pre-history comes from

Days that predate our own recording are seeded once from free, keyless public endpoints, then never
touched again; a captured observation always outranks a backfilled candle. Measured on 2026-08-27:

| Source | Auth | Depth reached | Served |
| --- | --- | --- | --- |
| `data-api.binance.vision` klines | none | 2017-08-17 (BTCUSDT listing) | 208 of the top 250 tokens |
| Coinbase Exchange candles | none | 2015-07-20 (BTC-USD listing) | 76 tokens, incl. the pre-2017 majors |
| Kraken OHLC | none | last 720 candles only | 38 tail tokens nothing else lists |
| Yahoo chart | none | 1990 and earlier | every US ticker tried |

For crypto the price at 00:00 UTC is the daily candle's **open**, identically the previous day's
close. The primary venue is used wherever it has data and a later venue only fills days it never
listed, so BTC reaches 2015-07-20 instead of stopping at Binance's 2017 start. Each row names the
venue that supplied it, so a handover is visible in the data rather than hidden behind one label.

One full seeding run, measured end to end:

```text
250 tokens,  2015-01-01 → today   302,609 rows   7m36s   16MB data + 20MB indexes
 50 stocks,  1990-01-01 → today   569,375 rows   1m09s   37MB data + 29MB indexes
```

## Stocks and the 00:00 UTC boundary

00:00 UTC is 19:00 or 20:00 ET depending on daylight saving: after the US close, before the next open. So an equity row is the **previous session's close**, and `session` names which session that was:

- A weekday boundary carries the day before's close.
- Saturday, Sunday and Monday boundaries all carry Friday's close.
- A holiday boundary repeats the last session that traded.

`sessionInferred: true` means the session was worked out from the calendar (weekends only; there is no holiday table), rather than reported by the data source. Crypto has no sessions: 00:00 UTC is a genuine daily open, and the value is the market at that instant.

> [!WARNING]
> Backfilled equity rows are **split-adjusted**. AAPL's January 1990 sessions come back near $0.39, not the ~$35 they printed at the time. That is the right series to chart and the wrong number to quote as a historical price. It also means a future split changes what a re-run backfill returns for old days, while rows captured live at the boundary stay nominal, so a series spanning a split can carry a step that is the adjustment, not the market. Rows we captured ourselves (`source: equity-median`) are never re-adjusted.

## Plan limits

`from`, `to` and `:day` are subject to the same history lookback as `/history` and `/ohlc`. A clamped range comes back with `X-History-Clamped: true` and `X-History-Lookback-Days`; a single day outside it returns **403** `BEYOND_LOOKBACK`. See [Errors & limits](/api/errors).
