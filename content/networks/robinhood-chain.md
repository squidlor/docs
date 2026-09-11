---
title: Robinhood Chain
description: Chain facts, RPC and explorer details, gas quirks, what is live on Squidlor's first oracle deployment, and why its relay is paused.
---

Robinhood Chain was Squidlor's first production deployment. The oracle, aggregators, registry, and randomness contracts have been live on mainnet since 2026-07-13. [Base](/networks/base) has since become the more active chain, and Squidlor's own relay on 4663 is paused as of September 2026; see [what is live](#what-is-live) below.

## Chain facts

| Fact | Value |
| --- | --- |
| Mainnet chain ID | **4663** (`0x1237`) |
| Testnet chain ID | 46630 |
| Mainnet RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | Blockscout at `https://robinhoodchain.blockscout.com` |
| Gas token | ETH, bridged via the canonical Arbitrum bridge |
| Chain stack | Arbitrum Orbit L2 ("Dedicated Blockchains") |
| Sequencer | Single Robinhood sequencer |
| Validators | Permissioned |
| Deployment | **Permissionless**; anyone can deploy contracts |

The combination in those last three rows is the thing to understand about this chain: contract deployment is open to anyone, while block production and validation are not. Squidlor did not need permission to deploy, and does depend on Robinhood's sequencer for liveness.

## Adding it to a wallet

```json
{
  "chainId": "0x1237",
  "chainName": "Robinhood Chain",
  "rpcUrls": ["https://rpc.mainnet.chain.robinhood.com"],
  "nativeCurrency": { "name": "Ether", "symbol": "ETH", "decimals": 18 },
  "blockExplorerUrls": ["https://robinhoodchain.blockscout.com"]
}
```

## Gas: pin the price

Gas price is pinned at **`0.1 gwei`** in Squidlor's deploy configuration. The base fee runs around `0.052 gwei`.

> [!WARNING]
> Do not rely on automatic fee estimation here. Ethers' auto-`maxFee` calculation **underbids the base fee on this chain and the transaction stalls**. It does not fail cleanly, it simply never lands. Set the gas price explicitly.

```typescript
import { createWalletClient, http, parseGwei } from "viem";

const client = createWalletClient({
  chain: robinhoodChain,
  transport: http("https://rpc.mainnet.chain.robinhood.com"),
});

await client.sendTransaction({
  // Explicit. Automatic estimation underbids and hangs.
  gasPrice: parseGwei("0.1"),
  // …
});
```

## What is live

### Oracle

Nine `SquidPriceFeed` proxies (BTC, ETH, BNB, XRP, SOL, NVDA, TSLA, AAPL, GOOGL) behind one `SquidlorAdapterV2`.

Seven `SquidlorOracleAggregator` instances, all 8-decimal, `MEDIAN` mode, `minHealthySources = 1`:

| Pair | Sources wired |
| --- | --- |
| BTC/USD | Chainlink + Squidlor |
| ETH/USD | Chainlink + Squidlor |
| SOL/USD | Squidlor only. Chain 4663 has no Chainlink SOL feed |
| NVDA/USD | Chainlink + Squidlor |
| TSLA/USD | Chainlink + Squidlor |
| AAPL/USD | Chainlink + Squidlor |
| GOOGL/USD | Chainlink + Squidlor |

> [!WARNING]
> Squidlor's own relay on Robinhood Chain is **paused** as of September 2026. Every two-source pair reads its Chainlink leg alone (`healthyCount` 1 of 2 on the API), and SOL/USD, which has no Chainlink leg, has no healthy source and `peek()` reverts. The contracts are intact and pushes resume when the relay is turned back on; until then, treat Robinhood Chain as a Chainlink mirror with Squidlor's aggregation contract in front of it.

`SquidlorAdapterV2` runs with `signers = [deployer]` and `required = 1`, a single-signer bootstrap, not yet a multisig.

### Why the relay is paused

Two things happened, and they are the reason the Base deployment looks the way it does.

In August 2026 the equity relay on this chain stopped landing transactions because its gas wallet ran dry while the process itself kept running and reporting healthy. Nothing alerted on the wallet balance. The fix that came out of it is structural: the chain onboarding script now refuses to start a deployment unless the relayer wallet holds three times the estimated gas, and wallet-balance alerting is on the [roadmap](/resources/roadmap) as a decentralization item, not an operational nicety.

In early September 2026, when the crypto and equity relays were rebuilt on Base with a dedicated signer key per process and an RPC failover pool, the Robinhood relay was deliberately left off rather than run on the old shared key. The contracts, aggregators and wiring are intact; every two-source pair keeps serving its Chainlink leg.

It resumes when three things are true: a dedicated, funded signer key for this chain, feed-freshness and wallet-balance alerts covering 4663, and a shadow run showing what the relay would have pushed before it pushes anything. Until then this page says paused, and the API says `healthyCount: 1`.

### Registry, economics, randomness

`AggregatorRegistry` (UUPS proxy) registers all seven pairs. `RewardDistributor`, `FeeCollector`, and `SquidlorCommitRevealRandomness` are deployed with:

| Parameter | Value |
| --- | --- |
| Treasury | The deployer address |
| `treasuryBps` | 3000 (30%) |
| `epochDuration` | 86,400s (24h) |
| `revealDelayBlocks` | 5 |

Every address is in [deployed addresses](/networks/addresses).

## Off-chain services

| Service | State on chain 4663 |
| --- | --- |
| `relay-pusher` | **Paused.** When running: crypto medians on a 0.5% deviation or 1h heartbeat trigger; equity medians on the same trigger, during US market hours only. |
| `aggregator-api` | **Live** at `api.squidlor.com/aggregator/v1/robinhood/…`, all 7 feeds (BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL against USD), reporting per-source health. |

The first relay push landed five feeds in one transaction: roughly 522k gas, about **$0.05**. Steady state is cheaper, because the storage slots are already warm: **~351k gas** for the same five feeds, about **$0.013** at 0.02 gwei. For comparison, a Chainlink OCR transmit on this chain is 120–132k gas for one feed (~$0.0045), so per feed the batched push is the cheaper of the two.

## Deployment cost

| Component | Cost |
| --- | --- |
| Oracle core | $0.98 |
| Everything deployed on this chain | $3.99 |

Two orphaned contracts from a first deploy attempt exist on-chain. They are unused and harmless.

## Why this chain

Robinhood Chain is an L2 purpose-built for tokenized real-world assets, which makes it the natural home for what Squidlor does:

**Tokenized equity oracles.** The chain has tokenized US stocks and Chainlink equity feeds. Squidlor adds an independent second source for an asset class that normally has exactly one oracle.

**Assets that actually exist on the chain.** A tokenized-equity price feed is far more useful on a chain where the tokenized equities themselves trade, because consumers can price real positions rather than a reference number.

## Available but not yet used

Chainlink's reference set on 4663 carries 55 feeds. Pairs available to wire but not yet deployed against: USDG/USD, USDC/USD, USDT, LINK, MSFT, META, AMD, AMZN, SPY, QQQ.

Pyth, DIA, and RedStone are unverified as live on this chain and were deliberately left out rather than wired speculatively. Uniswap TWAP is deferred: tokenized stock trading here is 0x RFQ, not a Uniswap pool, so there is no pool to read.
