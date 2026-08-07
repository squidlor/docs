---
title: Robinhood Chain
description: Chain facts, RPC and explorer details, gas quirks, and what is live — Squidlor's primary oracle deployment.
---

Robinhood Chain is Squidlor's primary and most complete deployment. The oracle, aggregators, registry, and randomness contracts have been live on mainnet since 2026-07-13.

## Chain facts

| Fact | Value |
| --- | --- |
| Mainnet chain ID | **4663** (`0x1237`) |
| Testnet chain ID | 46630 |
| Mainnet RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | Blockscout — `https://robinhoodchain.blockscout.com` |
| Gas token | ETH, bridged via the canonical Arbitrum bridge |
| Chain stack | Arbitrum Orbit L2 ("Dedicated Blockchains") |
| Sequencer | Single Robinhood sequencer |
| Validators | Permissioned |
| Deployment | **Permissionless** — anyone can deploy contracts |

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
> Do not rely on automatic fee estimation here. Ethers' auto-`maxFee` calculation **underbids the base fee on this chain and the transaction stalls** — it does not fail cleanly, it simply never lands. Set the gas price explicitly.

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

Nine `SquidPriceFeed` proxies — BTC, ETH, BNB, XRP, SOL, NVDA, TSLA, AAPL, GOOGL — behind one `SquidlorAdapterV2`.

Seven `SquidlorOracleAggregator` instances, all 8-decimal, `MEDIAN` mode, `minHealthySources = 1`:

| Pair | Sources wired |
| --- | --- |
| BTC/USD | Chainlink + Squidlor |
| ETH/USD | Chainlink + Squidlor |
| SOL/USD | Squidlor only — chain 4663 has no Chainlink SOL feed |
| NVDA/USD | Chainlink only |
| TSLA/USD | Chainlink only |
| AAPL/USD | Chainlink only |
| GOOGL/USD | Chainlink only |

> [!WARNING]
> The four equity aggregators are Chainlink-only. Standalone Squidlor equity feeds **are** deployed, but they have not yet been added as a second source on those aggregators — so for equities, cross-oracle aggregation is not currently in effect. See the [roadmap](/resources/roadmap).

`SquidlorAdapterV2` runs with `signers = [deployer]` and `required = 1` — a single-signer bootstrap, not yet a multisig.

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
| `relay-pusher` | Crypto medians on a **0.5% deviation or 1h heartbeat** trigger; equity medians on the same trigger, during US market hours only. |
| `aggregator-api` | **Live** at `api.squidlor.com/aggregator/v1/robinhood/…` — all 7 feeds (BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL against USD). |

The first relay push landed five feeds in one transaction — roughly 522k gas, about **$0.05**. Steady state is cheaper, because the storage slots are already warm: **~351k gas** for the same five feeds, about **$0.013** at 0.02 gwei. For comparison, a Chainlink OCR transmit on this chain is 120–132k gas for one feed (~$0.0045), so per feed the batched push is the cheaper of the two.

## Deployment cost

| Component | Cost |
| --- | --- |
| Oracle core | $0.98 |
| Everything deployed on this chain | $3.99 |

Two orphaned contracts from a first deploy attempt exist on-chain. They are unused and harmless.

## Why this chain

Robinhood Chain is an L2 purpose-built for tokenized real-world assets, which makes it the natural home for what Squidlor does:

**Tokenized equity oracles.** The chain has tokenized US stocks and Chainlink equity feeds. Squidlor adds an independent second source for an asset class that normally has exactly one oracle.

**Assets that actually exist on the chain.** A tokenized-equity price feed is far more useful on a chain where the tokenized equities themselves trade — consumers can price real positions rather than a reference number.

## Available but not yet used

Chainlink's reference set on 4663 carries 55 feeds. Pairs available to wire but not yet deployed against: USDG/USD, USDC/USD, USDT, LINK, MSFT, META, AMD, AMZN, SPY, QQQ.

Pyth, DIA, and RedStone are unverified as live on this chain and were deliberately left out rather than wired speculatively. Uniswap TWAP is deferred: tokenized stock trading here is 0x RFQ, not a Uniswap pool, so there is no pool to read.
