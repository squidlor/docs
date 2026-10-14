---
title: Hemi
description: Squidlor's oracle on Hemi (chain 43111). BTC, ETH, HEMI, hemiBTC, VUSD, sVUSD and four US stocks, with 2-of-3 signing and RedStone as a second source for BTC, ETH and HEMI.
---

Squidlor runs ten feeds on Hemi mainnet: BTC, ETH and HEMI against USD; hemiBTC against USD; Vetro's VUSD and sVUSD against USDC; and NVDA, TSLA, AAPL and GOOGL against USD in US market hours. Every update needs two independent signatures. BTC, ETH and HEMI also median RedStone's push feed on Hemi with Squidlor's.

> [!IMPORTANT]
> Read Hemi on-chain. The public API, the SDK and the agent tools serve Arc, so
> `https://api.squidlor.com/aggregator/v1/43111/feeds` returns `chain not supported`.

## Chain facts

| Fact | Hemi |
| --- | --- |
| Chain ID | **43111** (`0xa867`) |
| Gas token | ETH |
| RPC | `https://rpc.hemi.network/rpc` |
| Explorer | `https://explorer.hemi.xyz` |
| Block time | 12 seconds |

## What Squidlor runs on Hemi

**Oracle.** `SquidlorAdapterV2` with a `SquidPriceFeed` proxy per feed and a `SquidlorOracleAggregator` per pair, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers all ten.

**Sources per aggregator.**

| Pair | On-chain sources | `minHealthySources` |
| --- | --- | --- |
| BTC/USD, ETH/USD, HEMI/USD | 2: RedStone's Hemi push feed and Squidlor | 1 |
| hemiBTC/USD, VUSD/USDC, sVUSD/USDC | 1: Squidlor | 1 |
| NVDA, TSLA, AAPL, GOOGL against USD | 1: Squidlor | 1 |

With both sources fresh, a two-source pair returns their median. If one goes stale, the pair keeps answering from the other.

**How each Hemi-specific feed is priced.**

| Feed | Method |
| --- | --- |
| HEMI/USD | Median of Binance, Gate and MEXC HEMI/USDT. At least two venues must answer. |
| hemiBTC/USD | BTC/USD while hemiBTC's markets (the Sushi hemiBTC/WETH pool on Hemi, 30-minute TWAP, and Vetro's Curve VUSD/hemiBTC pool on Ethereum, EMA) trade within 1% of BTC. Above BTC it is capped at BTC. A discount larger than 1% is published only when both markets agree on it. |
| VUSD/USDC | Vetro's Curve VUSD/crvUSD pool times the Curve crvUSD/USDC pool, both on Ethereum, using each pool's EMA price oracle. The pools' spot quotes must agree with the EMA within 0.5% or the feed is not signed. |
| sVUSD/USDC | The sVUSD vault's `convertToAssets(1e18)` on Ethereum (VUSD per share) times VUSD/USDC. The Curve crvUSD/sVUSD pool is a guard, not the price. |

VUSD and sVUSD on Hemi are LayerZero OFTs of the Ethereum tokens, so the Ethereum markets and vault set their value. When a rule above cannot be met, the relay does not sign that feed, and the value on-chain ages until the staleness window decides.

**Signing and governance.**

| Control | Setting |
| --- | --- |
| Signatures per update | 2 of 3 authorised signers (`requiredSigners = 2`) |
| Authorised signers | `0x94d89f2C7F0fa43fED39Bd07bE04a1606CD669C9`, `0x4DE39e31B8353a0A8Fb5D6b0A3ae1859e89A7FDF`, `0x458416DC049F3da5F5D193715bf9B710c94C4249` |
| Owner of the adapter, every aggregator and the registry | The deployer, `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a` |

**Relay.** Two relays run in two locations each, coordinated so that one push lands per update. Each relay pays its own gas.

| Feeds | Deviation | Heartbeat |
| --- | --- | --- |
| BTC, ETH, HEMI, hemiBTC, VUSD, sVUSD | 0.1% | 15 minutes |
| NVDA, TSLA, AAPL, GOOGL | 0.1% | 15 minutes, in the US regular session |

**Staleness windows.**

| Leg | Window |
| --- | --- |
| Squidlor, crypto pairs | 2,700 seconds, three heartbeats |
| Squidlor, stock pairs | 96 hours, so the last close stays readable over weekends |
| RedStone (BTC, ETH, HEMI) | 7 hours. RedStone updates on Hemi at 0.5% or 6 hours. |

## Addresses

> [!WARNING]
> The adapter has the same address on Arc, Base, Arbitrum One and Hemi, and several other Hemi
> addresses exist on those chains as **different** contracts. Assert `eth_chainId` is `43111`
> before you trust any address below.

### Aggregators (read these)

| Pair | Aggregator |
| --- | --- |
| BTC/USD | `0x5df475576f0Ee6e4537c1538C3D0C422d1d1E021` |
| ETH/USD | `0x9a4e4d5f83e3ad9568Ee2919cc0A4Ba7a4c0F735` |
| HEMI/USD | `0x9764A728Aa5524C0845e0a945843760654a1553D` |
| hemiBTC/USD | `0xb2876B874134Eb62757163BE87020DF32E80Bc14` |
| VUSD/USDC | `0x0bC4E8dCe77e25A8219EA7794281a2E355484fA5` |
| sVUSD/USDC | `0xEcd3Da639CDbD837350ebd580F6dF388573E1418` |
| NVDA/USD | `0x3F898b06764686d49b602967fB00610d0A05E6E8` |
| TSLA/USD | `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` |
| AAPL/USD | `0xF94e6c2A01aD9fDf449aA7809107DdE6Efa59a7E` |
| GOOGL/USD | `0x69fD7B3B6050512f7d7B7dE42190e86BD3f4874E` |

The registry names are `BTC/USD`, `ETH/USD`, `HEMI/USD`, `HEMIBTC/USD`, `VUSD/USDC`, `SVUSD/USDC`, `NVDA/USD`, `TSLA/USD`, `AAPL/USD` and `GOOGL/USD`.

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0x0e674eeaaDB0213DE29C72aeFfD3d85E592024Bb` |
| BTC SquidPriceFeed | `0x16d03D6414c7aE8a1D2a63B1602557C1BAfFB91d` |
| ETH SquidPriceFeed | `0x01f21cc69674Ecd40a847257c405C6Dce8dEf0B9` |
| HEMI SquidPriceFeed | `0x23637E2DBfe6B4c040b57F66FD043cB74B58B10E` |
| HEMIBTC SquidPriceFeed | `0x49707860769dB9f662f429713ba9C11B1437BC38` |
| VUSD SquidPriceFeed | `0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7` |
| SVUSD SquidPriceFeed | `0x98bc4A5Da6AE2cAc688eb9b75eBb36649E2F65c4` |
| NVDA SquidPriceFeed | `0xDC53084F7Bf302644b98CCe8b126E285FeF27A2f` |
| TSLA SquidPriceFeed | `0xD4D74F9c619D00777C48B6273b5eA1faf2bdB686` |
| AAPL SquidPriceFeed | `0x0995c64eE3d3AA01B2e581CbcAed601A53E1deB0` |
| GOOGL SquidPriceFeed | `0x805976F8b82d2A0B66747ec08039D3a796FF3Ed6` |
| AggregatorRegistry (UUPS proxy) | `0x62d732d96afb0199c96cf23B4C5dDc7b8AAd722A` |
| ProxyAdmin | `0x5007E3b012983D6A74c84A5D9b31F1d28621Bb5d` |

### Source adapters

| Pair | SquidSource | RedStoneSource |
| --- | --- | --- |
| BTC/USD | `0xa5dDb1FAaf09D6bCaFDDa13AFed239056EE5417E` | `0x473c2bdCf237c009EcEFBad7a8cE6e6A7eA8b628` |
| ETH/USD | `0x7DADEEC6665D330b35e38C18bdF270ABd34d92be` | `0x12AeA54771C43CB6A0d393B930c642F28389210B` |
| HEMI/USD | `0x73B046fC74FbB5d306D5431E2D814E0d5E17222b` | `0x2597340cE638734845c6DaEfE211D3C58a1CCA4f` |
| hemiBTC/USD | `0x610cC0E643dF3DC452929cfD0A4ADCdDB406B587` | |
| VUSD/USDC | `0x870DdB6F14B5926C56DB74F52Ce06800A8795909` | |
| sVUSD/USDC | `0xa3F54e9963185819Db7DC166181b9977c834b607` | |
| NVDA/USD | `0x601E156bc7A8B79584886a8C9f36Dc80a29B434e` | |
| TSLA/USD | `0x42F58FB5989C21cc87740c92C8d4FaA8883CA929` | |
| AAPL/USD | `0x72F01a08090ddB2210232251fAB61D1A81403010` | |
| GOOGL/USD | `0xfb95f8B1fb13264028fA158739183f002110c0EA` | |

## Read a price

```bash
cast call 0x5df475576f0Ee6e4537c1538C3D0C422d1d1E021 \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://rpc.hemi.network/rpc
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0x62d732d96afb0199c96cf23B4C5dDc7b8AAd722A \
  "getAggregatorByName(string)(address)" "VUSD/USDC" \
  --rpc-url https://rpc.hemi.network/rpc
```

`peek()` returns the live median, its newest publish time and the number of healthy sources, and reverts when no source is fresh. A stock pair reads the last close outside US market hours.
