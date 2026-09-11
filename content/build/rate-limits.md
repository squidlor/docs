---
title: Rate limits & plans
description: The actual numbers per tier, what happens when you hit the ceiling, and how the history lookback cap behaves.
---

## The numbers

| | Anonymous | Free key | Pro | Institutional |
|---|---|---|---|---|
| Requests/minute | 30 | 300 | 3,000 | unlimited |
| Counted per | IP address | key | key | key |
| History & OHLC lookback | 30 days | 30 days | unlimited | unlimited |
| Price | - | $0 | $99/mo | custom |
| Support | community | community | email | dedicated + SLA |

Everything else is identical across tiers: same feeds, same chains, same freshness, same endpoints. We do not hold back data behind a paywall; the difference is throughput and history depth.

[Get a free key](https://build.squidlor.com) · Institutional: <build@squidlor.com>

## Hitting the limit

You get a `429` with a body that names the ceiling and a `Retry-After` header:

```json
{
  "code": "RATE_LIMITED",
  "message": "Anonymous requests are limited to 30/min. A free API key raises this to 300/min: https://build.squidlor.com.",
  "retryAfterSec": 24,
  "tier": "anon"
}
```

Windows are fixed one-minute buckets, so `retryAfterSec` is how long until the counter resets, not a backoff hint. Waiting that long is sufficient; retrying sooner is not.

### Staying under it

The live aggregate only changes when a pusher lands an update, so polling faster than the feed updates burns quota for identical bytes. Three things that help more than a higher tier:

- **Cache for 10 seconds.** That is the server-side cache TTL; inside that window you are guaranteed the same answer.
- **Use `/value` for prices.** It returns just the number, and is the cheapest call on the API.
- **Read on-chain for contract logic.** An `eth_call` against the aggregator does not touch our API at all and has no rate limit.

## History lookback cap

On the anonymous and free tiers, `/history`, `/ohlc` and `/audit` are limited to the last 30 days.

Requests that reach further back are **clamped, not rejected**. You get a `200` with the last 30 days of data and two headers saying what happened:

```
X-History-Clamped: true
X-History-Lookback-Days: 30
```

A chart that quietly shows 30 days is a better free-tier experience than an error page, but silently truncating data would be worse than either, hence the headers. Check `X-History-Clamped` if the window matters to your correctness.

`/audit` is capped alongside the other two because an audit record carries its round's median; leaving it open would be a way to reconstruct exactly the history the cap bounds.

Pro and Institutional are uncapped, bounded only by retention (90 days of samples by default).

## Upgrading

Upgrade a project to Pro from the [portal](https://build.squidlor.com). The new limit applies to every active key on that project without you redeploying anything; tier lives on the project, and the API picks up the change within 60 seconds.

Rotating a key preserves its tier, so upgrading and then rotating will not drop you back to free.

## Degraded modes

We would rather serve you a price than an error:

- **Our rate-limit store is down**: limiting is skipped entirely and requests are served. You will not see a 429 that we cannot justify.
- **Our key lookup is degraded**: a valid key is served at anonymous limits with `X-Squidlor-Key-Unverified: true` rather than being rejected.
- **Our database is down**: live price reads keep working; only `/history`, `/ohlc` and `/audit` return `503`.

You can check the metering path yourself at [`/health/metering`](https://api.squidlor.com/aggregator/health/metering).
