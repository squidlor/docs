---
title: Oracle Chat
description: Seven persona desks and a router over live oracle state, wallets, Virtuals agent tokens, prediction markets and stock-paired launches, where every number in a reply comes from a tool call made in that session.
---

Oracle Chat is a web chat UI at [chat.squidlor.com](https://chat.squidlor.com). Seven persona desks answer questions about oracle state, wallets, agent tokens, prediction markets and token launches in plain English, and a router desk picks between them. The [hub](/products/hub) streams the same answers in place at app.squidlor.com. The hard rule holds everywhere: **every number in a reply comes from a live tool call made in that session.**

Ask the chat what its roster is and it answers from the same endpoint this page documents:

```bash
curl -s https://chat.squidlor.com/api/agents | jq -r '.agents[] | "\(.name)  \(.tools | length) tools"'
```

## The desks

Each desk has its own system prompt and its own tool loadout, so it is competent at one thing rather than mediocre at everything. Tool counts are what the live roster reports today.

| Desk | Role | Focus | Tools |
| --- | --- | --- | --- |
| **AUTO** | Router | Reads your question and hands the turn to the desk that owns it. Default in the composer. | 0 |
| **KRAKEN** | Alpha desk | Live prices, cross-oracle reads, exchange arbitrage, wallets, swap and send quotes | 41 |
| **INK** | Chartist | History, OHLC candles, ranges, volatility | 25 |
| **ABYSS** | Auditor | Audit-trail forensics: deviations in bps, stale feeds, flagged rounds | 24 |
| **PEARL** | Stocks desk | Tokenized equities: NVDA, TSLA, AAPL, GOOGL | 26 |
| **REEF** | Agent-token desk | Virtuals Protocol movers, project deep-dives, pool history | 26 |
| **GEYSER** | Launch desk | Launch a token on Base paired with a tokenized stock, the board, buy and sell | 23 |
| **TIDE** | Prediction desk | Squidlor prediction markets on Base: odds, positions, contest standing, orders | 32 |

AUTO routes on keyword scoring, not an LLM call. A ticker means PEARL, audit language means ABYSS, candles and history mean INK, agent tokens mean REEF, "launch" with a coin means GEYSER, "odds" or "market" means TIDE, and anything live means KRAKEN. The desk that already holds the thread gets a bonus, so a one-word overlap ("NVIDIA" in the middle of naming a launch) no longer moves you off the desk that has the tools. The answer streams back wearing the chosen desk's name and glyph, and a `routed` event tells the UI which desk took the turn. Routing this way costs no extra model round trip before the first token.

`/?desk=geyser&ask=Launch a token paired with NVDA` opens the chat on a desk with the question already asked. The hub and the trade page use that deep link.

ABYSS is still the one worth knowing about. Audit forensics is the hardest question to answer from raw JSON and the easiest to phrase in a sentence:

```text
Which BTC sources deviated more than 50 bps in the last 24 hours,
and did any of them go stale at the same time?
```

REEF and TIDE are the exceptions to "same oracle underneath". REEF reads Virtuals Protocol's own API and a pool index, not the Squidlor aggregator, and its prompt carries the rules that keep the two sources apart. Squidlor operates no price feed for any agent token, so REEF never calls one of those numbers an oracle reading. TIDE reads the [prediction market](/products/markets) API, where prices are probabilities in cents and balances are sqUSD contest collateral, and its prompt forbids writing either with a dollar sign.

GEYSER is the one desk that builds transactions for a living. It never invents a name or a symbol, calls the launch tool once when it has all three inputs, and after that says only what will be created and "review it in the panel". Nothing is live until you sign.

## Tools

Oracle reads come from `@squidlor/oracle-tools`, the package the [MCP server](/ai/mcp) shares. One definition, one execution path, one set of enrichment rules, so the same question does not answer better in chat than in Claude Desktop.

**Oracle reads.** `list_feeds`, `get_price`, `compare_oracles`, `get_price_history`, `get_ohlc`, `get_audit_trail`, `get_squidlor_breakdown`, `get_provider_scorecard`, `get_price_at`, `list_flagged`, `list_events`, `get_realtime_prices`, `generate_integration`. Every one wraps a documented [API](/api) endpoint.

**Chat-only widgets.** `render_live_chart` draws a live-updating chart in the thread. `render_arb_board` draws a moving board of exchange prices against the Squidlor median. `get_arbitrage` returns the same spread data as text. All three are contracts with this web UI, so none of them exist over MCP.

**Virtuals Protocol.** `virtuals_top_movers`, `virtuals_project`, `virtuals_history`, `virtuals_leaderboard`, `virtuals_search`, `virtuals_ecosystem`. REEF holds all six. INK holds `virtuals_history` alone, because it is a chart tool and charts are INK's job.

**DEX market data.** `get_trending_tokens`, `find_dex_token`, `get_trending_coins`, on every desk. They read GeckoTerminal, cover any chain it indexes, and every row carries turnover (24h volume over liquidity) with anything over 20x flagged, because DEX volume is partly fake. Trending windows are 5m, 1h, 6h and 24h; 7d is an upstream error, not an empty list.

**Prediction markets.** TIDE only. `list_markets`, `get_market`, `get_market_odds`, `get_my_positions`, `get_contest_standing`, `create_market`, `check_market_creation`, and when the netting relay is configured, `place_market_order`, `sell_position`, `place_limit_order`, `list_limit_orders` and `cancel_limit_order`. `list_markets` always comes first, because a question id is 32 bytes of hex that cannot be recalled or guessed. A pool that cannot be read returns no odds rather than 50%, since a fabricated 50/50 is indistinguishable from a real one. See [prediction markets](/products/markets).

**Stock-paired launches.** GEYSER only. `launch_stock_paired_token` returns the unsigned Doppler create transaction as a `signable`; `list_stock_paired_launches` draws the board (scopes `active`, `new`, `mine`); `get_stock_paired_launch` confirms a launch and returns its links; `trade_stock_paired_token` quotes a buy or sell by simulating the exact Uniswap v4 swap and returns one to three ordered steps to sign. Buys are paid in the stock token. See [stock-paired tokens](/products/trade).

**Accounts, keys and alerts.** Every desk carries all 14: `builder_login_start`, `builder_login_complete`, `whoami`, `list_my_projects`, `create_project`, `create_api_key`, `get_my_usage`, `create_price_alert`, `list_price_alerts`, `test_price_alert`, `delete_price_alert`, `get_my_rewards`, `list_bounties`, `list_showcase`. "Give me an API key" or "alert me when NVDA moves" can land on any desk, and a desk missing the tool is a dead end the user experiences as the product refusing them. Sign-in is email plus a six-digit code, so no desk ever asks for a password, and a minted key reaches the user in a copy-once panel that the model itself never sees in full.

**Wallets and tokens.** `get_wallet_overview`, `scan_token_safety`, `get_wallet_card`, `get_transaction`. KRAKEN only. These read a separate engine covering Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, zkSync and Base among thirteen chains, which is a different chain set from the oracle's three. A balance on Ethereum is in scope even though no feed lives there. A balance on Robinhood Chain is out of scope, because that engine does not index it, and KRAKEN says so rather than reporting an empty wallet.

**Quotes, tasks and memory.** `quote_swap` and `quote_send` return an unsigned transaction with an expiry. `watch_price`, `create_twap`, `list_tasks` and `cancel_task` leave standing instructions behind. `remember_preference`, `get_preferences` and `forget_preference` store preferences across conversations. Three separate env gates control these three groups, all off by default, because answering questions is a different product from signing, scheduling and remembering.

> [!IMPORTANT]
> No tool signs anything. A quote, a launch or a trade comes back unsigned and expires, and the user signs it in their own wallet. A TWAP slice produces a quote that still needs a signature, which is why `list_tasks` reports `executed: false` on every slice. Every desk carries the same rule: never claim a transaction is waiting unless a tool built one this turn, and never say a trade executed.

## Access and daily limits

Reading the chat needs no account. The allowance is earned rather than bought, and it resets at midnight UTC.

| Tier | Messages per day | How you get it |
| --- | --- | --- |
| Anonymous | 15 | Nothing. Open the page. |
| Wallet | 60 | Sign a message. No gas, no transaction. |
| Account | 100 | Sign in with email through the chat itself. |

Counts live in Mongo rather than in process memory, so a deploy does not hand everyone a fresh allowance. `GET /api/usage` reports your own tier, count and reset time.

Wallet sign-in is a nonce, a signature and a stateless HMAC token that lasts 30 days. The signature proves possession of the key, which is the only thing that separates the owner of a transcript from someone who typed a public address. It is deliberately not full EIP-4361 with domain and chain binding: these tokens authorize reading your own transcripts and nothing else. Rotating `ORACLE_CHAT_WALLET_AUTH_SECRET` invalidates every token at once.

Paid message credits over x402 are built and off. `POST /api/credits` on the production deployment returns `501 X402_DISABLED`, and `GET /api/usage` reports `paidCreditsEnabled: false`. Setting `ORACLE_CHAT_X402_PAY_TO` turns the lane on, priced by default at 50 messages for $0.05 in USDC on Base. Credits do not expire daily, because a credit someone paid for and could not spend is one we took money for and did not deliver.

## Providers

Runtime-switchable, tried in order `[active, fallback]`. The admin panel writes the choice to `data/providers.json`, so changing it needs no redeploy.

| Provider | Models |
| --- | --- |
| Gemini | `gemini-flash-lite-latest`, `gemini-flash-latest`, `gemini-2.5-flash`, `gemini-3.5-flash` |
| OpenAI | `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1` |
| Groq | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| Anthropic | `claude-opus-5`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5` |

`GET /api/health` reports which provider is active right now, which is the fallback, and how much headroom each key has left. Production runs Gemini Flash Lite active with OpenAI as fallback today.

Fallback triggers only if the active provider errors **before any text has been emitted**. Once a response has started streaming, switching mid-answer would produce something incoherent. Every response is tagged with the provider that answered.

Each provider accepts several keys. A key that returns a rate-limit error is parked for a cooldown and the next one takes over. OpenAI, Groq and Anthropic report their remaining budget in response headers, and that number wins over anything typed into the panel. Gemini's OpenAI-compatible endpoint reports nothing, so its headroom is counted locally against a budget an operator enters.

## Request flow

```text
POST /api/chat { sessionId, message, agentId? }
  → resolve desk (AUTO routes by keyword score)
  → load transcript server-side
  → open SSE stream
  → try providers in order [active, fallback]
  → tool loop (bounded by ORACLE_CHAT_MAX_TOOL_ROUNDS and ORACLE_CHAT_TOOL_CHAR_BUDGET)
  → stream text, then follow-up suggestions
```

Transcripts live on the server and the browser sends one message plus a session id. The old shape, where the browser posted the whole transcript, is still accepted while deployed bundles catch up, and `ORACLE_CHAT_LEGACY_TRANSCRIPTS=0` turns it off. It is the path where the caller supplies the conversation, so it is also the path where a fabricated assistant turn can argue with the persona.

SSE event types:

| Event | Meaning |
| --- | --- |
| `session` | The session id to send with the next message |
| `routed` | AUTO picked a desk; the UI switches to its name and colour |
| `meta` | Session and desk metadata |
| `text` | A token chunk |
| `tool_start` | A tool call has begun; the UI shows it |
| `tool_end` | The tool returned |
| `panel` | Render a drawn panel, such as the wallet view, instead of a table |
| `signable` | An unsigned transaction for the user's wallet to sign |
| `secret` | A one-time value, such as a fresh API key, shown only to the user |
| `suggestions` | Follow-up pills under the answer |
| `provider_fallback` | The active provider failed; the fallback took over |
| `done` | Stream complete |
| `error` | Stream failed |

Surfacing `tool_start` and `tool_end` in the UI is a deliberate transparency choice. The user sees which endpoint produced a number, which is what makes the tool-grounding rule verifiable rather than merely claimed. `secret` exists for the opposite reason: a minted key reaches the user without passing through the model's context, so the model can say a key was created and cannot state its value.

Wallet balances arrive as a `panel` rather than a table. The model receives a summary and the UI draws the total, the history chart and the ranked holdings, because a 13-chain balance list eats a context window and reads worse than the picture.

## Running it locally

An npm-workspaces monorepo. `server` is Express, `web` is React and Vite.

```bash
npm run dev
# server → :5030
# web    → :5031 (proxies /api)
```

### Environment

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` | Provider keys. Comma-separated for several keys on one provider. |
| `ORACLE_CHAT_MODEL` | Override the default model |
| `AGGREGATOR_API_URL` | Where the oracle tools read from |
| `AGGREGATOR_API_KEY` | First-party key for this service's own reads, so chart polling is not counted as anonymous traffic |
| `ORACLE_CHAT_PORT` | Server port (default 5030) |
| `MONGODB_URI` | Transcripts, usage counts and credits. Unset means in-memory and lost on restart. |
| `ORACLE_CHAT_WALLET_AUTH_SECRET` | Signs wallet session tokens. Unset disables wallet sign-in. |
| `ORACLE_CHAT_ANON_DAILY`, `ORACLE_CHAT_WALLET_DAILY`, `ORACLE_CHAT_AUTHED_DAILY` | Daily message allowances (15, 60, 100) |
| `DEFI_AGENT_URL`, `DEFI_AGENT_KEY_CHAT` | The engine behind the wallet and token tools. Unset means those tools are not offered. |
| `LAUNCHPAD_ENABLED`, `LAUNCHPAD_TREASURY`, `BASE_RPC_URL` | The GEYSER desk. Unset, the desk is not listed. |
| `MARKET_API_URL` and the netting relay settings | The TIDE desk. Unset, the desk is dropped; without the relay it reads markets but offers no orders. |
| `DEFI_AGENT_QUOTES`, `DEFI_AGENT_TASKS`, `DEFI_AGENT_MEMORY` | Three independent gates for quotes, scheduled tasks and stored preferences |
| `ORACLE_CHAT_X402_PAY_TO` | Destination address for paid credits. Unset disables the paywall. |
| `ORACLE_CHAT_ADMIN_KEY` | Guards provider switching and the admin panel |
| `ORACLE_CHAT_MAX_TOOL_ROUNDS` | Caps the tool loop (default 8) |
| `ORACLE_CHAT_TOOL_CHAR_BUDGET` | Caps cumulative tool output per turn (default 80,000 chars) |
| `ORACLE_CHAT_ALLOWED_ORIGINS` | Browser origins allowed to call the API. Empty means open, which is wrong in production. |

`ORACLE_CHAT_MAX_TOOL_ROUNDS` and `ORACLE_CHAT_TOOL_CHAR_BUDGET` are the two safety valves on the tool loop. The whole conversation is resent on every round, so without a character ceiling a fan-out question outgrows the context window and the provider rejects the request outright.

Provider switching, key testing, quota headroom and the daily allowances all live in the admin panel's `ai-chat` tab, guarded by `ORACLE_CHAT_ADMIN_KEY`.

## What it cannot do

- **No signing.** Quotes, launches, trades and market orders come back unsigned and expire. The chat holds no keys, cannot broadcast a transaction, and cannot resolve a market.
- **No privileged data.** Every oracle tool wraps the public [API](/api). Anything a desk can see, `curl` can see.
- **No feed for agent tokens or launched tokens.** Squidlor prices the majors and the tokenized equities. REEF reports Virtuals' own numbers and GEYSER reports DEX pool prints, and both say whose they are.
- **No Base feeds through the oracle tools yet.** The published tool package knows `arbitrum` and `robinhood`. Base feeds are on the [HTTP API](/api) and the [hub](/products/hub) reads them from there.
- **No wallet-level Virtuals data.** Virtuals exposes no holder endpoint, so "which wallets bought early" is not answerable, and REEF says that rather than substituting a token's price change for it.
- **No unsourced numbers.** By construction. A figure with no tool call behind it is a bug, not a feature.
