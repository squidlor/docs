---
title: AI & agents
description: Two interfaces over the same oracle data — a chat UI, and an MCP server any agent can call.
---

Both of these sit as thin layers over the [aggregator API](/api). Neither is a separate source of truth: every number they state comes from the same on-chain state you could read yourself.

```cards
[
  {
    "title": "Oracle Chat",
    "description": "A multi-persona chat UI — ask about feed state in plain English.",
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
| **Oracle Chat** | Built and actively developed. Not yet wired into the production topology. |
| **MCP server** | Built. Intended to serve at `api.squidlor.com/mcp`; that deployment is not confirmed live. |

> [!WARNING]
> Both run locally today. If you are evaluating Squidlor's data access, the [HTTP API](/api) is the layer that is actually live and serving traffic — everything on this page reads through it.

## The rule both follow

Both are built around one constraint: **numbers come from tool results, never from the model**.

In Oracle Chat, any figure stated in a reply must come from a live tool call made in that session. The persona instruction is blunt about it — "receipts or silence."

This matters because a language model will confidently produce a plausible-looking BTC price. For an oracle product, a plausible number is worse than no number: it is indistinguishable from a real one and wrong. The tool-grounding rule is the only thing that makes an LLM an acceptable interface to price data at all.

## Shared tool surface

Oracle Chat and the MCP server expose almost the same seven tools, each a thin wrapper over an API endpoint:

| Tool | Endpoint |
| --- | --- |
| `list_feeds` | [`/feeds`](/api/feeds#list-feeds) |
| `get_price` | [`/feeds/{PAIR}/value`](/api/feeds#get-just-the-value) |
| `compare_oracles` | [`/feeds/{PAIR}`](/api/feeds#get-one-feed) — per-source breakdown |
| `get_price_history` | [`/feeds/{PAIR}/history`](/api/history#history) |
| `get_ohlc` | [`/feeds/{PAIR}/ohlc`](/api/history#ohlc-candles) |
| `get_audit_trail` | [`/feeds/{PAIR}/audit`](/api/history#audit-trail) |
| `list_events` | [`/events`](/api/events) |

Oracle Chat adds a UI-only `render_live_chart`.

Because they are all wrappers, an agent's capabilities are exactly the API's capabilities. There is no privileged data path, and nothing an agent can see that you cannot fetch with `curl`.

## Why an agent interface at all

The audit trail is the honest answer. Reading [`/feeds/BTC_USD/audit?flagged=true`](/api/history#audit-trail) tells you which sources deviated and when — but interpreting it means correlating deviations across sources and time, which is exactly the kind of question that is tedious to write a query for and natural to ask in a sentence.

"Which BTC sources deviated more than 50 bps in the last day, and did any of them go stale at the same time?" is a genuinely useful question. Nobody wants to build a UI for it.
