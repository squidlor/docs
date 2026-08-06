---
title: Agent quickstart
description: Give an AI agent live prices, history and cross-source verification as callable tools, over MCP.
---

Most oracles give an agent a URL to scrape. Squidlor exposes its data as MCP tools, so a model can ask for a price, compare what every provider reports, and pull candles — without you writing an HTTP layer.

## Connect a client

The server speaks streamable HTTP at `https://api.squidlor.com/mcp`.

> **Not live yet.** That endpoint is not answering today — the MCP server is built but not
> deployed. Everything below is correct for a local run (`MCP_PORT=5020`, or
> `MCP_TRANSPORT=stdio`); swap the URL when the hosted endpoint goes up.

**Claude Code / Claude Desktop** — add to your MCP config:

```json
{
  "mcpServers": {
    "squidlor": {
      "type": "http",
      "url": "https://api.squidlor.com/mcp",
      "headers": { "Authorization": "Bearer sq_live_..." }
    }
  }
}
```

The `Authorization` header is optional. Without it you get the anonymous rate limit and your usage earns no [rewards](/build/rewards); with it, tool calls are attributed to your project.

**Local stdio** — for running the server yourself:

```json
{
  "mcpServers": {
    "squidlor": {
      "command": "node",
      "args": ["apps/mcp/dist/index.js"],
      "env": { "MCP_TRANSPORT": "stdio", "SQUIDLOR_API_KEY": "sq_live_..." }
    }
  }
}
```

Verify the connection:

```bash
curl -X POST https://api.squidlor.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## The tools

| Tool | What it answers |
|---|---|
| `list_feeds` | What pairs exist on a chain, with live medians |
| `get_price` | The current aggregated price of one pair |
| `compare_oracles` | What each provider reports for one pair, side by side, with staleness |
| `get_price_history` | Sampled median series over a window |
| `get_ohlc` | Candles at `1m`–`1d` |
| `get_audit_trail` | Per-source deviation and staleness records |
| `list_events` | Registered event-outcome aggregators |

`compare_oracles` is the one worth knowing about: it is how an agent answers "is this price trustworthy?" rather than just "what is the price?". It returns every source behind the median with its own timestamp, so a model can notice that four providers agree and one is nine hours stale.

## Without MCP

If your framework does not speak MCP, the same data is two REST calls. The SDK is the shortest path:

```ts
import { createClient } from '@squidlor/oracle-sdk';

const api = createClient({ apiKey: process.env.SQUIDLOR_API_KEY });

// Define a tool for your agent framework
export const getPriceTool = {
  name: 'get_price',
  description: 'Current aggregated USD price of a crypto or equity pair',
  parameters: { pair: 'string' },
  execute: async ({ pair }: { pair: string }) => {
    const { value, healthyCount, updatedAt } = await api.getValue('robinhood', pair);
    return { price: value, healthySources: healthyCount, asOf: new Date(updatedAt * 1000).toISOString() };
  },
};
```

## Give the model the freshness, not just the number

The single most common agent bug we see is treating a price as current because it was just fetched. Our API returns when the price was *published on-chain*, which is a different thing.

Always pass `updatedAt` and `healthyCount` into the model's context alongside the value:

```ts
const { value, updatedAt, healthyCount } = await api.getValue('robinhood', 'NVDA/USD');
const ageMinutes = Math.round((Date.now() / 1000 - updatedAt) / 60);

const context = `NVDA/USD = $${value}, published ${ageMinutes} min ago, ${healthyCount} healthy source(s).`;
```

Equity feeds do not update when US markets are closed. An agent told only "NVDA = 204.51" will confidently reason about a Saturday price as if it were live; one told "published 3,120 minutes ago" will not.

## Ready-made

[`squidlor-agent-starter`](/build/templates) is a working agent wired to the MCP server with a price-alert loop — clone it rather than starting from this page.

## Earning from agent traffic

Traffic arriving through MCP with your key attached is counted under the `mcp` family. Projects whose usage is majority-MCP get a **1.5× multiplier** on usage points in [Season 0](/build/rewards), once the project is verified.
