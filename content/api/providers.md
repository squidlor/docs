---
title: Scorecards & proofs
description: Provider scorecards that grade every oracle leg on freshness and deviation over any window, point-in-time reads for any past moment, and Merkle proofs against roots committed on-chain.
---

Three endpoints answer the questions a risk team asks after "what is the price": how reliable has each source been, what was the price at a given moment, and can you prove it. All three replay the same recorded rounds that back the [audit trail](/api/history#audit-trail), so they agree with each other by construction.

## Provider scorecards

```http
GET /v1/:chain/providers
GET /v1/:chain/providers/:provider
```

Grades every source wired into a chain's aggregators by replaying recorded rounds. Default window is the last 7 days; `?from=` and `?to=` (ISO timestamps or Unix seconds) set any window, `?pair=BTC_USD` restricts to one pair.

```bash
curl "https://api.squidlor.com/aggregator/v1/arc/providers?pair=BTC_USD"
```

```json
{
  "chainId": 5042002,
  "window": { "from": "2026-08-12T18:49:34Z", "to": "2026-09-11T18:49:34Z", "days": 30 },
  "roundsScanned": 12757,
  "providers": [
    {
      "name": "chainlink:BTC/USD",
      "provider": "chainlink",
      "kind": "oracle",
      "samples": 12757,
      "freshRate": 1,
      "staleRate": 0,
      "errorRate": 0,
      "deviation": { "median": 2, "p95": 6, "max": 44 },
      "worst": { "bps": 44, "ts": "2026-09-03T14:50:58Z", "median": 80114.69, "price": 80463.69 },
      "outlierRate": null
    },
    {
      "name": "squidlor:BTC/USD",
      "provider": "squidlor",
      "kind": "oracle",
      "samples": 12757,
      "freshRate": 0.9836,
      "staleRate": 0.0164,
      "errorRate": 0,
      "deviation": { "median": 2, "p95": 6, "max": 44 },
      "outlierRate": null
    }
  ],
  "summary": { "sources": 2, "reliable": 1, "mostlyStale": [], "neverFresh": [] }
}
```

| Field | Meaning |
| --- | --- |
| `freshRate` | Share of sampled rounds in which the source was inside its staleness window. The closest thing here to uptime. |
| `staleRate`, `errorRate` | Share of rounds the source was stale, or reverted or returned a non-positive price. |
| `deviation` | Distance from the round median in basis points: median, 95th percentile, maximum. |
| `worst` | The single round with the largest deviation, with both prices, so you can look at it. |
| `outlierRate` | How often this source was the furthest from the median. Only computed when a round had three or more healthy sources; with two, both are equally far by construction, so it is `null`. |
| `kind` | `oracle` or `dex`. DEX TWAPs are graded separately because an AMM lagging a fast move is an AMM behaving normally, not a bad feed. |
| `summary.reliable` | Sources with `freshRate` of 99% or better. `mostlyStale` is below 50%, `neverFresh` is zero. |

Two things to read carefully. Deviation is measured against the round median, not against truth: on a two-leg pair a large number means the legs disagreed, not which was right. And a disabled source is excluded entirely, because disabling is a configuration choice, not a performance fact.

Equity legs score low on `freshRate` over a 24-hour clock because Squidlor's equity feed publishes only during the US regular session and carries a two-hour window. That is by design; see [price feeds](/oracle/feeds#tokenized-equity-pairs).

For what these numbers look like on the live deployment, see [measured performance](/oracle/evidence).

## Point-in-time reads

```http
GET /v1/:chain/feeds/:pair/at?timestamp=<unix seconds or ISO>
```

Returns the recorded observation nearest the requested moment, with the distance attached. Recording is sampled, so an exact-timestamp answer does not exist and the endpoint never pretends it does.

```bash
curl "https://api.squidlor.com/aggregator/v1/arc/feeds/ETH_USD/at?timestamp=1789145378"
```

```json
{
  "chainId": 5042002,
  "pair": "ETH/USD",
  "requestedAt": "2026-09-11T17:49:38Z",
  "observedAt": "2026-09-11T17:49:26Z",
  "offsetSeconds": -12,
  "median": "2570.6218883",
  "decimals": 8,
  "healthyCount": 2,
  "flagged": false,
  "sources": [
    { "name": "chainlink:ETH/USD", "price": "2571.59377661", "isStale": false, "deviationBps": 4 },
    { "name": "squidlor:ETH/USD", "price": "2569.65", "isStale": false, "deviationBps": -4 }
  ],
  "toleranceSeconds": 3600,
  "toleranceDefaulted": true
}
```

`?tolerance=` (seconds) bounds how far the nearest observation may be from the request; outside it the response is **404** `NO_OBSERVATION`. `offsetSeconds` is negative when the observation precedes the request. Every leg's price and deviation at that moment is included, so "what did Chainlink say at 14:30 while Squidlor said this" is one call.

For settlement-grade "exact day in, one price out" reads, use the [daily price book](/api/daily), which never substitutes a neighbouring observation.

## Proofs

```http
GET /v1/:chain/feeds/:pair/at/proof?timestamp=<unix seconds or ISO>
```

The same observation as `/at`, plus a Merkle proof against a root committed on-chain by `SquidlorHistoryAnchor`. Anchoring runs per closed period, so an observation in the current, still-open period is not provable yet and the endpoint says so instead of returning an unproven observation:

```json
{
  "code": "NO_ANCHORED_OBSERVATION",
  "message": "No anchored observation for that pair near that time. Anchoring runs per closed period, so the most recent period is not provable yet. /at returns the observation without a proof."
}
```

A successful response carries `root`, `leaf`, `proof[]`, and the anchor transaction, so a verifier can recompute the leaf from the observation fields and check inclusion without trusting this API. `@squidlor/oracle-sdk` 0.4.0 ships the helpers.

> [!NOTE]
> Proofs are anchored per chain and per period. If a period has no anchor, its observations are still served by `/at`; they are simply unprovable, and the response says which. A missing proof is never silently downgraded to an unproven answer.

## Rate limits

All three endpoints are metered like the rest of the API: 30 requests a minute without a key, 300 with a free key, 3,000 on the professional tier. Scorecard replays over long windows are the most expensive calls here; cache them.
