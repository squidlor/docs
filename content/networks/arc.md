---
title: Arc
description: Chain facts for Arc, Circle's L1 with USDC as the gas token. How to connect a wallet, where to get testnet USDC, what Squidlor runs there, and how testnet and mainnet differ.
---

Arc is Circle's Layer 1 and the one chain Squidlor runs on. Every Squidlor contract, the relay, the public API, the SDK, the agent tools and the prediction market address a single Arc deployment per build. Squidlor moved to Arc on 2026-09-15, first on Arc Testnet; Arc mainnet launches on 2026-09-16.

## Chain facts

| Fact | Value |
| --- | --- |
| Gas token | **USDC**. The native balance a wallet shows (and `msg.value`, `eth_getBalance`) is an 18-decimal view; the same balance is readable as a 6-decimal ERC-20 at `0x3600000000000000000000000000000000000000`. |
| Base fee | Flat floor of 20 gwei. A transaction whose `maxFeePerGas` is under 20 gwei is dropped silently rather than rejected. |
| Blocks | About 0.5 seconds apart. Timestamps are non-decreasing and can repeat across consecutive blocks. |
| Finality | Instant on inclusion. There is no reorg window to wait out. |
| Testnet chain ID | **5042002** (`0x4D0012`), label "Arc Testnet" |
| Testnet RPC | `https://rpc.testnet.arc.io` |
| Testnet explorer | `https://testnet.arcscan.app` (Blockscout) |
| Testnet faucet | `https://faucet.circle.com` |
| Mainnet | Launches 2026-09-16. Chain ID, RPC and explorer are published by [docs.arc.io](https://docs.arc.io); this site does not repeat them until they are. |
| API slug | `arc` |

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds
```

## Adding Arc to a wallet

The wallet parameters are the row values above. For Arc Testnet:

```json
{
  "chainId": "0x4D0012",
  "chainName": "Arc Testnet",
  "rpcUrls": ["https://rpc.testnet.arc.io"],
  "nativeCurrency": { "name": "USDC", "symbol": "USDC", "decimals": 18 },
  "blockExplorerUrls": ["https://testnet.arcscan.app"]
}
```

`decimals` stays **18**. The native currency is USDC, but the wallet-visible balance is the 18-decimal native view, so `formatEther` on a balance and `/1e18` gas math are both correct. Reading the 6-decimal ERC-20 view for anything that credits a balance truncates.

For mainnet, take the same shape and fill it from docs.arc.io once the values are published. Squidlor's own frontends read every one of these fields from their build environment, so there is nothing to change in a consumer contract between the two.

## Gas, in dollars

Because the gas token is USDC, every gas figure on Arc is already a dollar figure. At the 20 gwei floor:

| Action | Gas | Cost |
| --- | --- | --- |
| Full Squidlor deploy: oracle, seven aggregators, registry, prediction market | about 46.8M | about 0.94 USDC |
| One relay push carrying every feed | about 350k | about 0.007 USDC |
| One 15-minute prediction-market round, created and resolved | | about 0.07 USDC |

Gas is not a budget line on Arc. Funding the deployer and the relay wallet is.

> [!WARNING]
> Pin the gas price at or above the floor. Configurations carried over from cheaper chains pin 0.05 to 0.15 gwei, which is 100x under Arc's floor: the transaction never lands and never errors. Use 25 gwei, or let your client use EIP-1559 estimation.

## What Squidlor runs on Arc

**Oracle.** One `SquidlorAdapterV2` with seven `SquidPriceFeed` proxies and seven `SquidlorOracleAggregator` instances, all 8-decimal `MEDIAN`, one per pair: BTC/USD, ETH/USD, SOL/USD, NVDA/USD, TSLA/USD, AAPL/USD, GOOGL/USD. `AggregatorRegistry` registers all seven. Every address is on [deployed addresses](/networks/addresses), generated from the deployment manifest so it cannot drift.

**Sources per aggregator.** Nobody has published Arc feed addresses for any push oracle yet, so each aggregator starts with **one on-chain source, Squidlor's own feed**, at `minHealthySources = 1`. Cross-checking against other venues still happens, but off-chain: the relay medians several exchanges before it signs, so the value stored on Arc is a median anchored by one contract rather than an on-chain median of two oracle networks. When Chainlink or RedStone publish Arc feeds, a second source is one `addSource` call on the live aggregator and `minHealthySources` goes to 2. The [trust model](/resources/trust-model) states what this means for a consumer.

**Relay.** Two processes on separate signer keys. The crypto relay pushes BTC, ETH and SOL on a 0.5% deviation or 300-second heartbeat; the equity relay pushes NVDA, TSLA, AAPL and GOOGL during the US regular session, 09:30 to 16:00 ET, medianing four market-data APIs. Both read the venue median the [realtime price stream](/api/realtime) publishes every second.

**Prediction market.** `MarketFactory`, `ConditionalTokens`, the FPMM factory, `SquidlorPriceResolver`, sqUSD, the subsidy vault and the netting relay are all on Arc. See [prediction markets](/products/markets).

## Explorer and verification

Arc's explorer is Blockscout. Contract pages at `https://testnet.arcscan.app/address/<address>` show verified source for every Squidlor contract, and a transaction is at `/tx/<hash>`. Squidlor's own surfaces build every explorer link from the chain's configured explorer URL, so the same links point at the mainnet explorer after 09-16 without a code change.

## Testnet and mainnet

Squidlor runs on exactly one Arc network per build. Today that is Arc Testnet, and the [deployed addresses](/networks/addresses) page names which network it was generated for. When mainnet goes live, the contracts are redeployed there, the manifest is regenerated and that page changes with it; testnet addresses are not reused on mainnet.

Testnet USDC comes from `https://faucet.circle.com`. Testnet state is not carried to mainnet.

## Reading Arc from your own infrastructure

- `https://rpc.testnet.arc.io` is the public RPC. Mirrors exist on dRPC, QuickNode and Alchemy (with a key). Squidlor's relay runs an ordered failover pool rather than trusting one endpoint.
- `PREVRANDAO` returns 0 on Arc, there are no blob (type-3) transactions, and the beacon-root contract is absent. None of Squidlor's contracts depend on any of those.
- A native transfer to `address(0)` reverts unless zero-value, and value sent to a precompile reverts.
- Multicall3 is at `0xcA11bde05977b3631167028862bE2a173976CA11`, the same address as on other EVM chains, and the deterministic CREATE2 factory at `0x4e59b44847b379578588920cA78FbF26c0B4956C` is deployed.
