---
title: Prediction markets
description: markets.squidlor.com. Gasless Yes/No markets on where a price settles, priced by an AMM and resolved by the Squidlor oracle on Base. Season 1 points.
---

[markets.squidlor.com](https://markets.squidlor.com) runs binary prediction markets on **Base (8453)**. A market is a question of the form "Will BTC be above $81,400 at 14:30 UTC?", with a Yes and a No outcome. Trading costs the user no gas, and the outcome is read from the Squidlor oracle rather than decided by anyone.

The market has been live on Base with trading since 2026-09-01.

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

## Contracts on Base

| Contract | Address |
| --- | --- |
| `MarketFactory` | `0x12AeA54771C43CB6A0d393B930c642F28389210B` |
| `ConditionalTokens` | `0xAa5b50D3eB93FcDFb48E26bAa4F9315E878e422d` |
| `FPMMFactory` | `0x9a4e4d5f83e3ad9568Ee2919cc0A4Ba7a4c0F735` |
| `SquidlorPriceResolver` | `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` |
| `AdminResolver` | `0x7DADEEC6665D330b35e38C18bdF270ABd34d92be` |
| `SquidlorUSD` (sqUSD) | `0x05292d70254f9309D731B5Ba93AE7a53710d469B` |
| `SubsidyVault` | `0x9764A728Aa5524C0845e0a945843760654a1553D` |
| Netting relay (proxy) | `0xa3F54e9963185819Db7DC166181b9977c834b607` |
| `SquidlorRegistry` | `0x3F898b06764686d49b602967fB00610d0A05E6E8` |

The resolver reads the same `SquidlorAdapterV2` listed on [Base](/networks/base). It does not read the cross-oracle aggregators: those serve the price board and the public API, and they are deliberately not wired to settlement.

## In Oracle Chat

The **TIDE** desk covers the market: what is open, the odds, your positions, your contest standing, and, when the relay is configured, placing and selling positions and creating markets from the conversation. See [Oracle Chat](/ai/oracle-chat).
