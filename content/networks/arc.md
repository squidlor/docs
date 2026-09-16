---
title: Arc
description: Chain facts for Arc, Circle's L1 with USDC as the gas token. Mainnet and testnet parameters, how to connect a wallet, what Squidlor runs on each, and which one the public API serves.
---

Arc is Circle's Layer 1 and the one chain Squidlor runs on. **Arc mainnet is live, and it is what the public API, the SDK and the agent tools serve.** Arc Testnet runs the same seven pairs for anyone integrating before they go to production.

> [!IMPORTANT]
> The public API serves **mainnet only**. `https://api.squidlor.com/aggregator/v1/arc/...` returns
> chain 5042, and asking it for 5042002 returns `chain not supported`. Testnet integrators read the
> contracts directly over RPC; see [building against testnet](#building-against-testnet).

## Chain facts

These hold on both networks:

| Fact | Value |
| --- | --- |
| Gas token | **USDC**. The native balance a wallet shows (and `msg.value`, `eth_getBalance`) is an 18-decimal view; the same balance is readable as a 6-decimal ERC-20 at `0x3600000000000000000000000000000000000000`. |
| Base fee | Flat floor of 20 gwei. A transaction whose `maxFeePerGas` is under 20 gwei is dropped silently rather than rejected. |
| Blocks | About 0.5 seconds apart. Timestamps are non-decreasing and can repeat across consecutive blocks. |
| Finality | Instant on inclusion. There is no reorg window to wait out. |

And these differ:

| | Arc Mainnet | Arc Testnet |
| --- | --- | --- |
| Chain ID | **5042** (`0x13B2`) | **5042002** (`0x4CEF52`) |
| Network name | Arc | Arc Testnet |
| RPC | `https://rpc.mainnet.arc.io` | `https://rpc.testnet.arc.io` |
| Explorer | `https://explorer.arc.io` | `https://explorer.testnet.arc.io` |
| Gas USDC | Real. Fund the wallet. | Free from `https://faucet.circle.com` |
| Public API | Yes, slug `arc` or `5042` | **Not served** |
| Addresses | [deployed addresses](/networks/addresses) | Resolve from the registry, [below](#building-against-testnet) |

```bash
curl https://api.squidlor.com/aggregator/v1/arc/feeds
```

## Adding Arc to a wallet

The wallet parameters are the row values above. For Arc mainnet:

```json
{
  "chainId": "0x13B2",
  "chainName": "Arc",
  "rpcUrls": ["https://rpc.mainnet.arc.io"],
  "nativeCurrency": { "name": "USDC", "symbol": "USDC", "decimals": 18 },
  "blockExplorerUrls": ["https://explorer.arc.io"]
}
```

For Arc Testnet:

```json
{
  "chainId": "0x4CEF52",
  "chainName": "Arc Testnet",
  "rpcUrls": ["https://rpc.testnet.arc.io"],
  "nativeCurrency": { "name": "USDC", "symbol": "USDC", "decimals": 18 },
  "blockExplorerUrls": ["https://explorer.testnet.arc.io"]
}
```

`decimals` stays **18**. The native currency is USDC, but the wallet-visible balance is the 18-decimal native view, so `formatEther` on a balance and `/1e18` gas math are both correct. Reading the 6-decimal ERC-20 view for anything that credits a balance truncates.

Squidlor's own frontends read every one of these fields from their build environment, so nothing in a consumer contract changes between the two networks. Only the addresses do.

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

Arc's explorer is Blockscout. Contract pages at `https://explorer.arc.io/address/<address>` show verified source for every Squidlor contract, and a transaction is at `/tx/<hash>`. The testnet explorer is the same software at `https://explorer.testnet.arc.io`. Squidlor's own surfaces build every explorer link from the chain's configured explorer URL, so no link is hardcoded to one network.

## Building against testnet

Both networks run the same seven pairs, the same contracts and the same relays. Two differences decide how you integrate.

**The public API is mainnet only.** Every documented endpoint, every SDK call and every agent tool answers for chain 5042. There is no testnet equivalent, and no testnet slug: `/v1/5042002/feeds` returns `chain not supported`. On testnet you read the contracts yourself over `https://rpc.testnet.arc.io`, with the same ABI the [contract quickstart](/build/quickstart-contracts) uses.

**Testnet addresses are not published on this site.** [Deployed addresses](/networks/addresses) is generated from the mainnet manifest. Testnet addresses differ, and the registry is the way to get them without hardcoding anything:

```bash
# Arc Testnet registry
cast call 0x610cC0E643dF3DC452929cfD0A4ADCdDB406B587 \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://rpc.testnet.arc.io
# 0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21
```

The same call against the mainnet registry at `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` over `https://rpc.mainnet.arc.io` returns the mainnet aggregator. Writing your consumer against the registry rather than a hardcoded address is what makes promoting it from testnet to mainnet a config change.

Testnet USDC comes from `https://faucet.circle.com`. Testnet state is not carried to mainnet, and a testnet address is never reused on mainnet.

## Reading Arc from your own infrastructure

- `https://rpc.mainnet.arc.io` and `https://rpc.testnet.arc.io` are the public RPCs. Mirrors exist on dRPC, QuickNode and Alchemy (with a key). Squidlor's relay runs an ordered failover pool rather than trusting one endpoint.
- Assert `eth_chainId` before trusting any address. Squidlor has run the same contract address on more than one chain, so an address alone does not tell you which network answered.
- `PREVRANDAO` returns 0 on Arc, there are no blob (type-3) transactions, and the beacon-root contract is absent. None of Squidlor's contracts depend on any of those.
- A native transfer to `address(0)` reverts unless zero-value, and value sent to a precompile reverts.
- Multicall3 is at `0xcA11bde05977b3631167028862bE2a173976CA11`, the same address as on other EVM chains, and the deterministic CREATE2 factory at `0x4e59b44847b379578588920cA78FbF26c0B4956C` is deployed.
