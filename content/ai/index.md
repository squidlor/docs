---
title: AI & agents
description: Two interfaces over the same oracle and product data. A chat UI with seven desks, and an MCP server any agent can call.
---

Both of these sit as thin layers over the [aggregator API](/api) and the product APIs behind [markets](/products/markets) and [launches](/products/trade). Neither is a separate source of truth: every number they state comes from state you could read yourself.

```cards
[
  {
    "title": "Oracle Chat",
    "description": "Seven persona desks and a router, over live feeds, wallets, agent tokens, prediction markets and stock-paired launches.",
    "href": "/ai/oracle-chat",
    "icon": "bot"
  },
  {
    "title": "MCP server",
    "description": "Oracle data as tools for Claude Code, Claude Desktop, or any MCP client.",
    "href": "/ai/mcp",
    "icon": "terminal"
  },
  {
    "title": "Oracle SDK",
    "description": "The non-AI read layer everything above ultimately sits on.",
    "href": "/integration/sdk",
    "icon": "code"
  }
]
```

## Status, honestly

| System | State |
| --- | --- |
| **Oracle Chat** | Live at [chat.squidlor.com](https://chat.squidlor.com). Seven desks plus a router. Signs builders in, mints API keys, sets up price alerts, reads wallets, quotes swaps, generates integration code, launches and trades stock-paired tokens, and reads and trades prediction markets. |
| **MCP server** | Live at `api.squidlor.com/mcp`, 20 tools including signed webhooks and usage. The market and launch tools are chat-only. |
| **X agent** | Live as [@Squidlor_Agent](https://x.com/Squidlor_Agent), answering mentions with live prices and Virtuals agent-token data. Replies are drafted for review before posting. |
| **The hub** | [app.squidlor.com](https://app.squidlor.com) streams chat answers in place through the same API. See [Hub](/products/hub). |

Paid chat credits over x402 are the one piece that is built and switched off in production.

## The rule both follow

Both are built around one constraint: **numbers come from tool results, never from the model**.

In Oracle Chat, any figure stated in a reply must come from a live tool call made in that session. The persona instruction is blunt about it: "receipts or silence."

This matters because a language model will confidently produce a plausible-looking BTC price. For an oracle product, a plausible number is worse than no number: it is indistinguishable from a real one and wrong. The tool-grounding rule is the only thing that makes an LLM an acceptable interface to price data at all.

The same rule extends to transactions. No desk ever claims a transaction is waiting unless a tool built one in that turn, and no desk ever says a trade executed: the sign panel knows, the model does not.

## Three scopes, kept apart

Every desk's instructions name three data scopes and forbid blending them:

| Scope | What it covers | Chains |
| --- | --- | --- |
| **Oracle feeds** | Squidlor medians and their sources | Arbitrum, Robinhood Chain, and Base on the HTTP API |
| **Wallet engine** | Balances, holdings, transactions, swap quotes | Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, zkSync and seven more |
| **DEX market data** | Trending tokens, token lookup, pool prints | Any chain GeckoTerminal indexes |

"What is trending on Base" is a DEX question and gets the DEX tools. "What is BTC" is an oracle question and gets a median with its source count. A desk that reaches for the feed list to answer a trending question is a bug, and there is a test for it.

## Shared tool surface

The oracle tools live in one package, `@squidlor/oracle-tools`, which both the chat desks and the MCP server import. Adding a tool there surfaces it in both at once. Before that, each side carried its own copy of the wrappers and they had drifted, so the same question answered better in one place than the other.

The thirteen oracle reads, each a thin wrapper over an API endpoint:

| Tool | Endpoint |
| --- | --- |
| `list_feeds` | [`/feeds`](/api/feeds#list-feeds) |
| `get_price` | [`/feeds/{PAIR}/value`](/api/feeds#get-just-the-value) |
| `compare_oracles` | [`/feeds/{PAIR}`](/api/feeds#get-one-feed), per-source breakdown |
| `get_squidlor_breakdown` | The quote APIs behind Squidlor's own equity leg |
| `get_provider_scorecard` | Per-provider uptime and deviation history |
| `get_price_history` | [`/feeds/{PAIR}/history`](/api/history#history) |
| `get_ohlc` | [`/feeds/{PAIR}/ohlc`](/api/history#ohlc-candles) |
| `get_price_at` | The median as of a past timestamp |
| `get_audit_trail` | [`/feeds/{PAIR}/audit`](/api/history#audit-trail) |
| `list_flagged` | Anomalous rounds across every feed on a chain |
| `get_realtime_prices` | [Off-chain 1-second median](/api/realtime) across venues |
| `list_events` | [`/events`](/api/events) |
| `generate_integration` | Ready-to-run code for six integration shapes |

Each side then adds what only makes sense there. Oracle Chat has the drawn widgets (`render_live_chart`, `render_arb_board`), exchange arbitrage, the Virtuals agent-token tools, the DEX market-data tools, the prediction-market tools on TIDE, the launch and trade tools on GEYSER, and account tools on every desk. The MCP server has signed webhooks, which let an agent react to a move instead of polling for one. Wallet reads and swap quotes are defined once and served by chat today, off by default over MCP.

Because the oracle tools are all wrappers, an agent's data capabilities are exactly the API's capabilities. There is no privileged path, and nothing an agent can see that you cannot fetch with `curl`.

> [!NOTE]
> The oracle tools' chain list is `arbitrum` and `robinhood` in the published package. Base is on the HTTP API but not yet in that list, so an agent asking `list_feeds` for `base` gets "unknown chain" today. It is on the [roadmap](/resources/roadmap).

## Why an agent interface at all

The audit trail is the honest answer. Reading [`/feeds/BTC_USD/audit?flagged=true`](/api/history#audit-trail) tells you which sources deviated and when. Interpreting it means correlating deviations across sources and time, which is exactly the kind of question that is tedious to write a query for and natural to ask in a sentence.

"Which BTC sources deviated more than 50 bps in the last day, and did any of them go stale at the same time?" is a genuinely useful question. Nobody wants to build a UI for it.
