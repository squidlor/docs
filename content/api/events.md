---
title: Events
description: Read event-outcome aggregator state: registered questions, per-source attestations, and the aggregated YES/NO/INVALID result.
---

These endpoints expose the event-resolution side of the oracle: not "what is the price of X" but "did event Y happen". They read an `EventOracleAggregator` and its sources.

> [!NOTE]
> Event resolution is the newest part of the stack. Sports resolution runs today through the `sports-pusher` service; the other resolver types described in [resolver oracles](/oracle/resolver-oracles) are designed but not built. If a chain has no event aggregator configured, these endpoints return `404`.

## Outcome values

Every outcome is one of four values, reported both as a label and a numeric code:

| Code | Label | Meaning |
| --- | --- | --- |
| `0` | `UNRESOLVED` | No answer yet. |
| `1` | `YES` | The event occurred. |
| `2` | `NO` | The event did not occur. |
| `3` | `INVALID` | The question cannot be meaningfully answered: void, ambiguous, or cancelled. |

`INVALID` is the important one. Without it, an unanswerable question forces a wrong answer; with it, a market can settle as void rather than settling incorrectly.

## Aggregation modes

How the aggregator combines its sources' attestations:

| Mode | Behaviour |
| --- | --- |
| `MAJORITY` | The outcome most sources agree on. |
| `UNANIMOUS` | All enabled sources must agree, otherwise `UNRESOLVED`. |
| `PRIMARY_WITH_FALLBACK` | Take source 0's answer; fall down the ordered list if it has not resolved. |

## List events

```http
GET /v1/:chain/events
```

Every event registered on the chain's event aggregator, with per-source detail.

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/events
```

```json
{
  "chainId": 42161,
  "aggregator": "0x67ff83c40B0338518B0781466EA3cB092002BbB4",
  "resolver": "0xD79AA11e81c9d3013B30DD71d9cba8977a9518BF",
  "mode": "MAJORITY",
  "minHealthy": 1,
  "sourceCount": 2,
  "events": [
    {
      "eventId": "0x7f3a…",
      "question": "Will the Lakers beat the Celtics on 2026-03-05?",
      "registeredAt": 1785100000,
      "livenessSeconds": 3600,
      "aggregated": {
        "outcome": "YES",
        "outcomeCode": 1,
        "resolvedCount": 2,
        "totalEnabled": 2
      },
      "perSource": [
        {
          "sourceIndex": 0,
          "sourceName": "operator-signed",
          "outcome": "YES",
          "outcomeCode": 1,
          "resolved": true,
          "resolvedAt": 1785243000,
          "enabled": true,
          "adapter": "0x…"
        },
        {
          "sourceIndex": 1,
          "sourceName": "uma-optimistic",
          "outcome": "YES",
          "outcomeCode": 1,
          "resolved": true,
          "resolvedAt": 1785250000,
          "enabled": true,
          "adapter": "0x…"
        }
      ]
    }
  ],
  "cachedAt": "2026-07-28T12:50:53.011Z"
}
```

### Top-level fields

| Field | Meaning |
| --- | --- |
| `aggregator` | The `EventOracleAggregator` address. |
| `resolver` | The resolver contract that consumes its outcomes. |
| `mode` | Aggregation mode, as above. |
| `minHealthy` | Minimum resolved sources before an aggregate outcome is produced. |
| `sourceCount` | Configured event sources. |

### Event fields

| Field | Meaning |
| --- | --- |
| `eventId` | The event's on-chain identifier, a `bytes32`. |
| `question` | Human-readable question text, stored on-chain. |
| `registeredAt` | Unix seconds when the event was registered. |
| `livenessSeconds` | Dispute/liveness window for this event. |
| `aggregated.outcome` | The combined result across sources. |
| `aggregated.resolvedCount` | How many sources have answered. |
| `aggregated.totalEnabled` | How many could answer. |
| `aggregated.error` | Present if the aggregate read reverted. |

### Per-source fields

| Field | Meaning |
| --- | --- |
| `sourceName` | Which mechanism attested: `operator-signed` for the fast path, `uma-optimistic` for the bonded path. |
| `outcome` / `outcomeCode` | What this source says. |
| `resolved` | Whether it has answered at all. |
| `resolvedAt` | When it did. |
| `enabled` | Disabled sources are reported but not counted. |

The `perSource` array is where the two-path resolution design becomes visible. An operator-signed source resolving quickly while a UMA source is still inside its dispute window is the normal, expected state, and reading both tells you how much confidence the current answer deserves.

## Get one event

```http
GET /v1/:chain/events/:eventId
```

The same event object, fetched by ID.

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/events/0x7f3a…
```

Returns `404` if no event with that ID is registered.

## Errors

| Status | Meaning |
| --- | --- |
| `404` on `/events` | No event aggregator configured for this chain. |
| `404` on `/events/:eventId` | No such event. |
| `500` | RPC failure. |

An `aggregated.error` inside a `200` response means the aggregate read reverted while the per-source reads succeeded, usually `minHealthy` not yet met. The per-source data is still valid and useful.
