---
title: Deployed addresses
description: Every live Squidlor contract address on Arc, generated from the deployment manifest.
---

Generated from `scripts/chains/arc-testnet.deployed.json` on 2026-09-15. Do not edit by hand: `scripts/render-env.sh --chain arc-testnet` rewrites this page.

## Arc (5042002)

Explorer: `https://testnet.arcscan.app`. RPC: `https://rpc.testnet.arc.io`. Gas token: USDC.

Deployer and owner of every contract below: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`

### Aggregators (read these)

Each address is a `SquidlorOracleAggregator` implementing Chainlink's `AggregatorV3Interface` at 8 decimals, `MEDIAN` mode.

| Pair | Aggregator | Sources |
| --- | --- | --- |
| BTC/USD | `0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21` | squidlor `0xD4D74F9c619D00777C48B6273b5eA1faf2bdB686` |
| ETH/USD | `0x0995c64eE3d3AA01B2e581CbcAed601A53E1deB0` | squidlor `0xaAAF49e287342B0a61B5f9602Fa4030efc07Ebc1` |
| SOL/USD | `0x5df475576f0Ee6e4537c1538C3D0C422d1d1E021` | squidlor `0x473c2bdCf237c009EcEFBad7a8cE6e6A7eA8b628` |
| NVDA/USD | `0xa5dDb1FAaf09D6bCaFDDa13AFed239056EE5417E` | squidlor `0xAa5b50D3eB93FcDFb48E26bAa4F9315E878e422d` |
| TSLA/USD | `0x12AeA54771C43CB6A0d393B930c642F28389210B` | squidlor `0x81b109e67850C3aD43DB7294941693f8D602Ff32` |
| AAPL/USD | `0x05292d70254f9309D731B5Ba93AE7a53710d469B` | squidlor `0x9764A728Aa5524C0845e0a945843760654a1553D` |
| GOOGL/USD | `0x580587a72F84740A13C920ACb7cd356596b2D1ad` | squidlor `0x73B046fC74FbB5d306D5431E2D814E0d5E17222b` |

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
| AggregatorRegistry (UUPS proxy) | `0x610cC0E643dF3DC452929cfD0A4ADCdDB406B587` |

### Prediction market

| Contract | Address |
| --- | --- |
| ConditionalTokens | `0x0bC4E8dCe77e25A8219EA7794281a2E355484fA5` |
| FPMMFactory | `0x870DdB6F14B5926C56DB74F52Ce06800A8795909` |
| MarketFactory | `0xb64a411dF119E1E2a8b18812fD1512b48CF29Bb2` |
| SquidlorPriceResolver | `0xEcd3Da639CDbD837350ebd580F6dF388573E1418` |
| AdminResolver | `0xa3F54e9963185819Db7DC166181b9977c834b607` |
| SquidlorUSD | `0xFaCe2ABF0C7CCDa15252F7020fAA24FC65c15540` |
| SubsidyVault | `0x3F898b06764686d49b602967fB00610d0A05E6E8` |
| SquidlorRegistry | `0x3D03C75f76dd90505aA2061B95aDB9b74216Dd30` |
| FPMMRelay (proxy) | `0x69fD7B3B6050512f7d7B7dE42190e86BD3f4874E` |
| NettingRelay (proxy) | `0xE4CA129bCB8Dd050d7892b165615f54A1652bd75` |

## Verifying an address

Never trust a documentation table for something that moves money. Confirm on-chain first:

```bash
cast call 0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21 "description()(string)" --rpc-url https://rpc.testnet.arc.io
cast call 0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21 "peek()(int256,uint256,uint256)" --rpc-url https://rpc.testnet.arc.io
```

