---
title: Prediction markets
description: markets.squidlor.com. Gasless Yes/No markets on where a price settles, priced by an AMM and resolved by the Squidlor oracle on Arc. Season 1 points.
---

[markets.squidlor.com](https://markets.squidlor.com) runs binary prediction markets on **Arc**, Circle's USDC-gas L1. A market is a question of the form "Will BTC be above $81,400 at 14:30 UTC?", with a Yes and a No outcome. Trading costs the user no gas, and the outcome is read from the Squidlor oracle rather than decided by anyone.

The market went live in September 2026 and runs on Arc.

## How a market works

**Collateral is sqUSD, and sqUSD is contest collateral, not dollars.** Every entrant is granted 1,000 sqUSD on activation and topped back up to a 250 floor every day at 00:00 UTC. It is a 6-decimal ERC-20 minted by the platform. Nothing on the site sells it or redeems it.

**Prices are probabilities.** Each market is a constant-product market maker (Gnosis FPMM style) over ERC-1155 outcome tokens. A Yes trading at 62¢ means the pool puts the outcome at about 62%, and each Yes share pays 1 sqUSD if the outcome happens. The probability is derived from the pool's reserves at read time; nothing stores it.

**Trading is gasless.** You sign an order in your wallet and a netting relay submits it on-chain, paying the gas. Market orders, selling a position, and resting limit orders all go through the relay. Winning positions are paid out by the same relay after settlement.

**Settlement is the oracle.** Every market names a feed, a strike and an expiry. After expiry, anyone can call `resolve()` on `SquidlorPriceResolver`, which reads the Squidlor adapter's latest round for that feed. Resolution requires a round published inside the 30 minutes before expiry; without one it reverts with `StalePrice` rather than settling on old data. `resolve()` is permissionless.

**Markets on tokenized stocks** (NVDA, TSLA, AAPL, GOOGL) are gated by the US session. The equity feeds are pushed only while the regular session is open, so an expiry overnight, on a weekend or on an exchange holiday could never resolve and would lock collateral. The create form refuses those expiries, using a curated exchange calendar that fails closed, and offers session-anchored choices such as today's close instead.

## What is open

The platform creates rounds on BTC, ETH, SOL and VIRTUAL: hourly ones, and a daily one that closes at 00:00 UTC, whenever its scheduler is switched on. It is not always on. Anyone signed in can create a market on any symbol the adapter publishes; creation previews the feed first and refuses a symbol whose feed has never published a round.

Every market has a short link on `squidlor.market` (the code is the first eight hex characters of its question id) with a rendered preview card, for sharing on X.

## Season 1 points

Squidlor Points (SP) is the scoreboard for a 14-day season, **2026-09-10 to 2026-09-23**. At the end of the season the top 1,000 wallets share **10,000,000 SQDLR**, 1% of the 1 billion supply, pro-rata by points with a 2% per-wallet clamp. The live rules are served by the API and are what the site reads:

```bash
curl https://api.squidlor.com/quest/points/rules
```

| Way to earn | Rule | Daily cap |
| --- | --- | --- |
| Trading | Scored when a position resolves: `round(8 × sqrt(stake in sqUSD) × conviction)`. A win's conviction is `min(1 / entry price, 5)`; a loss scores at 0.15. A position closed before resolution scores nothing. | 1,000 SP |
| Creating | 60 SP for every distinct trader who takes your market, up to 1,500 per market. | 2,000 SP |
| Referral | 10% override on what referred wallets earn, once they hold one resolved position. 250 SP welcome. | 2,000 SP |
| Streak | Flat 25 / 50 / 100 SP on days 3, 7 and 14. | 100 SP |
| Posting on X | 10 SP per post tagging @squidlorlabs with a market link, at most 3 a day. | 30 SP |

Streak and posting pay only on a day with trading or creating points, so a perfect 14-day bonus run is 970 SP, less than one capped trading day. There are no multipliers anywhere.

> [!NOTE]
> The ticker is SQDLR. Anything that mentions multipliers, a 2% pool, 20,000,000 tokens or the ticker SQUID describes an earlier revision. The rules endpoint above is authoritative, and the terms on markets.squidlor.com govern.

## Read it yourself

The site runs on the platform's `quest` service behind the gateway. The read endpoints need no key.

| Endpoint | Returns |
| --- | --- |
| `GET /quest/market/chain` | Indexed markets on the current chain: question, strike, expiry, pool, status. |
| `GET /quest/market/chain/:questionId` | One market. |
| `GET /quest/market/chain/resolve/:prefix` | Resolve a short-link code to a market. `409` if the prefix is ambiguous. |
| `GET /quest/points/rules` | The season and every scoring rule, as numbers. |
| `GET /quest/points/leaderboard` | The airdrop board: rank, points, share, clamp. |
| `GET /quest/points/stats` | Field size, slots filled, cutoff, total points. |
| `GET /quest/points/me/:address` | One wallet's standing. |

```bash
curl "https://api.squidlor.com/quest/market/chain?limit=5"
curl "https://api.squidlor.com/quest/points/leaderboard?limit=10"
```

`status: "pending"` does not mean tradeable. It means "not yet settled on chain", and a market can be past its expiry, closed to orders and still pending while the resolution watcher catches up. Trading is open when the status is pending **and** the expiry is in the future.

## Contracts

| Contract | Address (Arc Testnet) |
| --- | --- |
| `MarketFactory` | `0xb64a411dF119E1E2a8b18812fD1512b48CF29Bb2` |
| `ConditionalTokens` | `0x0bC4E8dCe77e25A8219EA7794281a2E355484fA5` |
| `FPMMFactory` | `0x870DdB6F14B5926C56DB74F52Ce06800A8795909` |
| `SquidlorPriceResolver` | `0xEcd3Da639CDbD837350ebd580F6dF388573E1418` |
| `AdminResolver` | `0xa3F54e9963185819Db7DC166181b9977c834b607` |
| `SquidlorUSD` (sqUSD) | `0xFaCe2ABF0C7CCDa15252F7020fAA24FC65c15540` |
| `SubsidyVault` | `0x3F898b06764686d49b602967fB00610d0A05E6E8` |
| Netting relay (proxy) | `0xE4CA129bCB8Dd050d7892b165615f54A1652bd75` |
| `SquidlorRegistry` | `0x3D03C75f76dd90505aA2061B95aDB9b74216Dd30` |

Mainnet addresses land on [deployed addresses](/networks/addresses), which is generated from the
deployment manifest rather than typed.

The resolver reads the same `SquidlorAdapterV2` listed on [Arc](/networks/arc). It does not read the cross-oracle aggregators: those serve the price board and the public API, and they are deliberately not wired to settlement.

## In Oracle Chat

The **TIDE** desk covers the market: what is open, the odds, your positions, your contest standing, and, when the relay is configured, placing and selling positions and creating markets from the conversation. See [Oracle Chat](/ai/oracle-chat).
