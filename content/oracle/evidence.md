---
title: Measured performance
description: What the Base deployment has actually done since 30 August 2026, read from the public audit trail, including the rounds where it refused to answer. Reproduce every number with the calls on this page.
---

Everything on this page comes from the public read API against the Base (8453) deployment. Nothing is quoted from a design document. Every table names the call that produced it, so you can rerun it and get today's numbers instead of ours.

Window: **2026-08-30 (Base go-live) to 2026-09-11**, 12,757 sampled rounds per pair, one sample roughly every 80 seconds.

## Freshness and agreement between legs

Every Base pair is a two-leg median: Chainlink and Squidlor. The provider scorecard replays every recorded round and reports, per leg, how often it was fresh inside its staleness window and how far it sat from the round median.

```bash
curl "https://api.squidlor.com/aggregator/v1/base/providers?pair=BTC_USD"
```

| Pair | Leg | Fresh rate | Deviation from round median, median / p95 / max |
| --- | --- | --- | --- |
| BTC/USD | Chainlink | 100.0% | 2 / 6 / 44 bps |
| BTC/USD | Squidlor | 98.4% | 2 / 6 / 44 bps |
| ETH/USD | Chainlink | 99.99% | 2 / 8 / 63 bps |
| ETH/USD | Squidlor | 98.4% | 2 / 8 / 63 bps |
| SOL/USD | Chainlink | 100.0% | p95 19 bps |
| SOL/USD | Squidlor | 98.4% | p95 19 bps |
| VIRTUAL/USD | Chainlink | 97.8% | 7 / 20 / 92 bps |
| VIRTUAL/USD | Squidlor | 98.4% | 7 / 20 / 92 bps |

Read the deviation column carefully. With two legs the median is their midpoint, so both legs show the same distance from it: the number measures how much Chainlink and Squidlor disagreed, not which one was right. A median disagreement of 2 bps on BTC and ETH means the independent Squidlor path, which reads six exchanges directly, and Chainlink's node network land on the same price to within $15 on a $77,000 asset almost all the time. The worst BTC disagreement in the window was 44 bps, at 14:50 UTC on 3 September, during a fast move.

Equity pairs are deliberately absent from the table. Squidlor's equity leg publishes only during the US regular session (09:30 to 16:00 ET) and carries a 7,200 second staleness window, so its fresh rate over a 24-hour clock is about 22% by construction. Chainlink's equity legs run a 24-hour heartbeat and score about 75%. Neither number is an outage; both say "do not price equities outside market hours", and the [prediction market resolver](/products/markets) enforces exactly that. See [price feeds](/oracle/feeds) for the equity rules.

## When the oracle refused to answer

A Squidlor aggregator with `minHealthySources = 2` reverts rather than returning a price when either leg is stale. The API surfaces those rounds as `peekError` and flags them.

```bash
curl "https://api.squidlor.com/aggregator/v1/base/feeds/BTC_USD/audit?flagged=true&limit=1000"
```

| Pair | Rounds sampled | Rounds refused | Share | Episodes |
| --- | --- | --- | --- | --- |
| BTC/USD | 12,757 | 209 | 1.64% | 2 Sep (22 rounds), 3 Sep (174), 9 Sep (13) |
| ETH/USD | 12,757 | 208 | 1.63% | same three episodes |

All 209 refusals had the same cause: the Squidlor leg went stale, which means the relay stopped landing transactions. In every one of them the Chainlink leg was fresh, so a `minHealthySources = 1` configuration would have served Chainlink's price alone. We chose 2 for the majors on purpose: a single-source answer from an aggregator that advertises two sources is a lie of omission, and a consumer that bounds staleness will halt cleanly on the revert.

What those three episodes were:

- **2 September, 22 rounds.** Deployment day. The relay's staleness window was tightened from 25,200 seconds to 600 while the crypto relay was being moved to its dedicated signer key.
- **3 September, 174 rounds (about 4 hours).** A public Base RPC endpoint began throttling the relay's simulation call on roughly 60% of attempts, so pushes failed silently while the process reported healthy. The fix, shipped the same day, is an ordered RPC pool with per-endpoint cooldowns and the `--slow` broadcast path; the incident is written up on [trust model](/resources/trust-model#4-relayer-liveness) and the pool on [roadmap](/resources/roadmap).
- **9 September, 13 rounds (about 17 minutes).** A relay restart during a deploy. Recovered without intervention.

Total time the BTC/USD aggregator refused to answer since go-live: about 4.7 hours out of 12 days. Total time it returned a stale or single-source price as if it were a two-source median: zero.

## Cost per update

Read from the transactions the crypto relay lands on Base, four feeds per transaction:

| Chain | Feeds per tx | Gas per tx | Trigger |
| --- | --- | --- | --- |
| Base (8453) | 4 | about 289,000 | 0.5% deviation or 300 s heartbeat |
| Robinhood Chain (4663) | 5 | 351,000 steady state, 522,000 first push | 0.5% deviation or 3,600 s heartbeat |

The marginal feed costs about 35,000 gas, against roughly 150,000 fixed per transaction, which is why every feed past half its heartbeat rides along whenever any feed fires. Adding a pair does not add a transaction.

## How this compares to the incumbents' cadence

Measured on 11 September 2026 by walking rounds backwards from `latestRoundData` on each chain's public RPC, and read from Chainlink's own reference data:

| Feed | Trigger | Updates in 24 h | Average gap |
| --- | --- | --- | --- |
| Chainlink ETH/USD, Ethereum | 0.5% or 1 h | 30 | 48 min |
| Chainlink ETH/USD, Base | 0.15% or 20 min | 153 | 9.4 min |
| Chainlink ETH/USD, Arbitrum | 0.05% or about 29 min | 615 | 2.3 min |
| Squidlor ETH/USD, Base | 0.5% or 5 min | 288 minimum | 5 min or less |

Chainlink tunes tightest on the cheapest chains. Squidlor's cadence is an operator setting, changeable live, and the same on every chain it runs on.

## Reproduce it

Every number above is one of these calls, with no key required at 30 requests a minute:

- `GET /v1/base/providers` and `?pair=` for the scorecards, `?from=` and `?to=` for any window.
- `GET /v1/base/feeds/:pair/audit?flagged=true` for every refused or divergent round with per-leg prices and timestamps.
- `GET /v1/base/feeds/:pair/at?timestamp=` for the recorded observation nearest any moment, and `/at/proof` for the same observation with a Merkle proof against a root committed on-chain once its period closes.
- `GET /v1/base/feeds/:pair/history?interval=1d` for the daily series.

If you run these and get numbers that disagree with this page, the API is right and the page is stale. Tell us.
