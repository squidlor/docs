---
title: MCP server
description: Squidlor oracle data as Model Context Protocol tools — for Claude Code, Claude Desktop, or any MCP-aware agent.
---

`@squidlor/mcp` exposes the oracle's read surface as MCP tools, so any MCP client can query live feed state, history, and audit trails. It is built on `@modelcontextprotocol/sdk` with zod schemas, and is a read-only layer over the [aggregator API](/api).

Tool definitions, execution and result enrichment come from `@squidlor/oracle-tools`, shared with [Oracle Chat](/ai/oracle-chat). That matters to you as a caller: results carry the same coverage verdicts, print-age annotation and block-explorer links the chat agents get, so a stale weekend equity close reads as a close rather than an outage.

> **Not live yet.** The server is built and tested; `https://api.squidlor.com/mcp` is the
> address it will serve at, and is not answering today. Run it locally in the meantime — see
> [transports](#transports) below.

See the [agent quickstart](/build/quickstart-agents) for client configuration, and [authentication](/build/authentication) for attaching an API key so your agent's calls count toward [builder rewards](/build/rewards).

## Tools

Seven, all returning JSON:

| Tool | Purpose |
| --- | --- |
| `list_feeds` | Every configured feed on a chain, with a health summary. |
| `get_price` | The latest value for one pair. |
| `compare_oracles` | Per-provider breakdown across Chainlink, Pyth, RedStone, DIA, Supra, eOracle, Chronicle, Stork, Squidlor, and Uniswap TWAP. |
| `get_price_history` | Sampled median series. |
| `get_ohlc` | OHLC candles. |
| `get_audit_trail` | Deviation in bps, staleness, and anomaly flags per source. |
| `list_events` | Registered event-outcome state. |
| `get_squidlor_breakdown` | The per-API quotes (Yahoo, Nasdaq, Finnhub, Twelve Data) behind Squidlor's own equity leg, so our feed is never a single opaque source. |
| `list_flagged` | One call that scans every feed on a chain for anomalous rounds, worst deviation first. Use instead of walking pairs one at a time. |
| `get_realtime_prices` | Off-chain 1-second median across venues — the freshest number we have. The on-chain aggregate only moves on a 0.5% deviation or the hourly heartbeat, so between pushes these two legitimately disagree. |
| `generate_integration` | Ready-to-run integration code for six shapes: a REST read, an on-chain read, a Solidity read, a page widget, an MCP agent, a signed-webhook receiver. |
| `list_bounties` · `list_showcase` | Open paid work, and what other builders have shipped. No key needed. |

### Account tools

These act on the project behind the API key you present, so they need one — see [authentication](/build/authentication). Called without a key they return a `needsApiKey` result telling you where to get one, rather than a protocol error.

| Tool | What it does |
| --- | --- |
| `create_webhook` | Subscribe to signed push notifications on deviation, staleness, recovery and round events, so an agent can **react** to a move instead of polling for one. The signing secret is returned once. |
| `list_webhooks` · `delete_webhook` | Manage your subscriptions. A subscription auto-disabled by repeated delivery failures shows `active:false` with the reason. |
| `test_webhook` | Fire a synthetic delivery now. Do this immediately after creating one — otherwise your first delivery is a real event you may miss, and a receiver that silently rejects everything looks identical to a market that never moved. |
| `get_my_usage` | Your tier and per-day usage split by client family. Answers "why am I being rate limited" from inside the agent. |

> [!IMPORTANT]
> When verifying a webhook, compute the HMAC over the **raw** request body. `express.json()` gives you an object whose re-serialisation differs byte-for-byte, and the signature will never match. A 401 from your own receiver is almost always this.

`compare_oracles` and `get_audit_trail` are the two that justify the integration. Both answer questions that are tedious to assemble by hand and natural to ask in a sentence — "are Chainlink and Squidlor disagreeing on ETH right now, and by how much?"

## Transports

### stdio — local clients

For Claude Code and Claude Desktop:

```bash
MCP_TRANSPORT=stdio node dist/index.js
```

### Streamable HTTP — the default

A stateless `POST /mcp`, to be served in production at `https://api.squidlor.com/mcp` behind nginx (port `5020` locally by default, set with `MCP_PORT`).

Statelessness is what makes it deployable behind a plain reverse proxy: there is no session to pin to a process, so it scales horizontally without sticky routing.

## Configure Claude Code

```bash
claude mcp add squidlor-oracle \
  --env MCP_TRANSPORT=stdio \
  --env AGGREGATOR_API_URL=https://api.squidlor.com/aggregator \
  -- node /absolute/path/to/squidlor/apps/mcp/dist/index.js
```

Then confirm it is connected with `/mcp` inside a session.

## Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "squidlor-oracle": {
      "command": "node",
      "args": ["/absolute/path/to/squidlor/apps/mcp/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "AGGREGATOR_API_URL": "https://api.squidlor.com/aggregator"
      }
    }
  }
}
```

Restart Claude Desktop afterwards.

> [!IMPORTANT]
> Use an absolute path to `dist/index.js`, and build first (`pnpm build` in the MCP app). A relative path resolves against the client's working directory, not yours, and the most common setup failure is a server that never starts because the path is wrong or the build is missing.

## Environment

| Variable | Purpose |
| --- | --- |
| `MCP_TRANSPORT` | `stdio` or unset for Streamable HTTP. |
| `AGGREGATOR_API_URL` | Where tools read from. |
| `MCP_PORT` | HTTP port (default 5020). |

Point `AGGREGATOR_API_URL` at your own instance to query a chain the public API does not yet serve — [Robinhood Chain, today](/api#two-ways-to-address-a-chain).

## What it can and cannot do

**Can:** read live prices, compare sources, pull history and candles, inspect audit trails, list events — on any chain the configured API instance serves.

**Cannot:** write anything. No transactions, no trades, no market creation, no resolution. There is no write path in the server at all, which is the property that makes it safe to hand to an agent.

## Interpreting results

Two habits are worth building when an agent is reading these tools for you.

**Check `healthyCount` against `totalSources`.** A price returned from 1 of 8 sources is valid and unprotected. An agent will report the number without necessarily flagging the ratio — ask, or read it yourself.

**Distinguish `cachedAt` from `updatedAt`.** `cachedAt` is when the API read the chain; `updatedAt` is when the data was published. A response can be seconds old and carry a price from Friday afternoon — which is exactly correct for an equity feed on a Sunday.

## Related

```cards
[
  {
    "title": "API reference",
    "description": "The endpoints every tool wraps — read these to know what a tool can actually return.",
    "href": "/api",
    "icon": "code"
  },
  {
    "title": "Oracle Chat",
    "description": "The same tool surface behind a purpose-built chat UI.",
    "href": "/ai/oracle-chat",
    "icon": "bot"
  }
]
```
