---
title: Oracle Chat
description: A multi-persona chat interface over live oracle state, where every number stated must come from a tool call made in that session.
---

Oracle Chat is a web chat UI where four persona agents answer questions about oracle state in plain English. The hard rule: **every number in a reply must come from a live tool call made in that session.**

> [!NOTE]
> Built and actively developed, but not yet part of the production topology. It runs locally today.

## The four personas

Each persona has its own system prompt and its own subset of tools, so it is competent at one thing rather than mediocre at everything.

| Agent | Role | Focus |
| --- | --- | --- |
| **KRAKEN** | Alpha desk | Live prices, cross-oracle comparison, market takes |
| **INK** | Chartist | History, OHLC candles, ranges, volatility |
| **ABYSS** | Auditor | Audit-trail forensics — deviations in bps, stale feeds, flagged rounds |
| **PEARL** | Stocks desk | Tokenized equities (NVDA, TSLA, AAPL, GOOGL), around the clock |

ABYSS is the one worth knowing about. Audit forensics is the hardest question to answer from raw JSON, and the easiest to phrase in a sentence:

```text
Which BTC sources deviated more than 50 bps in the last 24 hours,
and did any of them go stale at the same time?
```

## Tools

Eight tools, seven shared with the [MCP server](/ai/mcp) plus a UI-only `render_live_chart`. All hit the aggregator API's chain-scoped surface:

```text
/feeds
/feeds/{PAIR}/value
/feeds/{PAIR}          (per-source breakdown)
/feeds/{PAIR}/history
/feeds/{PAIR}/ohlc
/feeds/{PAIR}/audit
/events
```

Pairs use underscore form (`BTC_USD`), and payloads are clamped to 24,000 characters before reaching the model — a long audit window would otherwise blow the context budget.

## Providers

Runtime-switchable, tried in order `[active, fallback]`:

| Provider | Model |
| --- | --- |
| Gemini | `gemini-flash-lite-latest` — **default active** |
| OpenAI | `gpt-4o-mini` — **default fallback** |
| Groq | `llama-3.3-70b-versatile` |
| Anthropic | `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5` |

Fallback triggers only if the active provider errors **before any text has been emitted** — once a response has started streaming, switching mid-answer would produce something incoherent. Every response is tagged with the provider that answered.

> [!NOTE]
> The repo's README frames Claude as the headline model, while the default-active provider in code is Gemini with OpenAI as fallback. Worth reconciling if external messaging says "powered by Claude."

## Request flow

```text
POST /api/chat { agentId, messages[] }
  → resolve agent + persona
  → open SSE stream
  → try providers in order [active, fallback]
  → tool loop (bounded by ORACLE_CHAT_MAX_TOOL_ROUNDS)
  → stream text
```

SSE event types:

| Event | Meaning |
| --- | --- |
| `meta` | Session and agent metadata |
| `text` | A token chunk |
| `tool_start` | A tool call has begun — the UI shows it |
| `tool_end` | The tool returned |
| `provider_fallback` | The active provider failed; the fallback took over |
| `done` | Stream complete |
| `error` | Stream failed |

Surfacing `tool_start` and `tool_end` in the UI is a deliberate transparency choice. The user sees *which* endpoint was called for a number, which is what makes the tool-grounding rule verifiable rather than merely claimed.

## Stack

An npm-workspaces monorepo:

- **`server`** — Express with the Anthropic and OpenAI SDKs.
- **`web`** — React and Vite. Sidebar agent switcher, streaming thread, floating composer. Conversations persist in `localStorage`.

## Running it

```bash
npm run dev
# server → :5030
# web    → :5031 (proxies /api)
```

### Environment

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `GEMINI_API_KEY` | Gemini provider |
| `OPENAI_API_KEY` | OpenAI provider |
| `GROQ_API_KEY` | Groq provider |
| `ORACLE_CHAT_MODEL` | Override the default model |
| `AGGREGATOR_API_URL` | Where the tools read from |
| `ORACLE_CHAT_PORT` | Server port (default 5030) |
| `ORACLE_CHAT_ADMIN_KEY` | Guards provider switching |
| `ORACLE_CHAT_MAX_TOOL_ROUNDS` | Caps the tool loop |

`ORACLE_CHAT_MAX_TOOL_ROUNDS` is the safety valve on the tool loop: without a bound, a model that keeps deciding it needs one more data point can spend a long time and a lot of tokens on a single question.

Provider switching is exposed in the admin panel's `ai-chat` tab, guarded by `ORACLE_CHAT_ADMIN_KEY`.

## What it cannot do

- **No trading.** Read-only. It cannot place an order, create a market, or resolve anything.
- **No privileged data.** Every tool is a wrapper over the public [API](/api). Anything it can see, `curl` can see.
- **No unsourced numbers.** By construction — a figure with no tool call behind it is a bug, not a feature.
