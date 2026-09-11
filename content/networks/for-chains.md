---
title: Bring Squidlor to your chain
description: For L1 and L2 teams without Chainlink, Pyth or DIA. What Squidlor deploys, what the chain provides, what it costs, how your validators become the signers, and the 30-day benchmark we offer before anyone commits.
---

This page is for the people who run a chain, not the people building on one. If you are a protocol looking to read a price, start at the [quick start](/quick-start).

Most emerging EVM chains have no production oracle. Chainlink's bring-up depends on a commercial agreement and its node operators' schedule, typically six to twelve months; Pyth needs a Wormhole route; DIA depends on its own relayer roadmap. Squidlor's whole stack deploys from a script. Robinhood Chain went live in July 2026 and Base in August 2026 with no Solidity change between them.

## What your chain gets

| Component | What it is | Interface |
| --- | --- | --- |
| `SquidlorAdapterV2` | Verifies signed price packets, stores one round per feed | Write path for the relay |
| `SquidPriceFeed`, one per asset | Chainlink-shaped view of each Squidlor feed | `AggregatorV3Interface` |
| `SquidlorOracleAggregator`, one per pair | Median of every healthy leg with per-source staleness and a minimum-healthy floor | `AggregatorV3Interface` plus `peek()` |
| Source adapters | Squidlor's feed, a local DEX TWAP, and Chainlink, Pyth, DIA, RedStone, API3, Chronicle, Stork, Supra or eOracle the day any of them arrives on your chain | `IPriceSource` |
| `AggregatorRegistry` | Pair name to aggregator address | Read |
| Off-chain | Your chain's slug on the [public API](/api), the [SDK](/integration/sdk), the [MCP tools](/ai/mcp) and [Oracle Chat](/ai/oracle-chat), a docs page like [Base](/networks/base), and the operations console | HTTPS |

Every protocol on your chain that already knows how to read a Chainlink feed reads a Squidlor feed with one address change. That is the unlock for lending, perps and prediction markets on a chain that has none of them yet.

## What the chain provides

| Requirement | Why |
| --- | --- |
| Two or three independent JSON-RPC endpoints | The relay runs an ordered failover pool. A single public endpoint throttling the simulation call once stalled pushes for four hours; see [measured performance](/oracle/evidence). |
| A gas wallet in the native token, with a named top-up owner | Pushes are relayer-paid. The onboarding script refuses to start unless the wallet holds three times the estimated cost, because a running process that cannot pay gas has caused an outage before. |
| A Blockscout-compatible explorer with contract verification | Every address we publish is verified before it is listed. |
| A written statement of finality assumptions | The relay treats a block as final when your chain says it is. |
| Optional: the address of a liquid BTC or ETH pool on a local DEX | A TWAP leg gives the aggregator a second, chain-native source before any third-party oracle arrives. |

Solidity 0.8 or later with standard `ecrecover`, standard JSON-RPC, and permissionless deployment or an allowlist slot are the only hard technical requirements. Full detail in [supported networks](/networks#what-a-new-chain-requires).

## What it costs

Gas is the small part. Measured constants from the onboarding script, which has run on four chains:

| Item | Gas |
| --- | --- |
| Adapter, proxy admin and proxy | 3.38M |
| Each price feed proxy | 1.37M |
| Each pair aggregator | 1.26M |
| Each source adapter | 0.37M |
| Registry | 1.44M |
| Wiring transactions | about 3M |
| **BTC/USD and ETH/USD with two legs each** | **about 14.5M, one time** |

Ongoing cost is one transaction per update carrying every feed. On Base that is about 289,000 gas for four feeds at a 0.5% deviation or 300-second heartbeat trigger. At a one-minute heartbeat, plan on roughly 1,500 transactions a day; at five minutes, about 300. Multiply by your chain's gas price and the answer is usually a rounding error in the native token. The exact figure for your chain, at your cadence, is a one-line calculation we do on the first call.

The real budget lines are operations and signer incentives, and they follow the same shape the incumbents use. Chainlink's Scale program has the chain cover node-operator gas and operating costs for a period under private terms. DIA funds twelve months of gas through per-chain grants. Our version:

| Phase | Squidlor provides | The chain provides |
| --- | --- | --- |
| **0. Benchmark**, 30 days | Deployment, relay, dashboard access, a written report | RPC endpoints, explorer, DEX pool addresses, reviewer wallets, and a gas grant in the native token with a large buffer that we account for and return |
| **1. Production feeds**, year one | BTC and ETH plus up to eight more pairs, your cadence, full API/SDK/MCP/chat coverage, monitoring and on-call, the hardening milestones below | A recoverable gas float and a hard-capped operations grant from the foundation; a chain representative on the ownership multisig |
| **2. Validator signers** | The signer daemon kit, onboarding, threshold raised from 1-of-1 to 2-of-3 and beyond | Three to five committed validators and a capped monthly stipend pool in the native token that phases out as consumer fees arrive |
| **3. Consumer fees** | A fee collector and per-epoch distribution, 70% to validator signers and 30% to Squidlor as a starting point | Ecosystem protocols paying feed-access fees |

Our first chain program of this shape was hard-capped at $7,000 for year one, with over 80% of it flowing back to the chain's own validators.

## Your validators as the signers

This is the part no incumbent offers, and it is also how Squidlor closes its own biggest gap. Today every Squidlor signer key is operated by Squidlor, and the [trust model](/resources/trust-model) says so plainly. The contracts already enforce M-of-N: each signer is recovered by ECDSA, checked against the authorized set with a bitmap so nobody counts twice, and the on-chain value is the median of at least `requiredSigners` independent signatures.

A validator on your chain runs one container, the signer daemon. It:

1. reads the Squidlor price stream and two or three exchange APIs itself,
2. computes its own median,
3. signs `{feedId, price, timestamp}` with a dedicated oracle key,
4. hands the signature to whichever signer holds relayer duty that epoch.

Only the broadcaster pays gas. Signers who only sign pay nothing. A lazy or compromised signer is outvoted by the median rather than trusted. Rewards are stake-weighted and participation-gated: a validator's share of the epoch pool scales with its existing stake on your chain and is collected only for updates its signature actually landed in. No new bond, no new capital lockup, and the same stake can back slashing later.

The trust story that results is symmetric and easy to say: *your chain's data, secured by your chain's validators.*

## The hardening ladder

Chain programs advance this ladder; each rung has a trigger rather than a date, and the order does not change.

| Rung | Trigger | What changes |
| --- | --- | --- |
| Dedicated relay key per chain, published | Day one of any deployment | The key that signs your feeds does nothing else |
| Freshness and wallet-balance alerting on your feeds | Before the benchmark starts | A stalled relay pages a human within minutes |
| Owner multisig including a chain representative | Start of phase 1 | No single key can reconfigure sources, windows or signers |
| `requiredSigners` 2-of-3 | Three validators onboarded | A single compromised signer cannot move the price |
| Timelock in front of the owner | First third-party protocol holding value on the feeds | Configuration changes are visible before they take effect |
| `requiredSigners` 5-of-9 and stake-backed slashing | Nine validators onboarded | Collusion becomes expensive |

## How the evaluation works

We propose the same thing to every chain: a 30-day benchmark of BTC/USD and ETH/USD on your mainnet, before any partnership announcement.

- Cadence 0.5% deviation or a five-minute heartbeat, off-chain minimum of three live venues, staleness windows published before day one.
- Metrics read straight from the public API by either side: freshness p50 and p95, deviation from exchange mid at write time, deviation from Chainlink's Base feed as an external reference, updates and gas per day, rounds refused for insufficient healthy legs, and every flagged round explained.
- Your reviewers get a read-only login to the operations console and a professional-tier API key on day one, so every number in the report is one they can reproduce.
- Day 30: a written report with the raw rounds attached, and a recommendation for the first production use case.

The [measured performance](/oracle/evidence) page is what that report looks like for Base, including the rounds where the oracle refused to answer. If the benchmark is weak, you have lost a month and no money. If it is strong, the production conversation starts from evidence.

To start, write to build@squidlor.com with your chain ID, RPC endpoints and explorer.
