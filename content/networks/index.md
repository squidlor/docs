---
title: Supported networks
description: Where Squidlor is deployed, which chains the tooling knows about, and what it takes to add a new one.
---

Squidlor is chain-agnostic by construction. No contract hardcodes a chain, and every off-chain service is parameterized by chain ID and RPC URL. Deploying to a new EVM chain is an operational exercise, not a rewrite.

## Deployments

| Chain | ID | Status |
| --- | --- | --- |
| **[Base](/networks/base)** | 8453 | **Live, most active.** Oracle with 8 two-source aggregators, registry, the prediction market and the stock-paired launchpad. |
| **[Robinhood Chain](/networks/robinhood-chain)** | 4663 | **Live.** Oracle with 7 aggregators, registry and randomness. Squidlor's own relay there is paused, so pairs currently read their Chainlink leg alone. |
| Arbitrum One | 42161 | Oracle aggregators live, 7 pairs including EUR/USD, XAU/USD and a proof-of-reserve feed. The source of the "Arbitrum hub" prices the relay medians. |

## Tooling coverage

Different layers know about different chains, which is worth checking before you assume a path works.

| | Base (8453) | Robinhood (4663) | Arbitrum (42161) |
| --- | --- | --- | --- |
| Contracts deployed | Yes | Yes | Yes |
| On the live public API | Yes | Yes | Yes |
| In `@squidlor/oracle-sdk` (0.4.0) | No, pass `opts.address` | Yes | Yes |
| Oracle tools in chat and MCP | Not yet in the chain list | Yes | Yes |
| Prediction market | Yes | No | No |
| Randomness API endpoint | No | No | Yes |

## Chain slugs

The API accepts a slug in place of a numeric chain ID:

| Slug | Chain ID |
| --- | --- |
| `base` | 8453 |
| `robinhood` | 4663 |
| `arbitrum` | 42161 |

```bash
# Equivalent
curl https://api.squidlor.com/aggregator/v1/base/feeds
curl https://api.squidlor.com/aggregator/v1/8453/feeds
```

An unrecognised slug returns `404`. It used to fall back to Arbitrum silently; that was fixed with the builder platform launch, and the response's `chainId` is still worth checking.

## What a new chain requires

If you run a chain and are evaluating Squidlor, [bring Squidlor to your chain](/networks/for-chains) is written for you: cost model, validator-as-signer program and the 30-day benchmark. The technical checklist follows.

Nothing that touches Solidity. Robinhood Chain and Base both went live without a contract change.

**On-chain:**

1. Deploy `SquidlorAdapterV2` and initialize the signer set.
2. Deploy one `SquidPriceFeed` proxy per asset.
3. Deploy a `SquidlorOracleAggregator` per pair.
4. Deploy source adapters, `SquidSource` for Squidlor's feed and `ChainlinkSource` where the chain has a Chainlink feed, and `addSource` them.
5. Deploy and populate `AggregatorRegistry`.
6. Optionally deploy the economics and randomness contracts, and the prediction market.

**Off-chain:**

1. Add a chain config to `aggregator-api`: chain ID, RPC URL, aggregator map. Base's defaults are compiled in; Robinhood's come from the environment.
2. Point a `relay-pusher` process at the chain, on its own signer key, and fund it.
3. Add the chain to the SDK's static map and to the oracle tools' chain list.

## What a chain needs to provide

| Requirement | Why |
| --- | --- |
| Solidity ≥ 0.8 and standard `ecrecover` | The verifier uses plain ECDSA, no precompiles. |
| Standard JSON-RPC | Every off-chain service speaks it and nothing else. |
| Permissionless deployment, or an allowlist slot | Contracts have to get on chain somehow. |
| A gas token the relayer can hold | Pushes are relayer-paid. |
| An explorer | For verification and receipts. |

One thing is helpful but not required: an existing Chainlink deployment, which gives cross-oracle aggregation something to aggregate with. Without it, a chain runs on Squidlor's own source alone until a second provider is available.

## Cost

The oracle deploy on Robinhood Chain came to **$0.98** in gas. On Base at 0.05 gwei, four equity feed proxies cost 0.000258 ETH together. Ongoing cost is relay gas, and one transaction updates every feed: four feeds on Base land for about 289k gas, roughly 0.001 ETH a day at the current cadence.
