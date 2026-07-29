---
title: Supported networks
description: Where Squidlor is deployed, which chains the tooling knows about, and what it takes to add a new one.
---

Squidlor is chain-agnostic by construction. No contract hardcodes a chain, and every off-chain service is parameterized by chain ID and RPC URL. Deploying to a new EVM chain is an operational exercise, not a rewrite.

## Deployments

| Chain | ID | Status |
| --- | --- | --- |
| **[Robinhood Chain](/networks/robinhood-chain)** | 4663 | **Primary. Live** — oracle, aggregators, registry, and randomness. |
| Arbitrum One | 42161 | Oracle aggregators live. The source of the "Arbitrum hub" prices the relay medians. |

## Tooling coverage

Different layers know about different chains, which is worth checking before you assume a path works.

| | Robinhood (4663) | Arbitrum (42161) |
| --- | --- | --- |
| Contracts deployed | Yes | Yes |
| In `aggregator-api` source | Yes | Yes |
| On the live public API | **No** | Yes |
| In `@squidlor/oracle-sdk` | **No** | Yes |
| Randomness API endpoint | No | Yes |

> [!WARNING]
> The primary deployment is the one with the least tooling coverage right now. Robinhood Chain support exists in the API's source but is not live on `api.squidlor.com`, and the SDK does not include it at all.
>
> Until both catch up: read Robinhood Chain feeds [directly on-chain](/integration/reading-prices), or pass addresses explicitly to the [SDK](/integration/sdk#address-resolution). Addresses are in [deployed addresses](/networks/addresses).

## Chain slugs

The API and SDK accept a slug in place of a numeric chain ID:

| Slug | Chain ID |
| --- | --- |
| `arbitrum` | 42161 |
| `robinhood` | 4663 |

```bash
# Equivalent, where the chain is supported by the instance
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds
curl https://api.squidlor.com/aggregator/v1/42161/feeds
```

> [!IMPORTANT]
> An unrecognized slug silently falls back to chain 42161 rather than erroring — so a typo, or `robinhood` against an older API build, returns **Arbitrum data with an Arbitrum `chainId`**. Always check the `chainId` in the response matches what you asked for. A numeric ID the instance does not know returns a clean `chain not supported` instead.

## What a new chain requires

Nothing that touches Solidity. The Robinhood Chain launch is the proof — it required no contract changes.

**On-chain:**

1. Deploy `SquidlorAdapterV2` and initialize the signer set.
2. Deploy one `SquidPriceFeed` proxy per asset.
3. Deploy a `SquidlorOracleAggregator` per pair.
4. Deploy source adapters — `SquidSource` for Squidlor's feed, `ChainlinkSource` where the chain has a Chainlink feed — and `addSource` them.
5. Deploy and populate `AggregatorRegistry`.
6. Optionally deploy the economics and randomness contracts.

**Off-chain:**

1. Add a chain config to `aggregator-api` — chain ID, RPC URL, aggregator map.
2. Point `relay-pusher` at the chain and fund the relayer address.
3. Add the chain to the SDK's static map.

## What a chain needs to provide

| Requirement | Why |
| --- | --- |
| Solidity ≥ 0.8 and standard `ecrecover` | The verifier uses plain ECDSA — no precompiles. |
| Standard JSON-RPC | Every off-chain service speaks it and nothing else. |
| Permissionless deployment, or an allowlist slot | Contracts have to get on chain somehow. |
| A gas token the relayer can hold | Pushes are relayer-paid. |
| An explorer | For verification and receipts. |

One thing is helpful but not required: an existing Chainlink deployment, which gives cross-oracle aggregation something to aggregate with. Without it, a chain runs on Squidlor's own source alone until a second provider is available.

## Cost

The oracle deploy on Robinhood Chain came to **$0.98** in gas. Ongoing cost is relay gas, and one transaction updates every feed: five feeds landed for about $0.05.
