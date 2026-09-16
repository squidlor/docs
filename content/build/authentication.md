---
title: Authentication
description: The API works without a key. A free key raises your rate limit, unlocks usage stats, and makes your traffic count toward builder rewards.
---

Squidlor's read API is open. You do not need a key to call it, and we have no plans to change that: the curl-first path stays open because it is how most people evaluate an oracle.

A key buys you three things:

1. **A higher rate limit**: 300 requests/minute instead of 30, and 3,000 on Pro.
2. **Usage visibility**: per-day, per-endpoint numbers for your project in the portal.
3. **Credit for what you build**: [builder rewards](/build/rewards) are computed from metered usage, so anonymous traffic earns nothing.

## Get a key

1. Sign in at [build.squidlor.com](https://build.squidlor.com) with a wallet or an email code.
2. Create a project (name, category, the chains you use).
3. Mint a key.

Keys look like `sq_live_` followed by 32 characters:

```
sq_live_vYMCV3HLSOxy53kulCGzgxhTHmBnli45
```

**The full key is shown exactly once, at creation.** We store only an HMAC of it, so we cannot recover or re-display it. If you lose it, rotate.

## Use a key

Preferred: an `Authorization` header:

```bash
curl -H "Authorization: Bearer sq_live_..." \
  https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD/value
```

Query parameter, for contexts where you cannot set headers (a browser `<img>`, a webhook config, a spreadsheet):

```bash
curl "https://api.squidlor.com/aggregator/v1/arc/feeds/BTC_USD/value?apiKey=sq_live_..."
```

Keys in URLs land in server logs, browser history and referrer headers. Prefer the header wherever you have the choice.

### With the SDK

```ts
import { createClient } from '@squidlor/oracle-sdk';

const api = createClient({ apiKey: process.env.SQUIDLOR_API_KEY });
const btc = await api.getValue('arc', 'BTC/USD');
```

### With the MCP server

Pass the key as a bearer token on the MCP endpoint and your agent's tool calls are attributed to your project:

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

For the stdio transport there is no header, so set `SQUIDLOR_API_KEY` in the server's environment instead.

Requests that arrive through MCP are counted under the `mcp` usage family rather than the underlying endpoint's, which is what makes the agent multiplier in [builder rewards](/build/rewards) meaningful.

## What the response tells you

Every `/v1` response carries:

| Header | Meaning |
|---|---|
| `X-Squidlor-Tier` | `anon`, `free`, `pro` or `institutional`; the tier your request was served at |
| `X-RateLimit-Limit` | Requests allowed in the current minute |
| `X-RateLimit-Remaining` | Requests left in it |
| `X-RateLimit-Reset` | Seconds until the window resets |

`X-Squidlor-Tier` is the fastest way to confirm a key is actually being read. If you sent a key and see `anon`, the key did not arrive; check the header name and that you did not truncate the value.

## Rotation and revocation

- **Rotate** mints a replacement and revokes the old key immediately. Deploy the new value, then confirm traffic moved using the usage chart.
- **Revoke** kills a key outright. Revocation propagates within 60 seconds (the API caches key lookups for that long).

Each project allows 3 active keys, which is enough to run separate keys per environment and still have room to rotate one.

## Errors

| Status | `code` | Meaning |
|---|---|---|
| 401 | `INVALID_API_KEY` | The key does not exist or was revoked. Note this is an error, not a silent downgrade; a typo in a deploy should be loud. |
| 429 | `RATE_LIMITED` | Over your per-minute allowance. See [rate limits](/build/rate-limits). |

If our key-lookup path is degraded, a valid key is served at anonymous limits rather than rejected, and the response carries `X-Squidlor-Key-Unverified: true`. You will see slower limits, never a lockout.

## Security notes

- Keys are read-only credentials for public data. Losing one exposes no private information; it lets someone consume your quota.
- Do not ship a key in client-side JavaScript. For browser apps, proxy through your own backend, or accept the anonymous tier.
- We store only an HMAC-SHA256 of each key, peppered with a server-side secret, so a database leak alone does not yield usable keys.
