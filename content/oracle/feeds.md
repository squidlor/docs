---
title: Price feeds & assets
description: Every pair Squidlor serves, which sources back each one, how often it updates, and what to expect outside market hours.
---

Squidlor serves two asset classes with materially different update behaviour. Knowing which one you are reading matters. So does the chain: the same pair has different sources and different push timing on [Base](/networks/base) and on [Robinhood Chain](/networks/robinhood-chain).

## Crypto pairs

Continuous markets, continuous updates.

| Pair | Off-chain sources medianed | On-chain sources, Base | On-chain sources, Robinhood |
| --- | --- | --- | --- |
| BTC/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Chainlink + Squidlor | Chainlink + Squidlor |
| ETH/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Chainlink + Squidlor | Chainlink + Squidlor |
| SOL/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Chainlink + Squidlor | Squidlor only |
| VIRTUAL/USD | Streamed venues via the realtime median | Chainlink + Squidlor | not deployed |
| BNB/USD | Binance, Gate.io, Bybit (3) | not deployed | Squidlor feed deployed, no aggregator |
| XRP/USD | Binance, Coinbase, Gate.io, Bybit (4) | not deployed | Squidlor feed deployed, no aggregator |

On Robinhood Chain, SOL/USD has no Chainlink component because the chain carries no Chainlink SOL feed. It runs on Squidlor's own source alone, so for SOL there Layer 3 provides no cross-oracle protection. Layers 1 and 2 still apply. On Base, SOL has both legs.

## Tokenized equity pairs

Squidlor's equity feed updates during the US regular session, 09:30 to 16:00 ET on weekdays. It does not update outside those hours, and that is correct behaviour, not staleness. The stock itself trades nearly 24/5 (pre-market, after-hours and an overnight ATS); what stops at 16:00 is our feed.

| Pair | Off-chain sources | On-chain sources, Base | On-chain sources, Robinhood |
| --- | --- | --- | --- |
| NVDA/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Chainlink (Coinbase B20) + Squidlor | Chainlink + Squidlor |
| TSLA/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Chainlink (Coinbase B20) + Squidlor | Chainlink + Squidlor |
| AAPL/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Chainlink (Coinbase B20) + Squidlor | Chainlink + Squidlor |
| GOOGL/USD | Yahoo Finance, Nasdaq, Finnhub, Twelve Data (4) | Chainlink (Coinbase B20) + Squidlor | Chainlink + Squidlor |

On Base the equity aggregators combine both legs at `minHealthySources = 1`, with the Chainlink leg allowed 24 hours of staleness and the Squidlor leg 2 hours. During the session both are fresh and the median is the average of the two; overnight the Squidlor leg ages out and Chainlink carries the price. `/constituents` on the API shows the four quotes behind Squidlor's leg and what it would publish right now.

> [!WARNING]
> Squidlor's relay on Robinhood Chain is paused as of September 2026, so the Robinhood equity aggregators read Chainlink alone for now even though both sources are wired. Base is where the two-source guarantee holds today. Three of the four equity sources also freeze outside the regular session, which is why extended-hours pushes are built but switched off: medianing frozen closes would publish a fake consensus.

Chainlink's equity feeds carry a 24-hour heartbeat on both chains, which is what holds the price overnight and over weekends. On Base they are Coinbase's B20 total-return feeds.

## Update cadence

| Asset class | Relay trigger | Notes |
| --- | --- | --- |
| Crypto, Base | 50 bps deviation or a 300-second heartbeat | Four feeds per transaction, about 289k gas. Cadence is a tunable operational knob, not a protocol constant; the Squidlor leg's on-chain staleness (600s) must stay above the heartbeat or the pair goes dark between pushes. |
| Crypto, Robinhood | 0.5% deviation or a 1-hour heartbeat, when running | Paused as of September 2026. |
| Equities | Deviation or heartbeat, during the US regular session only | No pushes overnight, at weekends, or on exchange holidays. The holiday calendar is curated and fails closed. Chainlink's 24h heartbeat covers the gap. |

The first relay push on Robinhood Chain landed five feeds in one transaction at roughly 522k gas, about $0.05. That single-transaction batching is what keeps a wide asset list affordable.

## Handling market hours in your integration

For equities, a naive staleness check will fire every weekend. Two workable approaches:

**Widen the window for equities.** Allow 24–72 hours for equity feeds and keep a tight window for crypto. Simple, and matches the Chainlink heartbeat that backs the feed.

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

On Base, Coinbase publishes B20 feeds for many more stocks than the four Squidlor aggregates; the [launchpad](/products/trade) already accepts thirteen of them as pair assets. Adding an equity pair on Base is the five-step procedure above plus a symbol in the equity relay's configuration.

Chainlink's reference set on chain 4663 carries 55 feeds. Pairs available to wire but not yet deployed against include USDG/USD, USDC/USD, USDT, LINK, MSFT, META, AMD, AMZN, SPY, and QQQ.

Pyth, DIA, and RedStone are unverified as live on chain 4663 and were deliberately left out rather than wired speculatively. Uniswap TWAP is deferred: on this chain, tokenized stock trading is 0x RFQ rather than a Uniswap pool, so pool liquidity is not a usable price source.
