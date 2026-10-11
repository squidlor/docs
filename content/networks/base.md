---
title: Base
description: Squidlor's oracle on Base (chain 8453). Seven pairs, each a median of Chainlink's Base feed and Squidlor's own feed, with every contract address.
---

Squidlor's oracle is live on Base, with the same seven pairs as [Arc](/networks/arc): BTC, ETH, SOL, NVDA, TSLA, AAPL and GOOGL against USD. Every pair is a median of two on-chain sources: Chainlink's own Base feed and Squidlor's feed. The equity pairs use Chainlink's feeds for Coinbase's tokenized stocks on Base (NVDAc, TSLAc, AAPLc, GOOGLc), which report total return.

> [!IMPORTANT]
> Read Base on-chain. The public API, the SDK and the agent tools serve Arc today, so
> `https://api.squidlor.com/aggregator/v1/8453/feeds` returns `chain not supported`.

## Chain facts

| Fact | Value |
| --- | --- |
| Chain ID | **8453** (`0x2105`) |
| Gas token | ETH |
| RPC | `https://mainnet.base.org` |
| Explorer | `https://basescan.org` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

## What Squidlor runs on Base

**Oracle.** One `SquidlorAdapterV2` with a `SquidPriceFeed` proxy per asset and a `SquidlorOracleAggregator` per pair, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers every pair. A VIRTUAL/USD aggregator from August 2026 is still registered and reads Chainlink's VIRTUAL feed, but Squidlor no longer pushes VIRTUAL on Base.

**Sources per aggregator.** Two: a `ChainlinkSource` and a `SquidSource`. BTC, ETH and SOL run `minHealthySources = 2`, so they answer only while both legs are fresh. The four equities run `minHealthySources = 1`.

**Relay.** Squidlor pushes on the same cadence Chainlink uses on Base:

| Feed | Deviation | Heartbeat |
| --- | --- | --- |
| BTC | 0.1% | 20 minutes |
| ETH | 0.15% | 20 minutes |
| SOL | 0.5% | 24 hours |
| NVDA, TSLA, AAPL, GOOGL | 0.5% | 24 hours, US regular session only |

Two relay copies run in different locations. Each re-reads the chain before it sends, so one update lands once.

**Staleness windows:**

| Pair | Chainlink leg | Squidlor leg |
| --- | --- | --- |
| BTC/USD, ETH/USD | 3,600 s | 3,600 s |
| SOL/USD | 90,000 s | 90,000 s |
| Equities | 86,400 s | 345,600 s (96 hours) |

Chainlink's Base equity feeds go quiet after the Friday close. The 96-hour window on Squidlor's leg keeps the last close readable through the weekend.

## Addresses

Owner of every contract below: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`.

> [!WARNING]
> The adapter and the BTC, ETH and SOL feed proxies have the same addresses on Base, Arbitrum and
> Arc, and some other addresses repeat across chains with different roles. Assert `eth_chainId`
> before you trust any address.

### Aggregators (read these)

The current aggregators date from October 2026. They replaced the August 2026 set so that `latestRoundData().updatedAt` reports the freshest publish time; the registry points at the new ones.

| Pair | Aggregator | Chainlink source | Squidlor source |
| --- | --- | --- | --- |
| BTC/USD | `0x72D7Abba8fBDE9A9723D321FcDd381CD0924E032` | `0x49707860769dB9f662f429713ba9C11B1437BC38` | `0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7` |
| ETH/USD | `0xf6ef70514F5ad9963b5f9694c201f2df62d307bE` | `0x80182bfe4405B0101Fa56ea112d08b54EcD33e5e` | `0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21` |
| SOL/USD | `0x8FB8876b14CB7a1d5B43bcf6BB82910b2857d383` | `0x0995c64eE3d3AA01B2e581CbcAed601A53E1deB0` | `0x805976F8b82d2A0B66747ec08039D3a796FF3Ed6` |
| NVDA/USD | `0x01A6356535039F9fC48D2C50cff6E2029E6e2F6c` | `0x240456f0b18361c9382daCBdd78fc2A894245539` | `0xBCfd729810DDAC91AE787Fc2A3DEcc79b9De9AAf` |
| TSLA/USD | `0x1C064c09f015becA78371319eEC5E13eaD0E9f85` | `0xf0372175D39FA26F719d0A77c3D63508b8c76437` | `0xa9e5Fef09E3612c652b4E54C64a57590afE08cf5` |
| AAPL/USD | `0xAa8BD328E6381420D836666D120d909d980c8A59` | `0x8391af423Ce130A01c1923CC3caD55754BcDA151` | `0xcE3A4241e3fD8D79E22CD7AC53fB748768ee217D` |
| GOOGL/USD | `0xF23cF56478623b171403035c901B2B9b8A635eC4` | `0x11A080dbCd31e9E597591f958B4BED49C83FB24d` | `0xD37958Ac12E51EACAE641537572e40eD0354a204` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0x0e674eeaaDB0213DE29C72aeFfD3d85E592024Bb` |
| BTC SquidPriceFeed | `0x16d03D6414c7aE8a1D2a63B1602557C1BAfFB91d` |
| ETH SquidPriceFeed | `0x01f21cc69674Ecd40a847257c405C6Dce8dEf0B9` |
| SOL SquidPriceFeed | `0x23637E2DBfe6B4c040b57F66FD043cB74B58B10E` |
| NVDA SquidPriceFeed | `0x1c0E3FdF32a174A73bc1a5f63bC17B999568C1d6` |
| TSLA SquidPriceFeed | `0x5AAbE5810fa59F55fd11b44E572593fD06dadAC8` |
| AAPL SquidPriceFeed | `0xe7662d69ebdDC4a3f2a0Fe6B0F351cadeeE66502` |
| GOOGL SquidPriceFeed | `0x22A60B79ffFc4FC33ed2C6bF4aed549406c67e13` |
| AggregatorRegistry (UUPS proxy) | `0x65af89Cf250FcC7627e53Ce0c892B65d6dBbB5eF` |

## Read a price

```bash
cast call 0x72D7Abba8fBDE9A9723D321FcDd381CD0924E032 \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://mainnet.base.org
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0x65af89Cf250FcC7627e53Ce0c892B65d6dBbB5eF \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://mainnet.base.org
```

The [contract quickstart](/build/quickstart-contracts) shows the full consumer.
