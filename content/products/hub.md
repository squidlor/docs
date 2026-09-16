---
title: Hub
description: app.squidlor.com. Connect a wallet once, sign one message, and every Squidlor product is one click away and already signed in.
---

The hub is the front door to Squidlor, live at [app.squidlor.com](https://app.squidlor.com) since 2026-09-04. It is a static single-page app with no backend of its own. It reads from two existing services through same-origin proxies and changes neither.

## The six chapters

The layout is a deck: an identity card and six numbered chapters on the left, one chapter spotlit on the right. Keys `1` to `6` jump between chapters and `/` focuses the question box.

| Route | Chapter | What is on it |
| --- | --- | --- |
| `/chat` | Chat | The six desks, a live ticker of the Arc feeds, and a question box. Answers stream in place from the chat API; rich results such as sign panels open in [Oracle Chat](/ai/oracle-chat). |
| `/markets` | Markets | Open [prediction markets](/products/markets), and your positions, points and rank when signed in. |
| `/build` | Build | The [builder portal](/build), keys and the [MCP server](/ai/mcp). |
| `/clippers` | Clippers | The current [clip contest](/products/clippers). |
| `/docs` | Docs | Where to start reading on this site. |

`/chat?ask=…&desk=…` opens the Chat chapter with a question already asked, on a named desk. Every chapter's outbound link opens the product itself, signed in where the product accepts the platform session.

## How sign-in works

Sign-in is the platform's Sign-In with Ethereum, the same handshake [markets.squidlor.com](https://markets.squidlor.com) uses:

1. `POST /user/auth/request` with `{ type: "wallet", id: <address> }` returns the message to sign. The domain in that message comes from the request origin, checked against an allowlist, never echoed.
2. The wallet signs it. No gas, no transaction.
3. `POST /user/auth` with `{ id, type: "wallet", auth: <signature> }` returns the session token and the user's profile.

The token is kept in the browser and sent as a bearer header. It signs you into the platform: markets, points, clippers.

What it does not do yet:

- **Wallet permission is per origin.** Opening a product from the hub still asks the browser wallet to approve the new site once. That is the browser's rule.
- **Chat and the builder portal keep their own sign-in.** Oracle Chat uses a wallet signature of its own and the portal uses its own login, until each accepts the platform token. Both are small additive changes and are tracked on the [roadmap](/resources/roadmap).

## What it reads

| Same-origin prefix | Upstream | Used for |
| --- | --- | --- |
| `/api/platform/` | The API gateway behind `api.squidlor.com` | Sign-in, profile, markets, points, clippers, the Base feed list |
| `/api/chat/` | The Oracle Chat server | The desk roster, streamed answers, the launch board |

The proxying is what makes the hub work with **zero backend changes**. The chat server's browser allowlist does not include the hub's origin, so the hub never calls it cross-origin.

## Built from what already existed

The hub shares its theme, connect modal and wallet stack with every other Squidlor frontend, and the same squid splash they all show before first paint. It is deployed like the portal: build, copy the static output to the box, nginx serves it.
