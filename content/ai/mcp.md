---
title: MCP server
description: Squidlor oracle data as Model Context Protocol tools — for Claude Code, Claude Desktop, or any MCP-aware agent.
---

`@squidlor/mcp` exposes the oracle's read surface as MCP tools, so any MCP client can query live feed state, history, and audit trails. It is built on `@modelcontextprotocol/sdk` with zod schemas, and is a thin read-only layer over the [aggregator API](/api).

Live at **`https://api.squidlor.com/mcp`**. See the [agent quickstart](/build/quickstart-agents) for client configuration, and [authentication](/build/authentication) for attaching an API key so your agent's calls count toward [builder rewards](/build/rewards).

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

`compare_oracles` and `get_audit_trail` are the two that justify the integration. Both answer questions that are tedious to assemble by hand and natural to ask in a sentence — "are Chainlink and Squidlor disagreeing on ETH right now, and by how much?"

## Transports

### stdio — local clients

For Claude Code and Claude Desktop:

```bash
MCP_TRANSPORT=stdio node dist/index.js
```

### Streamable HTTP — the default

A stateless `POST /mcp`, served in production at `https://api.squidlor.com/mcp` behind nginx (port `5012` locally on the host).

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
