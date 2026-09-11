---
title: Stock-paired tokens
description: Launch a token on Base that trades against a tokenized US stock instead of ETH, from the GEYSER desk or squidlor.trade. Trade it on Uniswap v4.
---

A stock-paired token is a new ERC-20 whose whole supply goes into a Uniswap v4 pool as one-sided liquidity against a **tokenized US stock**, Coinbase's NVDAc, TSLAc, AAPLc and ten more, instead of against ETH. It is the pump.fun mechanic on Base with a stock as the money. Two surfaces run it:

- **[squidlor.trade](https://squidlor.trade)**, the native page: a board of launches, one page per token with chart, trades and a buy/sell panel, and a launch form at `/launch`.
- **The GEYSER desk** in [Oracle Chat](/ai/oracle-chat), for people who would rather talk it through.

Both went live on 2026-09-03. Both are front ends over the same routes on the Oracle Chat server.

## How a launch works

1. You pick a name, a symbol and a stock. The opening market cap (default $4,000) and supply (default 1,000,000,000) have defaults.
2. The server builds the create transaction against Doppler's Airlock on Base, simulates it, and hands it to your wallet unsigned. Nothing is live until you sign.
3. Your wallet signs. The browser posts the transaction hash back, the server parses the pool from the receipt, and the token page and Uniswap links appear.

The opening market cap is just the first token's price times the supply: nobody deposits anything to reach it. The first buyer brings the stock token and pushes the price up the ranges. There is no graduation step, because the pool is on Uniswap from the first block.

**The token is priced in the stock, not pegged to it.** If NVDAc rises 10% and nobody trades the token, its dollar price rises 10% while its NVDAc price stays put. A 1:1 wrapper is a different product.

**Fees.** Every trade pays a 1% pool fee that streams to recipients fixed at launch: Doppler 5%, the Squidlor treasury 20%, and the creator the rest, forever. Squidlor holds no supply. The creator pays gas and a small launch reservation, and nothing else.

| Setting | Value |
| --- | --- |
| Chain | Base (8453) |
| Pair assets | NVDA, TSLA, AAPL, GOOGL, AMZN, MSFT, META, COIN, CRCL, INTC, MSTR, SNDK, SPCX (Coinbase B20 tokens, 8 decimals) |
| Opening market cap | $4,000 default, $1,000 to $1,000,000 |
| Supply | 1,000,000,000 default |
| Name, symbol | up to 32 and 10 characters |
| Pool fee | 1%, split Doppler 5% / Squidlor 20% / creator 75% |

The live configuration is at `GET https://chat.squidlor.com/api/launchpad/config`.

## How a trade works

1. The page asks for a quote with your wallet, the token, the side and an amount.
2. The server reads the pool key from the Doppler initializer, builds Permit2 approvals and the Universal Router v4 swap, and quotes by running the **exact swap** through `eth_simulateV1` from your wallet. The v4 Quoter reverts on Doppler-hooked pools, so the quote is the real calldata: the wallet and the quote cannot disagree.
3. It returns one to three unsigned steps: approve Permit2, approve the router, swap. Approvals appear only when missing. You sign each in order.

**Buys are paid in the stock token**, NVDAc for an NVDA-paired token, never in ETH. If the wallet has none, the quote says so and links to where to get it. Sells are sized in tokens or "all".

Prices come from two places and the page says which: the pool's own `slot0` on-chain, which exists from the launch block so a token with zero trades still has a price, and GeckoTerminal's DEX index for candles, volume and recent trades, which appears after the first trade. Market cap is derived on-chain from total supply and pool price.

## The board

`GET /api/launchpad/board?scope=` lists tokens trading against a tokenized stock on Base:

| Scope | What it lists |
| --- | --- |
| `active` | Every stock-paired token on Base from any launchpad, ranked by 24h volume. |
| `new` | The newest launches found on-chain, traded or not. |
| `squidlor` | Only launches made through Squidlor. This is what squidlor.trade's board shows. |
| `mine` | What a wallet launched here. Pass `wallet=`. |

Symbols are not unique: five or six clones per ticker is normal. The board and the trade tool show the address, and a lookup by symbol prefers the token launched here, then the most 24h volume, then the deepest pool, and reports which rule chose.

## Endpoints

All on the Oracle Chat server, `https://chat.squidlor.com/api/launchpad`, and proxied same-origin on squidlor.trade. Reads need no key.

| Endpoint | Purpose |
| --- | --- |
| `GET /config` | Stocks, defaults, limits, fee split. |
| `GET /board?scope=&stock=&limit=` | The board. |
| `GET /launches?stock=&creator=` | Raw launch records made through Squidlor. |
| `GET /token/:symbolOrAddress` | One token: record, stock price, on-chain spot, DEX stats, links. |
| `GET /token/:key/candles?interval=` | OHLCV for the token's pool. |
| `GET /token/:key/trades` | Recent trades. |
| `GET /token/:key/holders` | Holder table from transfer logs. |
| `GET /creator/:wallet` | A creator's launches and claimable fees. |
| `POST /quote` | `{ wallet, token, side, amount, unit }` → unsigned steps. |
| `POST /prepare`, `POST /confirm` | The launch flow. Used by the two front ends. |

## Contracts on Base

| Contract | Address |
| --- | --- |
| Doppler Airlock | `0x660eAaEdEBc968f8f3694354FA8EC0b4c5Ba8D12` |
| Doppler hook initializer | `0xBDF938149ac6a781F94FAa0ed45E6A0e984c6544` |
| Uniswap Universal Router | `0x6ff5693b99212da76ad316178a184ab56d299b43` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Uniswap v4 PoolManager | `0x498581ff718922c3f8e6a244956af099b2652b2b` |
| Uniswap v4 StateView | `0xa3c0c9b65bad0b08107aa264b0f3db444b867a71` |
| NVDAc | `0xb20000000000000000000078ee7ce2fE4908108C` |

The `0xb200…` prefix on the Coinbase stock tokens does not, on its own, mean Coinbase: B20 is a permissionless token standard on Base and community tokens use it too. The launchpad allows only the thirteen stocks above as pair assets.

## Predictions on the paired stock

Every token page carries a card to open a [prediction market](/products/markets) on the paired stock, because that is the asset the oracle prices. A market on the launched token itself is not possible: Squidlor operates no feed for it.

> [!WARNING]
> Launches, approvals and swaps are verified by simulation against live Base state on every request, and launches made through Squidlor have settled on-chain. Trading volume through the page is still small. Treat a thin pool as a thin pool: the quote's minimum output is what the router guarantees, and a 1% fee is paid on every trade in both directions.
