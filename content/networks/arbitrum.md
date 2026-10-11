---
title: Arbitrum One
description: Squidlor's oracle on Arbitrum One (chain 42161). Seven pairs, each a median of Chainlink's Arbitrum feed and Squidlor's own feed, with every contract address.
---

Squidlor's oracle has been live on Arbitrum One since October 2026. It runs the same seven pairs as [Arc](/networks/arc): BTC, ETH, SOL, NVDA, TSLA, AAPL and GOOGL against USD. Every pair is a median of two on-chain sources: Chainlink's own Arbitrum feed and Squidlor's feed.

> [!IMPORTANT]
> Read Arbitrum on-chain. The public API, the SDK and the agent tools serve Arc today, so
> `https://api.squidlor.com/aggregator/v1/42161/feeds` returns `chain not supported`.

## Chain facts

| Fact | Value |
| --- | --- |
| Chain ID | **42161** (`0xA4B1`) |
| Gas token | ETH |
| RPC | `https://arb1.arbitrum.io/rpc` |
| Explorer | `https://arbiscan.io` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

## What Squidlor runs on Arbitrum

**Oracle.** One `SquidlorAdapterV2` with seven `SquidPriceFeed` proxies and seven `SquidlorOracleAggregator` instances, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers all seven.

**Sources per aggregator.** Two: a `ChainlinkSource` that reads Chainlink's Arbitrum proxy for the pair, and a `SquidSource` that reads Squidlor's `SquidPriceFeed`. BTC, ETH and SOL run `minHealthySources = 2`, so they answer only while both legs are fresh. The four equities run `minHealthySources = 1`, so they answer from whichever leg is fresh and median both when both are.

**Relay.** Squidlor pushes on Chainlink's cadence for Base, which is looser than Chainlink's own on Arbitrum:

| Feed | Deviation | Heartbeat |
| --- | --- | --- |
| BTC | 0.1% | 20 minutes |
| ETH | 0.15% | 20 minutes |
| SOL | 0.5% | 24 hours |
| NVDA, TSLA, AAPL, GOOGL | 0.5% | 24 hours, US regular session only |

Two relay copies run in different locations. Each re-reads the chain before it sends, so one update lands once.

**Staleness windows.** Each aggregator drops a source whose last update is older than its window:

| Pair | Chainlink leg | Squidlor leg |
| --- | --- | --- |
| BTC/USD, ETH/USD | 3,600 s | 3,600 s |
| SOL/USD | 90,000 s | 90,000 s |
| Equities | 86,400 s | 345,600 s (96 hours, so the last close stays readable over a long weekend) |

## Addresses

Owner of every contract below: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`.

> [!WARNING]
> The adapter and the BTC, ETH and SOL feed proxies have the same addresses on Arbitrum, Base and
> Arc, and some other addresses repeat across chains with different roles. Assert `eth_chainId`
> before you trust any address.

### Aggregators (read these)

| Pair | Aggregator | Chainlink source | Squidlor source |
| --- | --- | --- | --- |
| BTC/USD | `0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21` | `0xD4D74F9c619D00777C48B6273b5eA1faf2bdB686` | `0x0995c64eE3d3AA01B2e581CbcAed601A53E1deB0` |
| ETH/USD | `0x805976F8b82d2A0B66747ec08039D3a796FF3Ed6` | `0x5df475576f0Ee6e4537c1538C3D0C422d1d1E021` | `0x65af89Cf250FcC7627e53Ce0c892B65d6dBbB5eF` |
| SOL/USD | `0xAa5b50D3eB93FcDFb48E26bAa4F9315E878e422d` | `0x9a4e4d5f83e3ad9568Ee2919cc0A4Ba7a4c0F735` | `0x81b109e67850C3aD43DB7294941693f8D602Ff32` |
| NVDA/USD | `0x05292d70254f9309D731B5Ba93AE7a53710d469B` | `0x9764A728Aa5524C0845e0a945843760654a1553D` | `0x580587a72F84740A13C920ACb7cd356596b2D1ad` |
| TSLA/USD | `0xfa0A9D8a8c631065c89b0b58B90aB535961321cB` | `0xb2876B874134Eb62757163BE87020DF32E80Bc14` | `0xE08191D2Ba69785079D655bA23B829a4B5029316` |
| AAPL/USD | `0x870DdB6F14B5926C56DB74F52Ce06800A8795909` | `0xb64a411dF119E1E2a8b18812fD1512b48CF29Bb2` | `0xa3F54e9963185819Db7DC166181b9977c834b607` |
| GOOGL/USD | `0x3F898b06764686d49b602967fB00610d0A05E6E8` | `0x601E156bc7A8B79584886a8C9f36Dc80a29B434e` | `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0x0e674eeaaDB0213DE29C72aeFfD3d85E592024Bb` |
| BTC SquidPriceFeed | `0x16d03D6414c7aE8a1D2a63B1602557C1BAfFB91d` |
| ETH SquidPriceFeed | `0x01f21cc69674Ecd40a847257c405C6Dce8dEf0B9` |
| SOL SquidPriceFeed | `0x23637E2DBfe6B4c040b57F66FD043cB74B58B10E` |
| NVDA SquidPriceFeed | `0x49707860769dB9f662f429713ba9C11B1437BC38` |
| TSLA SquidPriceFeed | `0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7` |
| AAPL SquidPriceFeed | `0x98bc4A5Da6AE2cAc688eb9b75eBb36649E2F65c4` |
| GOOGL SquidPriceFeed | `0xDC53084F7Bf302644b98CCe8b126E285FeF27A2f` |
| AggregatorRegistry (UUPS proxy) | `0xF94e6c2A01aD9fDf449aA7809107DdE6Efa59a7E` |

There is no prediction market on Arbitrum.

## Read a price

```bash
cast call 0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21 \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://arb1.arbitrum.io/rpc
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0xF94e6c2A01aD9fDf449aA7809107DdE6Efa59a7E \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://arb1.arbitrum.io/rpc
```

`peek()` returns the median, the freshest publish time and the number of healthy sources, and reverts with `InsufficientHealthySources` when fewer than `minHealthySources` legs are fresh. The [contract quickstart](/build/quickstart-contracts) shows the full consumer.
