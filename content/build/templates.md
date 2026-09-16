---
title: Templates
description: Five starter repos (agent, ACP offering, lending example, resolver, price widget), each runnable from its README.
---

Working starting points rather than snippets. Each is a standalone repo with its own README, tests and a live-feed smoke check.

## `squidlor-agent-starter`

An AI agent wired to the [MCP server](/build/quickstart-agents), with a price-alert loop as the worked example.

Shows the thing most agent code gets wrong: putting publish time and healthy-source count into the model's context alongside the price, so it cannot reason about a stale weekend equity quote as if it were live.

```bash
git clone https://github.com/squidlor/squidlor-agent-starter
cd squidlor-agent-starter && npm install
export SQUIDLOR_API_KEY=sq_live_...   # optional
npm start
```

**Use it for:** trading bots, monitoring agents, anything conversational over market data.

## `squidlor-virtuals-acp`

Wraps Squidlor feeds as an [ACP](https://whitepaper.virtuals.io) offering so a Virtuals agent can sell oracle-powered services (price checks, cross-source verification, freshness attestations) to other agents.

**Use it for:** turning oracle access into an agent-to-agent revenue surface.

## `squidlor-lending-example`

A Foundry project implementing stock-collateral lending against `NVDA/USD`, with fork tests running on live feeds.

Demonstrates the checks a real market needs, not the minimum that compiles: `peek()` for healthy-source count, a staleness bound tuned to equity market hours, and explicit handling of the aggregator's `InsufficientHealthySources` revert.

```bash
git clone https://github.com/squidlor/squidlor-lending-example
cd squidlor-lending-example && forge install
forge test --fork-url https://rpc.testnet.arc.io
```

**Use it for:** lending, perps, collateralised anything. Also the reference for [the on-chain consumer bounties](/build/bounties).

## `squidlor-resolver-template`

An `IResolver` implementation plus a test harness, for resolving prediction-market outcomes from a price feed or an external attestation.

**Use it for:** prediction markets, and the resolver-oracle bounty.

## `squidlor-price-widget`

An embeddable price widget in vanilla JS and React. Themeable, no build step required for the vanilla version, reads through `/value` with an optional key.

```html
<div id="squidlor-btc"></div>
<script src="https://unpkg.com/@squidlor/price-widget"></script>
<script>
  SquidlorWidget.mount('#squidlor-btc', { chain: 'arc', pair: 'BTC/USD' });
</script>
```

**Use it for:** dropping a live price into a site, docs page or dashboard.

## Contributing one

A merged template earns 1,000–10,000 points and a [showcase](/build/showcase) listing. The bar is that a stranger can clone it and have it working from the README alone, against live feeds.

Pitch it at <build@squidlor.com> before building if you want to be sure it is wanted.
