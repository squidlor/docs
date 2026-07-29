---
title: Price feeds & assets
description: Every pair Squidlor serves, which sources back each one, how often it updates, and what to expect outside market hours.
---

Squidlor serves two asset classes with materially different update behaviour. Knowing which one you are reading matters.

## Crypto pairs

Continuous markets, continuous updates.

| Pair | Off-chain sources medianed | On-chain sources |
| --- | --- | --- |
| BTC/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Chainlink + Squidlor |
| ETH/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Chainlink + Squidlor |
| SOL/USD | Arbitrum hub, Binance, Coinbase, Gate.io, Bybit (5) | Squidlor only |
| BNB/USD | Binance, Gate.io, Bybit (3) | Squidlor feed deployed |
| XRP/USD | Binance, Coinbase, Gate.io, Bybit (4) | Squidlor feed deployed |

SOL/USD has no Chainlink component because Robinhood Chain carries no Chainlink SOL feed. It runs on Squidlor's own source alone — which means for SOL, Layer 3 provides no cross-oracle protection. Layers 1 and 2 still apply.

## Tokenized equity pairs

US equities trade 09:30–16:00 ET on weekdays. The price does not update outside those hours, and that is correct behaviour, not staleness.

| Pair | Off-chain sources | On-chain sources |
| --- | --- | --- |
| NVDA/USD | Yahoo Finance, Nasdaq (optionally Finnhub, Twelve Data) | Chainlink only |
| TSLA/USD | Yahoo Finance, Nasdaq (optionally Finnhub, Twelve Data) | Chainlink only |
| AAPL/USD | Yahoo Finance, Nasdaq (optionally Finnhub, Twelve Data) | Chainlink only |
| GOOGL/USD | Yahoo Finance, Nasdaq (optionally Finnhub, Twelve Data) | Chainlink only |

> [!WARNING]
> Standalone Squidlor equity feeds are deployed on-chain, but they are **not yet wired as a second source** on the four equity aggregators. Those aggregators currently read Chainlink alone. If your protocol needs genuine multi-source pricing for equities, that guarantee does not hold today — see the [roadmap](/resources/roadmap).

Chainlink's equity feeds on chain 4663 carry a 24-hour heartbeat, which is what holds the price overnight and over weekends.

## Update cadence

| Asset class | Relay cadence | Notes |
| --- | --- | --- |
| Crypto | Hourly pushes, with a 3-second minimum interval available | The relay pushes as often as it is willing to pay gas for; cadence is a tunable operational knob, not a protocol constant. |
| Equities | Hourly during US market hours | No pushes overnight, weekends, or market holidays. Chainlink's 24h heartbeat covers the gap. |

The first relay push on Robinhood Chain landed five feeds in one transaction at roughly 522k gas — about $0.05. That single-transaction batching is what keeps a wide asset list affordable.

## Handling market hours in your integration

For equities, a naive staleness check will fire every weekend. Two workable approaches:

**Widen the window for equities.** Allow 24–72 hours for equity feeds and keep a tight window for crypto. Simple, and matches the Chainlink heartbeat that backs the feed.

```solidity
uint256 constant CRYPTO_MAX_AGE = 1 hours;
uint256 constant EQUITY_MAX_AGE = 72 hours; // covers a long weekend
```

**Check whether the market is open first.** More precise, but you now need a market-calendar oracle, which is its own dependency. Only worth it if a stale weekend price would actually cause harm in your protocol.

> [!NOTE]
> If a stale equity price *would* cause harm, the honest answer is that a 24h-heartbeat feed is not a good enough input for that use case — regardless of oracle vendor. Design the position lifecycle around market hours instead.

## Adding a pair

Adding an asset is deliberately small:

1. Deploy one `SquidPriceFeed` proxy pointed at the existing `SquidlorAdapterV2`.
2. Deploy a `SquidlorOracleAggregator` for the pair.
3. `addSource` for each source — a `SquidSource` over the new proxy, a `ChainlinkSource` if the chain has a feed.
4. Register the pair in `AggregatorRegistry`.
5. Add the pair to the relay's configuration and the API's aggregator map.

No storage migration, no adapter redeploy, no consumer changes. Storage slots are derived from the feed ID rather than contract layout — see [SquidlorAdapterV2](/contracts/adapter).

## Available but not yet deployed

Chainlink's reference set on chain 4663 carries 55 feeds. Pairs available to wire but not yet deployed against include USDG/USD, USDC/USD, USDT, LINK, MSFT, META, AMD, AMZN, SPY, and QQQ.

Pyth, DIA, and RedStone are unverified as live on chain 4663 and were deliberately left out rather than wired speculatively. Uniswap TWAP is deferred: on this chain, tokenized stock trading is 0x RFQ rather than a Uniswap pool, so pool liquidity is not a usable price source.
