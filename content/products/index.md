---
title: Products
description: Everything that runs on the Squidlor oracle today, where each one lives, and the hub that signs you into all of them at once.
---

Squidlor started as a price oracle. The products on this page are what got built on top of it during 2026, and each one is a separate site with its own job. [The hub](/products/hub) at [app.squidlor.com](https://app.squidlor.com) is the front door to all of them.

| Product | Where | What it does | Chain |
| --- | --- | --- | --- |
| **Hub** | [app.squidlor.com](https://app.squidlor.com) | One wallet sign-in, six chapters, every product one click away. | Base |
| **Oracle Chat** | [chat.squidlor.com](https://chat.squidlor.com) | Seven desks and a router over live feeds, wallets, agent tokens, markets and launches. | Base for markets, launches and wallets; feed tools follow the [tool chain list](/ai#shared-tool-surface) |
| **Prediction markets** | [markets.squidlor.com](https://markets.squidlor.com) | Gasless Yes/No markets on where a price settles, resolved by the oracle. Season 1 points. | Base |
| **Stock-paired tokens** | [squidlor.trade](https://squidlor.trade) | Launch and trade tokens priced in tokenized US stocks instead of ETH. | Base |
| **Builder portal** | [build.squidlor.com](https://build.squidlor.com) | API keys, projects, usage, showcase, builder rewards. | all |
| **Clippers** | [squidlor.com/clippers](https://squidlor.com/clippers) | Clip contests: submit a video, get reviewed, get paid. | none |
| **X agent** | [@Squidlor_Agent](https://x.com/Squidlor_Agent) | Replies to mentions with live oracle prices and Virtuals agent-token data. | none |

```cards
[
  {
    "title": "Hub",
    "description": "app.squidlor.com. Connect once, sign one message, open everything signed in.",
    "href": "/products/hub",
    "icon": "blocks"
  },
  {
    "title": "Prediction markets",
    "description": "How a market is created, traded without gas, and settled by the oracle. Season 1 points.",
    "href": "/products/markets",
    "icon": "trending"
  },
  {
    "title": "Stock-paired tokens",
    "description": "The GEYSER desk and squidlor.trade: launch a token against NVDAc, trade it on Uniswap v4.",
    "href": "/products/trade",
    "icon": "coins"
  },
  {
    "title": "Clippers",
    "description": "Clip contests on the marketing site, run through the platform wallet sign-in.",
    "href": "/products/clippers",
    "icon": "zap"
  }
]
```

## How they fit together

Every product reads the same oracle. Nothing on this page has a private price path.

- **The oracle** publishes medians on-chain through `SquidlorAdapterV2` and the per-pair aggregators. See [Squidlor Oracle](/oracle).
- **Prediction markets** settle against the adapter's rounds on Base through `SquidlorPriceResolver`. A market cannot be created for a symbol the adapter has never published, and it cannot resolve without a round inside the 30 minutes before expiry.
- **Stock-paired tokens** are priced in Coinbase's tokenized stocks (NVDAc and twelve more). The oracle's equity feeds are what the trade page and the GEYSER desk quote the underlying stock from, and a prediction market on the paired stock is one click from every token page.
- **Oracle Chat** carries a desk for each product: TIDE for markets, GEYSER for launches, PEARL for equities, REEF for Virtuals agent tokens, and KRAKEN, INK and ABYSS for the oracle itself. See [Oracle Chat](/ai/oracle-chat).
- **The hub** adds no backend. It proxies the platform API and the chat API on its own origin and signs you into the platform once.

## One sign-in, with a caveat

The platform's sign-in is Sign-In with Ethereum: the server builds a message, you sign it, the server returns a session token. The hub, markets and clippers all use that handshake against the same user service, so a session from the hub is a session on markets.

Two things it does not do yet. The browser scopes wallet permission per origin, so opening a product from the hub still asks the wallet to approve the new site once. And Oracle Chat and the builder portal keep their own sign-in until they accept the platform token, which is tracked as a small additive change on each.

> [!NOTE]
> `squidlor.market` and `sqdlr.live` are short-link domains for sharing markets. They redirect to [markets.squidlor.com](https://markets.squidlor.com) and never serve the app, so a wallet warning on either domain is a phishing signal, not a Squidlor page.
