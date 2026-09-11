---
title: History & OHLC
description: Sampled median history, OHLC candles, and the per-source audit trail: the three endpoints that require a configured database.
---

These three endpoints read recorded samples rather than live chain state. A background recorder samples every configured feed on an interval (60 seconds by default) and writes the result (median, per-source prices, staleness, and deviation) into MongoDB.

> [!WARNING]
> All three require the API instance to have `MONGODB_URI` configured. Without it, the service still serves live reads but these endpoints return **503**:
>
> ```json
> { "message": "history not enabled: set MONGODB_URI for the aggregator-api" }
> ```

Default retention is 90 days.

## Time parameters

`from` and `to` accept three formats, on every endpoint below:

| Format | Example |
| --- | --- |
| Unix seconds | `1785243053` |
| Unix milliseconds | `1785243053000` |
| ISO 8601 | `2026-07-28T12:00:00Z` |

Both are optional and inclusive. Omitting them returns the most recent data, subject to `limit`.

## Intervals

`interval` accepts one of six values, used by both `history` (for downsampling) and `ohlc` (for candle width):

```text
1m   5m   15m   1h   4h   1d
```

An unrecognized value returns `400` with the accepted list in the message.

## History

```http
GET /v1/:chain/feeds/:pair/history
```

The recorded median series for a feed.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `from` | - | Start of range. |
| `to` | - | End of range. |
| `interval` | `raw` | Downsample to this bucket. Omit for every recorded sample. |
| `limit` | - | Maximum points returned. |

```bash
curl "https://api.squidlor.com/aggregator/v1/base/feeds/BTC_USD/history?interval=1h&limit=3"
```

```json
{
  "chainId": 8453,
  "pair": "BTC/USD",
  "interval": "1h",
  "count": 3,
  "points": [
    {
      "ts": "2026-09-11T16:59:24.755Z",
      "median": "77891.64392423",
      "medianNum": 77891.64392423,
      "healthyCount": 2,
      "bucket": "2026-09-11T16:00:00.000Z"
    },
    {
      "ts": "2026-09-11T17:59:24.700Z",
      "median": "77531.09160608",
      "medianNum": 77531.09160608,
      "healthyCount": 2,
      "bucket": "2026-09-11T17:00:00.000Z"
    },
    {
      "ts": "2026-09-11T18:55:33.264Z",
      "median": "77016.42057129",
      "medianNum": 77016.42057129,
      "healthyCount": 2,
      "bucket": "2026-09-11T18:00:00.000Z"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `interval` | Echoes what was applied. `raw` when no downsampling was requested. |
| `ts` | Sample timestamp, ISO 8601. |
| `median` | Exact decimal string. Use this for anything that must not lose precision. |
| `medianNum` | The same value as a JSON number, for charting convenience. |
| `healthyCount` | Source count at the time of that sample. |

> [!NOTE]
> `median` and `medianNum` exist for different jobs. `medianNum` is a double and will lose precision on large values: fine for a chart axis, wrong for accounting. `median` is the exact string.
>
> `healthyCount` on a historical point is genuinely useful: it tells you whether a past price move was corroborated by several sources or came from one.

## OHLC candles

```http
GET /v1/:chain/feeds/:pair/ohlc
```

Candles computed over the recorded samples.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `interval` | `1h` | Candle width. |
| `from` / `to` | - | Range. |
| `limit` | - | Maximum candles. |

```bash
curl "https://api.squidlor.com/aggregator/v1/base/feeds/ETH_USD/ohlc?interval=4h&limit=2"
```

```json
{
  "chainId": 8453,
  "pair": "ETH/USD",
  "interval": "4h",
  "count": 2,
  "candles": [
    {
      "open": 2457.98015158,
      "high": 2648.4824623,
      "low": 2436.51,
      "close": 2564.51,
      "samples": 235,
      "t": "2026-09-11T12:00:00.000Z"
    },
    {
      "open": 2560.84242947,
      "high": 2580.03516738,
      "low": 2535.7852253,
      "close": 2535.7852253,
      "samples": 171,
      "t": "2026-09-11T16:00:00.000Z"
    }
  ]
}
```

`samples` is the count of recorded points that went into the candle. It is the honesty field: a candle built from 240 samples is meaningful, one built from 3 is not, and a gap in recording shows up here rather than being silently smoothed over.

> [!IMPORTANT]
> These candles describe **the oracle's published price**, not exchange trading activity. There is no volume, because no trades happened here. Do not treat them as market data; treat them as a record of what the oracle said.

## Audit trail

```http
GET /v1/:chain/feeds/:pair/audit
```

The per-source forensic record: what each source reported at each sample, how far it deviated from the median, and whether it was stale or erroring.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `from` / `to` | - | Range. |
| `limit` | - | Maximum rounds. |
| `source` | - | Filter to one source by name, e.g. `chainlink`. |
| `flagged` | `false` | `true` returns only rounds flagged for deviation or staleness. |

```bash
curl "https://api.squidlor.com/aggregator/v1/base/feeds/BTC_USD/audit?flagged=true&limit=1"
```

```json
{
  "chainId": 8453,
  "pair": "BTC/USD",
  "count": 1,
  "rounds": [
    {
      "chainId": 8453,
      "pair": "BTC/USD",
      "ts": "2026-09-09T12:21:00.852Z",
      "decimals": 8,
      "selectionMode": "MEDIAN",
      "peekError": "The contract function \"peek\" reverted with the following signature:\n0x1f4d5e9b",
      "flagged": true,
      "flagReasons": [
        "squidlor:BTC/USD: stale",
        "peek: The contract function \"peek\" reverted with the following signature:\n0x1f4d5e9b"
      ],
      "sources": [
        {
          "index": 0,
          "adapter": "0x49707860769dB9f662f429713ba9C11B1437BC38",
          "name": "chainlink:BTC/USD",
          "enabled": true,
          "price": "79350.45021471",
          "priceNum": 79350.45021471,
          "updatedAt": 1788955249,
          "isStale": false
        },
        {
          "index": 1,
          "adapter": "0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7",
          "name": "squidlor:BTC/USD",
          "enabled": true,
          "price": "79320.3",
          "priceNum": 79320.3,
          "updatedAt": 1788955125,
          "isStale": true
        }
      ]
    }
  ]
}
```

`deviationBps` is the source's distance from that round's median in basis points; 100 bps is 1%. A source is flagged when it exceeds the configured threshold (100 bps by default) or when it was stale or erroring.

This is the endpoint behind the ABYSS persona in [Oracle Chat](/ai/oracle-chat) and the `get_audit_trail` tool on the [MCP server](/ai/mcp). It answers the question that matters after an incident: *which source was wrong, and for how long?*

## Practical notes

**Sampling, not events.** History is a 60-second sampled record, not a log of on-chain updates. A price that moved and moved back inside one interval leaves no trace. For exact on-chain history, read `getRoundData` for committed rounds, or index the events yourself.

**Retention is finite.** 90 days by default. If you need a longer record, pull it into your own store on a schedule.

**A gap means the recorder was down.** The absence of samples over a window means nothing was recorded then, not that the price was unchanged. `samples` on a candle is the fastest way to spot this.
