---
title: Base
description: Chain facts for Base (8453), what Squidlor runs there, and why it became the home of the prediction market and the stock-paired launchpad.
---

Base is Squidlor's most active deployment as of September 2026. The oracle went live there on 2026-08-30, the [prediction market](/products/markets) followed the next day, tokenized-stock feeds and aggregators on 2026-09-02, and the [stock-paired launchpad](/products/trade) on 2026-09-03.

## Chain facts

| Fact | Value |
| --- | --- |
| Chain ID | **8453** (`0x2105`) |
| Public RPC | `https://mainnet.base.org` |
| Explorer | `https://basescan.org` |
| Gas token | ETH |
| Stack | OP Stack L2 |
| API slug | `base` |

```bash
curl https://api.squidlor.com/aggregator/v1/base/feeds
```

## What is live

### Oracle

One `SquidlorAdapterV2` with eight `SquidPriceFeed` proxies: BTC, ETH, SOL, VIRTUAL, NVDA, TSLA, AAPL and GOOGL. Eight `SquidlorOracleAggregator` instances, all 8-decimal `MEDIAN`, every one wired to **two sources**, Chainlink and Squidlor:

| Pair | `minHealthySources` | Chainlink leg staleness | Squidlor leg staleness |
| --- | --- | --- | --- |
| BTC/USD, ETH/USD, SOL/USD | 2 | 3,600s | 600s |
| VIRTUAL/USD | 1 | 7,200s | 600s |
| NVDA/USD, TSLA/USD, AAPL/USD, GOOGL/USD | 1 | 86,400s | 7,200s |

VIRTUAL/USD runs at `minHealthySources = 1` on purpose. Its Chainlink feed publishes on a 0.5% deviation or 24-hour heartbeat and was measured going 91 minutes between rounds, so requiring both legs would take the pair dark during normal quiet.

The four equity aggregators are the first place Squidlor's equity feed is combined with Chainlink on-chain. NVDA/USD's first aggregated round was the exact average of its two legs, which is what a two-source median looks like. The Chainlink legs are the Coinbase B20 total-return feeds ("Coinbase NVDA" and so on).

`AggregatorRegistry` on Base registers all eight pairs. Every address is on [deployed addresses](/networks/addresses#base-8453).

### Relay

Two relay processes, on separate signer keys so that one nonce sequence never blocks the other:

| Process | Feeds | Trigger |
| --- | --- | --- |
| Crypto relay | BTC, ETH, SOL, VIRTUAL | 50 bps deviation or a 300-second heartbeat. Roughly two transactions per five minutes at about 289k gas for four feeds. |
| Equity relay | NVDA, TSLA, AAPL, GOOGL | During the US regular session, 09:30 to 16:00 ET, medianing Yahoo Finance, Nasdaq, Finnhub and Twelve Data. Holidays follow a curated exchange calendar that fails closed. |

Extended-hours pushes (pre-market and after-hours) are built and switched off. Three of the four equity sources freeze outside the regular session, so publishing then would median stale closes into a fake consensus. Sources now carry their own timestamps and a push refuses to go out without two fresh ones.

`SquidlorAdapterV2` on Base runs `requiredSigners = 1` with more than one authorised signer: the owner, and one key per relay process.

### Prediction market and launchpad

The market contracts, the netting relay and sqUSD are on [prediction markets](/products/markets). The launchpad uses Doppler's Airlock and Uniswap v4; its addresses are on [stock-paired tokens](/products/trade).

## Reading Base from the box you run

Base public RPCs behave differently from one another, and the differences decide whether a service works:

- `mainnet.base.org` serves `eth_getLogs` only on capped block ranges (about 2,000 blocks works) and rate-limits large batched `eth_call` payloads from a busy IP.
- `base-rpc.publicnode.com` answers large multicalls well but refuses transaction receipts and `eth_getLogs` without a paid token.
- Only `mainnet.base.org` and `base-rpc.publicnode.com` answer `eth_simulateV1`, which the launchpad's quotes depend on.

Squidlor's own services split their traffic accordingly. If you self-host anything on Base, measure from the machine that will run it: the same endpoint answers a laptop and a datacenter IP differently.

## Why Base

Base's "Request for Builders: Tokenized Stocks" (September 2026) named conditional markets on tokenized stocks as unbuilt, and Base is where Coinbase's tokenized stocks trade. A market on NVDA that settles against an oracle reading both Chainlink and an independent second source, next to a launchpad where NVDAc is the money, is the product that request describes. It also costs a fraction of a cent per push.
