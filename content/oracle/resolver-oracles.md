---
title: Resolver oracles
description: Extending the oracle from "what is the price of X?" to "did event Y happen?" — the architecture, the sports pilot that already runs, and what is still to build.
---

A price oracle answers one question: what is X worth right now? Plenty of on-chain logic needs a different question answered — did a thing happen?

Resolver oracles are that expansion. They are on the roadmap, with one working pilot already deployed.

> [!NOTE]
> Sports resolution runs today via the `sports-pusher` service and an `EventOracleAggregator`, and the [events API](/api/events) reads its state. The other resolver types below are designed but not built.

## Planned resolver types

| Resolver type | Data source | Example question answered |
| --- | --- | --- |
| **Sports** | Verified sports data feeds — TheSportsDB today | "Will the Lakers beat the Celtics on March 5?" |
| **Election / political** | Curated public data with multi-source aggregation | "Will candidate X win district Y?" |
| **Weather / climate** | NOAA and government feeds | "Will Mumbai see more than 200mm of rain in July?" |
| **Custom event** | A configurable API endpoint plus decision logic | Long-tail outcomes with no dedicated feed |

## The architecture mirrors the price oracle

Deliberately so — the same three-layer shape, with outcomes in place of prices:

1. **Off-chain attestation.** A pusher service polls the data source, computes an outcome, and signs it.
2. **On-chain verification.** An `EventOracleAggregator` checks threshold consensus across its sources, exactly as the price aggregator medians across price sources.
3. **Resolution.** The verified outcome is readable on-chain by any consumer that needs to settle against it.

Outcomes are a small enumeration rather than a number: `UNRESOLVED`, `YES`, `NO`, `INVALID`. `INVALID` matters — it is how an ambiguous or void event resolves without forcing a wrong answer.

Aggregation modes parallel the price side: `MAJORITY`, `UNANIMOUS`, and `PRIMARY_WITH_FALLBACK`.

## The sports pilot

`sports-pusher` is the working proof of the design. It polls TheSportsDB, computes a YES/NO outcome, and submits it on-chain by one of two paths:

- **Fast path** — submits directly through `OperatorSignedEventSource`. No bond, resolution is immediate, and it trusts the operator.
- **Bonded path** — submits through UMA's Optimistic Oracle. Slower, because it carries a dispute window, but an incorrect outcome can be challenged economically.

Both land in an `EventOracleAggregator`, which is what the [events API](/api/events) reads.

That two-path design is the interesting part: it lets a consumer choose its own trade-off between resolution speed and dispute resistance, per event, rather than forcing one answer for the whole system.

## Why own this rather than rent it

A third-party oracle answers the questions in its catalogue. A self-owned resolver stack can answer any question whose outcome it can index.

That difference compounds. Once resolver oracles ship, what Squidlor can attest to is bounded by what data exists in the world, not by what a vendor has decided to support.

## Current limitations

- Only sports has a live pusher. Weather, elections, and custom resolvers are unbuilt.
- The fast path trusts a single operator signature, with the same caveat as the [price signer set](/resources/trust-model).
- The bonded path inherits UMA's dispute window — typically 24–48 hours — which rules it out for anything needing prompt settlement.

## Related reading

```cards
[
  {
    "title": "Events API",
    "description": "Read live event-outcome state, per source and aggregated.",
    "href": "/api/events",
    "icon": "code"
  },
  {
    "title": "Aggregation architecture",
    "description": "The three-layer shape resolver oracles reuse, explained on the price side.",
    "href": "/oracle/architecture",
    "icon": "layers"
  },
  {
    "title": "Roadmap",
    "description": "What is shipping next across the oracle and agent stack.",
    "href": "/resources/roadmap",
    "icon": "layers"
  }
]
```
