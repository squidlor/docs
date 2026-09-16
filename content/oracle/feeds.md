---
title: Price feeds & assets
description: Every pair Squidlor serves, which sources back each one, how often it updates, and what to expect outside market hours.
---

Squidlor serves two asset classes with materially different update behaviour. Knowing which one you are reading matters. Every pair below is on [Arc](/networks/arc).

## Crypto pairs

Continuous markets, continuous updates.

| Pair | Off-chain sources medianed | On-chain sources, Arc |
| --- | --- | --- |
| BTC/USD | Coinbase, Binance, Bybit, Gate.io, Kraken, OKX (6) | Squidlor |
| ETH/USD | Coinbase, Binance, Bybit, Gate.io, Kraken, OKX (6) | Squidlor |
| SOL/USD | Coinbase, Binance, Bybit, Gate.io, Kraken, OKX (6) | Squidlor |

No oracle network has published Arc feed addresses yet, so every aggregator on Arc has one on-chain source, Squidlor's own feed, at `minHealthySources = 1`. Layer 3 of the [aggregation architecture](/oracle/architecture) therefore provides no cross-oracle protection on Arc today; Layers 1 and 2 still apply, and the off-chain median across six exchanges is where a bad venue print gets absorbed. When Chainlink or RedStone publish on Arc, a second leg is one `addSource` call on the live aggregator.

## Tokenized equity pairs

Squidlor's equity feed updates during the US regular session, 09:30 to 16:00 ET on weekdays. It does not update outside those hours, and that is correct behaviour, not staleness. The stock itself trades nearly 24/5 (pre-market, after-hours and an overnight ATS); what stops at 16:00 is our feed.

| Pair | Off-chain sources | On-chain sources, Arc |
| --- | --- | --- |
| NVDA/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Squidlor |
| TSLA/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Squidlor |
| AAPL/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Squidlor |
| GOOGL/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Squidlor |

On Arc the equity aggregators have the Squidlor leg only, with a 7,200-second staleness window on that leg. During the session the leg is fresh and the aggregator serves it. Overnight and at weekends the leg ages out, `peek()` reverts with `InsufficientHealthySources`, and `latestRoundData()` returns the last session's close with its original `updatedAt`; read that timestamp. There is no Chainlink stock feed on Arc yet to carry the price across the gap. `/constituents` on the API shows the four quotes behind Squidlor's leg and what it would publish right now.

> [!WARNING]
> Three of the four equity sources freeze outside the regular session, which is why extended-hours pushes are built but switched off: medianing frozen closes would publish a fake consensus. On the previous deployment the equity aggregators combined this leg with a Chainlink stock feed on-chain; on Arc that second leg arrives when a stock oracle publishes there.

## Update cadence

| Asset class | Relay trigger | Notes |
| --- | --- | --- |
| Crypto | 50 bps deviation or a 300-second heartbeat | Every due feed in one transaction, about 350k gas, about 0.007 USDC on Arc. Cadence is a tunable operational knob, not a protocol constant; the Squidlor leg's on-chain staleness (600s) must stay above the heartbeat or the pair goes dark between pushes. |
| Equities | Deviation or heartbeat, during the US regular session only | No pushes overnight, at weekends, or on exchange holidays. The holiday calendar is curated and fails closed. |

One transaction carries every feed that is due, and a feed past half its heartbeat rides along in a transaction another feed has already paid for. That batching is what keeps a wide asset list affordable.

## Handling market hours in your integration

For equities, a naive staleness check will fire every weekend. Two workable approaches:

**Widen the window for equities.** Allow 24–72 hours for equity feeds and keep a tight window for crypto. Simple, and covers a weekend on a feed that only publishes during the session.

```solidity
uint256 constant CRYPTO_MAX_AGE = 1 hours;
uint256 constant EQUITY_MAX_AGE = 72 hours; // covers a long weekend
```

**Check whether the market is open first.** More precise, but you now need a market calendar, which is its own dependency. Only worth it if a stale weekend price would actually cause harm in your protocol. Squidlor's own [prediction market](/products/markets) does this: it refuses to create a stock market whose expiry falls outside the regular session, because a market that can never resolve locks collateral.

> [!NOTE]
> If a stale equity price *would* cause harm, the honest answer is that a 24h-heartbeat feed is not a good enough input for that use case, regardless of oracle vendor. Design the position lifecycle around market hours instead.

## Adding a pair

Adding an asset is deliberately small:

1. Deploy one `SquidPriceFeed` proxy pointed at the existing `SquidlorAdapterV2`.
2. Deploy a `SquidlorOracleAggregator` for the pair.
3. `addSource` for each source: a `SquidSource` over the new proxy, a `ChainlinkSource` if the chain has a feed.
4. Register the pair in `AggregatorRegistry`.
5. Add the pair to the relay's configuration and the API's aggregator map.

No storage migration, no adapter redeploy, no consumer changes. Storage slots are derived from the feed ID rather than contract layout; see [SquidlorAdapterV2](/contracts/adapter).

## Available but not yet deployed

The relay already medians BNB/USD, XRP/USD and VIRTUAL/USD off-chain and the [realtime stream](/api/realtime) publishes them, but no feed proxy or aggregator exists for them on Arc. Adding any of them, or another equity symbol the four market-data APIs quote, is the five-step procedure above plus a symbol in the relay's configuration.

Chainlink, Pyth, RedStone, Chronicle and Stork list Arc as a partner chain, but none has published Arc push-feed addresses as of 2026-09-15. Pyth and Stork are pull oracles, so wiring them as sources would mean running the pusher ourselves; they are deliberately left out rather than wired speculatively. A local DEX TWAP is deferred until Arc has a liquid BTC or ETH pool to read.
