---
title: History & OHLC
description: Sampled median history, OHLC candles, and the per-source audit trail — the three endpoints that require a configured database.
---

These three endpoints read recorded samples rather than live chain state. A background recorder samples every configured feed on an interval (60 seconds by default) and writes the result — median, per-source prices, staleness, and deviation — into MongoDB.

> [!WARNING]
> All three require the API instance to have `MONGODB_URI` configured. Without it, the service still serves live reads but these endpoints return **503**:
>
> ```json
> { "message": "history not enabled — set MONGODB_URI for the aggregator-api" }
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
| `from` | — | Start of range. |
| `to` | — | End of range. |
| `interval` | `raw` | Downsample to this bucket. Omit for every recorded sample. |
| `limit` | — | Maximum points returned. |

```bash
curl "https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD/history?interval=1h&limit=3"
```

```json
{
  "chainId": 42161,
  "pair": "BTC/USD",
  "interval": "1h",
  "count": 3,
  "points": [
    { "ts": "2026-07-28T10:00:00.000Z", "median": "63102.44000000", "medianNum": 63102.44, "healthyCount": 2 },
    { "ts": "2026-07-28T11:00:00.000Z", "median": "63288.10000000", "medianNum": 63288.10, "healthyCount": 2 },
    { "ts": "2026-07-28T12:00:00.000Z", "median": "63434.90498170", "medianNum": 63434.90, "healthyCount": 1 }
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
> `median` and `medianNum` exist for different jobs. `medianNum` is a double and will lose precision on large values — fine for a chart axis, wrong for accounting. `median` is the exact string.
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
| `from` / `to` | — | Range. |
| `limit` | — | Maximum candles. |

```bash
curl "https://api.squidlor.com/aggregator/v1/arbitrum/feeds/ETH_USD/ohlc?interval=4h&limit=2"
```

```json
{
  "chainId": 42161,
  "pair": "ETH/USD",
  "interval": "4h",
  "count": 2,
  "candles": [
    { "t": "2026-07-28T04:00:00.000Z", "open": 1871.22, "high": 1894.05, "low": 1868.40, "close": 1889.77, "samples": 240 },
    { "t": "2026-07-28T08:00:00.000Z", "open": 1889.77, "high": 1901.13, "low": 1880.02, "close": 1886.07, "samples": 238 }
  ]
}
```

`samples` is the count of recorded points that went into the candle. It is the honesty field: a candle built from 240 samples is meaningful, one built from 3 is not, and a gap in recording shows up here rather than being silently smoothed over.

> [!IMPORTANT]
> These candles describe **the oracle's published price**, not exchange trading activity. There is no volume, because no trades happened here. Do not treat them as market data — treat them as a record of what the oracle said.

## Audit trail

```http
GET /v1/:chain/feeds/:pair/audit
```

The per-source forensic record: what each source reported at each sample, how far it deviated from the median, and whether it was stale or erroring.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `from` / `to` | — | Range. |
| `limit` | — | Maximum rounds. |
| `source` | — | Filter to one source by name, e.g. `chainlink`. |
| `flagged` | `false` | `true` returns only rounds flagged for deviation or staleness. |

```bash
curl "https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD/audit?flagged=true&limit=1"
```

```json
{
  "chainId": 42161,
  "pair": "BTC/USD",
  "count": 1,
  "rounds": [
    {
      "ts": "2026-07-28T09:14:00.000Z",
      "median": "63180.00000000",
      "healthyCount": 2,
      "sources": [
        { "name": "chainlink", "price": "63180.00000000", "deviationBps": 0, "isStale": false, "flagged": false },
        { "name": "squidlor", "price": "64520.00000000", "deviationBps": 212, "isStale": false, "flagged": true }
      ]
    }
  ]
}
```

`deviationBps` is the source's distance from that round's median in basis points — 100 bps is 1%. A source is flagged when it exceeds the configured threshold (100 bps by default) or when it was stale or erroring.

This is the endpoint behind the ABYSS persona in [Oracle Chat](/ai/oracle-chat) and the `get_audit_trail` tool on the [MCP server](/ai/mcp). It answers the question that matters after an incident: *which source was wrong, and for how long?*

## Practical notes

**Sampling, not events.** History is a 60-second sampled record, not a log of on-chain updates. A price that moved and moved back inside one interval leaves no trace. For exact on-chain history, read `getRoundData` for committed rounds, or index the events yourself.

**Retention is finite.** 90 days by default. If you need a longer record, pull it into your own store on a schedule.

**A gap means the recorder was down.** The absence of samples over a window means nothing was recorded then — not that the price was unchanged. `samples` on a candle is the fastest way to spot this.
