---
title: Deployed addresses
description: Every live Squidlor contract address on Arc, generated from the deployment manifest.
---

Generated from `scripts/chains/arc-mainnet.deployed.json` on 2026-09-16. Do not edit by hand: `scripts/render-env.sh --chain arc-mainnet` rewrites this page.

These are **Arc mainnet (5042)**. Arc Testnet runs the same contracts at different addresses, which are not listed here; resolve them from the testnet registry, as in [building against testnet](/networks/arc#building-against-testnet).

## Arc (5042)

Explorer: `https://explorer.arc.io`. RPC: `https://rpc.mainnet.arc.io`. Gas token: USDC.

Deployer and owner of every contract below: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`

### Aggregators (read these)

Each address is a `SquidlorOracleAggregator` implementing Chainlink's `AggregatorV3Interface` at 8 decimals, `MEDIAN` mode.

| Pair | Aggregator | Sources |
| --- | --- | --- |
| BTC/USD | `0x7D86f28D1BBECf39f7BB192a1c26C7c19447E47C` | squidlor `0x12AeA54771C43CB6A0d393B930c642F28389210B` |
| ETH/USD | `0x9cEb5c840C618Ea4d219488D6b0516750A1dF3CE` | squidlor `0x05292d70254f9309D731B5Ba93AE7a53710d469B` |
| SOL/USD | `0xFF27feF2c5584Af8b13e3E630F161cc34c084E8A` | squidlor `0x580587a72F84740A13C920ACb7cd356596b2D1ad` |
| NVDA/USD | `0x5C792F2d7d350CFcA1661BC3d8d3B7F062Ed1bE5` | squidlor `0xb2876B874134Eb62757163BE87020DF32E80Bc14` |
| TSLA/USD | `0x83A54C02Cd6D01E2f722E8315F3F153f8C1dE82a` | squidlor `0x0bC4E8dCe77e25A8219EA7794281a2E355484fA5` |
| AAPL/USD | `0x0062E0D202E595024A3a9C76c1621F3683f06f19` | squidlor `0xEcd3Da639CDbD837350ebd580F6dF388573E1418` |
| GOOGL/USD | `0xf1FC679bd35cFD2155DCD3dbc9542435C2AfF2c4` | squidlor `0x3F898b06764686d49b602967fB00610d0A05E6E8` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0x0e674eeaaDB0213DE29C72aeFfD3d85E592024Bb` |
| BTC SquidPriceFeed | `0x16d03D6414c7aE8a1D2a63B1602557C1BAfFB91d` |
| ETH SquidPriceFeed | `0x01f21cc69674Ecd40a847257c405C6Dce8dEf0B9` |
| SOL SquidPriceFeed | `0x23637E2DBfe6B4c040b57F66FD043cB74B58B10E` |
| VIRTUAL SquidPriceFeed | `0x49707860769dB9f662f429713ba9C11B1437BC38` |
| NVDA SquidPriceFeed | `0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7` |
| TSLA SquidPriceFeed | `0x98bc4A5Da6AE2cAc688eb9b75eBb36649E2F65c4` |
| AAPL SquidPriceFeed | `0xDC53084F7Bf302644b98CCe8b126E285FeF27A2f` |
| GOOGL SquidPriceFeed | `0xD4D74F9c619D00777C48B6273b5eA1faf2bdB686` |
| AggregatorRegistry (UUPS proxy) | `0x3c8552764DC0f8719cC6cedab81C4659E18D9574` |

### Prediction market

| Contract | Address |
| --- | --- |
| ConditionalTokens | `0xfE6bfD335E18b0308008720C1903f52B3e1fE26d` |
| FPMMFactory | `0xF94e6c2A01aD9fDf449aA7809107DdE6Efa59a7E` |
| MarketFactory | `0x72F01a08090ddB2210232251fAB61D1A81403010` |
| SquidlorPriceResolver | `0xa8E4A797Cf85cA5882f20b0DFcd33b3b3D77c748` |
| AdminResolver | `0x69fD7B3B6050512f7d7B7dE42190e86BD3f4874E` |
| SquidlorUSD | `0xfb95f8B1fb13264028fA158739183f002110c0EA` |
| SubsidyVault | `0x710477A6Ed0B12d8C2A44029bd494905EAcCD3B8` |
| SquidlorRegistry | `0xd280A08b3F1818f10438ACba9EbA2DBE34fa9Fc5` |
| FPMMRelay (proxy) | `0x3CdAa32Ed5c6a592b7B445a8105b68239fABaAC5` |
| NettingRelay (proxy) | `0x4dc3cB450C3fa277164226093F6c30f50296a9A5` |

## Verifying an address

Never trust a documentation table for something that moves money. Confirm on-chain first:

```bash
cast call 0x7D86f28D1BBECf39f7BB192a1c26C7c19447E47C "description()(string)" --rpc-url https://rpc.mainnet.arc.io
cast call 0x7D86f28D1BBECf39f7BB192a1c26C7c19447E47C "peek()(int256,uint256,uint256)" --rpc-url https://rpc.mainnet.arc.io
```

