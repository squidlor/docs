---
title: MCP server
description: Squidlor oracle data as Model Context Protocol tools, for Claude Code, Claude Desktop, or any MCP-aware agent.
---

`@squidlor/mcp` exposes the oracle's read surface as MCP tools, so any MCP client can query live feed state, history, and audit trails. It is built on `@modelcontextprotocol/sdk` with zod schemas. The oracle tools are a read-only layer over the [aggregator API](/api), and nothing on this server can write on-chain state or move funds.

Tool definitions, execution and result enrichment come from `@squidlor/oracle-tools`, shared with [Oracle Chat](/ai/oracle-chat). That matters to you as a caller: results carry the same coverage verdicts, print-age annotation and block-explorer links the chat agents get, so a stale weekend equity close reads as a close rather than an outage.

Live at **`https://api.squidlor.com/mcp`**. See the [agent quickstart](/build/quickstart-agents) for client configuration, and [authentication](/build/authentication) for attaching an API key so your agent's calls count toward [builder rewards](/build/rewards).

## Tools

The public endpoint serves 20 tools, all returning JSON. Ask it yourself:

```bash
curl -s -X POST https://api.squidlor.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Thirteen read the oracle:

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
| `get_provider_scorecard` | How each provider has actually behaved on a feed: uptime, median deviation, and how often it went stale. The question "should I trust this source" answered from history rather than from one reading. |
| `get_price_at` | The median as of a past timestamp, with the rounds it was derived from. Use it to settle what a contract would have read at a point in time. |
| `list_flagged` | One call that scans every feed on a chain for anomalous rounds, worst deviation first. Use instead of walking pairs one at a time. |
| `get_realtime_prices` | Off-chain 1-second median across venues, the freshest number we have. The on-chain aggregate only moves on a 0.5% deviation or the hourly heartbeat, so between pushes these two legitimately disagree. |
| `generate_integration` | Ready-to-run integration code for six shapes: a REST read, an on-chain read, a Solidity read, a page widget, an MCP agent, a signed-webhook receiver. |

Two more need no key and answer what work is open: `list_bounties` and `list_showcase`.

### Account tools

These act on the project behind the API key you present, so they need one; see [authentication](/build/authentication). Called without a key they return a `needsApiKey` result telling you where to get one, rather than a protocol error.

| Tool | What it does |
| --- | --- |
| `create_webhook` | Subscribe to signed push notifications on deviation, staleness, recovery and round events, so an agent can **react** to a move instead of polling for one. The signing secret is returned once. |
| `list_webhooks` · `delete_webhook` | Manage your subscriptions. A subscription auto-disabled by repeated delivery failures shows `active:false` with the reason. |
| `test_webhook` | Fire a synthetic delivery now. Do this immediately after creating one; otherwise your first delivery is a real event you may miss, and a receiver that silently rejects everything looks identical to a market that never moved. |
| `get_my_usage` | Your tier and per-day usage split by client family. Answers "why am I being rate limited" from inside the agent. |

> [!IMPORTANT]
> When verifying a webhook, compute the HMAC over the **raw** request body. `express.json()` gives you an object whose re-serialisation differs byte-for-byte, and the signature will never match. A 401 from your own receiver is almost always this.

### Wallet and token tools, off by default

The shared package also defines wallet reads (`get_wallet_overview`, `get_wallet_card`, `get_transaction`), token lookups (`resolve_token`, `scan_token_safety`, `get_audit_report`) and swap or send quotes (`quote_swap`, `quote_send`) with scheduled tasks beside them. [Oracle Chat](/ai/oracle-chat) serves them today. The public MCP endpoint does not: it advertises a tool only when it can reach the service behind it, and a tool listed but guaranteed to fail is worse than an absent one, because the agent plans around a capability it does not have.

Run your own server with `DEFI_AGENT_URL` and `DEFI_AGENT_KEY_MCP` set and the wallet and token tools appear. The quote tools stay behind a second switch, `DEFI_AGENT_QUOTES=true`, because an MCP client is an autonomous agent and an operator should decide to hand it transactions rather than discover that it has them. Quotes come back unsigned with an expiry either way, and the engine enforces what the surface key is entitled to whatever a tool definition asks for.

The prediction-market tools (TIDE) exist only in [Oracle Chat](/ai/oracle-chat): they build transactions for a browser wallet to sign, and an autonomous MCP client has no such panel. Read the market through its [HTTP API](/products/markets#read-it-yourself) instead.

`compare_oracles` and `get_audit_trail` are the two that justify the integration. Both answer questions that are tedious to assemble by hand and natural to ask in a sentence: "are Chainlink and Squidlor disagreeing on ETH right now, and by how much?"

## Transports

### stdio for local clients

For Claude Code and Claude Desktop:

```bash
MCP_TRANSPORT=stdio node dist/index.js
```

### Streamable HTTP (the default)

A stateless `POST /mcp`, served in production at `https://api.squidlor.com/mcp` behind nginx (port `5020` by default, set with `MCP_PORT`). GET and DELETE return 405; it is POST-only by design.

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
| `SQUIDLOR_API_KEY` | Fallback key used when the caller presents none. On stdio there is no header to carry one, so a local agent sets it here. Over HTTP the request's `Authorization` header wins. |
| `DEVELOPER_API_URL`, `NOTIFICATION_API_URL` | The services behind the account tools. Unset means those tools are not advertised. |
| `DEFI_AGENT_URL`, `DEFI_AGENT_KEY_MCP` | The engine behind the wallet and token tools. Both required, or neither is advertised. |
| `DEFI_AGENT_QUOTES` | `true` also advertises the swap and send quote tools. |

Point `AGGREGATOR_API_URL` at your own instance to query a chain the public API does not serve. The tools validate the chain slug against `arc`; anything else is rejected as an unknown chain.

## What it can and cannot do

**Can:** read live prices, compare sources, pull history and candles, inspect audit trails, list events, on any chain the configured API instance serves.

**Cannot:** move anything. No transactions, no trades, no market creation, no resolution. The oracle tools have no write path at all, and a quote tool, where an operator has enabled one, returns an unsigned transaction that only the holder of the keys can broadcast.

## Interpreting results

Two habits are worth building when an agent is reading these tools for you.

**Check `healthyCount` against `totalSources`.** A price backed by fewer sources than the feed has is valid and unprotected. Every Arc pair reports 1 of 1 today, so there is no corroboration behind any answer yet. An agent will report the number without necessarily flagging the ratio; ask, or read it yourself.

**Distinguish `cachedAt` from `updatedAt`.** `cachedAt` is when the API read the chain; `updatedAt` is when the data was published. A response can be seconds old and carry a price from Friday afternoon, which is exactly correct for an equity feed on a Sunday.

## Related

```cards
[
  {
    "title": "API reference",
    "description": "The endpoints every tool wraps. Read these to know what a tool can actually return.",
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
