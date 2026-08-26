---
title: AI & agents
description: Two interfaces over the same oracle data — a chat UI, and an MCP server any agent can call.
---

Both of these sit as thin layers over the [aggregator API](/api). Neither is a separate source of truth: every number they state comes from the same on-chain state you could read yourself.

```cards
[
  {
    "title": "Oracle Chat",
    "description": "Five persona desks and a router, over live feeds, wallets and agent tokens.",
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
| **Oracle Chat** | Live at [chat.squidlor.com](https://chat.squidlor.com). Six desks. Signs builders in, mints API keys, sets up price alerts, reads wallets, quotes swaps, and generates integration code. |
| **MCP server** | Live at `api.squidlor.com/mcp`, 20 tools including signed webhooks and usage. |

Both read the same [HTTP API](/api) you can call yourself, so nothing on this page is a separate source of truth. Paid chat credits over x402 are the one piece that is built and switched off in production.

## The rule both follow

Both are built around one constraint: **numbers come from tool results, never from the model**.

In Oracle Chat, any figure stated in a reply must come from a live tool call made in that session. The persona instruction is blunt about it — "receipts or silence."

This matters because a language model will confidently produce a plausible-looking BTC price. For an oracle product, a plausible number is worse than no number: it is indistinguishable from a real one and wrong. The tool-grounding rule is the only thing that makes an LLM an acceptable interface to price data at all.

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

Each side then adds what only makes sense there. Oracle Chat has the drawn widgets (`render_live_chart`, `render_arb_board`), exchange arbitrage, the Virtuals agent-token tools, and account tools on every desk. The MCP server has signed webhooks, which let an agent react to a move instead of polling for one. Wallet reads and swap quotes are defined once and served by chat today, off by default over MCP.

Because the oracle tools are all wrappers, an agent's data capabilities are exactly the API's capabilities. There is no privileged path, and nothing an agent can see that you cannot fetch with `curl`.

## Why an agent interface at all

The audit trail is the honest answer. Reading [`/feeds/BTC_USD/audit?flagged=true`](/api/history#audit-trail) tells you which sources deviated and when — but interpreting it means correlating deviations across sources and time, which is exactly the kind of question that is tedious to write a query for and natural to ask in a sentence.

"Which BTC sources deviated more than 50 bps in the last day, and did any of them go stale at the same time?" is a genuinely useful question. Nobody wants to build a UI for it.
