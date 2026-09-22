---
title: Supported networks
description: Where Squidlor is deployed, how the API addresses the chain, and what it takes to add a new one.
---

Squidlor runs on one chain: Arc. No contract hardcodes a chain, and every off-chain service is parameterized by chain ID and RPC URL, so the deployment below is a configuration, not a property of the code.

## Deployment

| Network | Chain ID | Status |
| --- | --- | --- |
| **[Arc](/networks/arc)** | 5042 | **Live, and what everything serves.** Oracle with seven aggregators (BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL against USD), registry, both relays and the prediction market. Addresses on [deployed addresses](/networks/addresses). |
| **[Arc Testnet](/networks/arc#building-against-testnet)** | 5042002 | **Live, for integration only.** The same seven pairs and the same contracts. Not served by the public API; read it over RPC and resolve addresses from the registry. |

Every service knows the same chain:

| | Arc (5042) | Arc Testnet (5042002) |
| --- | --- | --- |
| Contracts deployed | Yes | Yes |
| On the live public API | Yes, slug `arc` | No |
| In `@squidlor/oracle-sdk` | Yes, `getFeed('arc', 'BTC/USD')` | By explicit address and client |
| Oracle tools in chat and MCP | Yes | No |
| Prediction market | Yes | Yes |

## Chain slug

The API accepts the slug `arc` or the numeric chain ID in place of `:chain`. Both mean mainnet:

```bash
# Equivalent
curl https://api.squidlor.com/aggregator/v1/arc/feeds
curl https://api.squidlor.com/aggregator/v1/5042/feeds
```

An unrecognised slug returns `404`, and `5042002` returns `chain not supported`: the API does not serve testnet. Check `chainId` in the response; it should read `5042`.

## What a new chain requires

If you run a chain and are evaluating Squidlor, [bring Squidlor to your chain](/networks/for-chains) is written for you: cost model, validator-as-signer program and the 7-day benchmark. The technical checklist follows.

Nothing that touches Solidity. Both Arc deployments went live without a contract change.

**On-chain:**

1. Deploy `SquidlorAdapterV2` and initialize the signer set.
2. Deploy one `SquidPriceFeed` proxy per asset.
3. Deploy a `SquidlorOracleAggregator` per pair.
4. Deploy source adapters, `SquidSource` for Squidlor's feed and `ChainlinkSource` where the chain has a Chainlink feed, and `addSource` them.
5. Deploy and populate `AggregatorRegistry`.
6. Optionally deploy the prediction market.

**Off-chain:**

1. Render the chain's environment block (chain ID, RPC URLs, explorer, native symbol, every address) from the deployment manifest. Every service reads the same block.
2. Point a `relay-pusher` process at the chain, on its own signer key, and fund it in the chain's gas token.

## What a chain needs to provide

| Requirement | Why |
| --- | --- |
| Solidity ≥ 0.8 and standard `ecrecover` | The verifier uses plain ECDSA, no precompiles. |
| Standard JSON-RPC | Every off-chain service speaks it and nothing else. |
| Permissionless deployment, or an allowlist slot | Contracts have to get on chain somehow. |
| A gas token the relayer can hold | Pushes are relayer-paid. On Arc that token is USDC. |
| An explorer | For verification and receipts. Arc's is Blockscout. |

One thing is helpful but not required: an existing Chainlink deployment, which gives cross-oracle aggregation something to aggregate with. Without it, a chain runs on Squidlor's own source alone until a second provider is available. That is Arc's situation today; see [Arc](/networks/arc#what-squidlor-runs-on-arc).

## Cost

The full Arc deploy, oracle plus seven aggregators plus registry plus prediction market, is about 46.8M gas. At Arc's 20 gwei floor that is about 0.94 USDC. Ongoing cost is relay gas, and one transaction updates every feed: about 0.007 USDC per push.
