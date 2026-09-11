---
title: Deployed addresses
description: Every live Squidlor contract address, per chain and per component.
---

Robinhood Chain contracts were deployed 2026-07-13; Base contracts between 2026-08-30 and 2026-09-02. Verify any address on the chain's explorer before using it in production.

## Base (8453)

Explorer: `https://basescan.org`

Deployer and owner of every contract below: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`

### Aggregators (read these)

Each address is a `SquidlorOracleAggregator` implementing Chainlink's `AggregatorV3Interface` at 8 decimals, `MEDIAN` mode, two sources.

| Pair | Aggregator | `minHealthySources` |
| --- | --- | --- |
| BTC/USD | `0xA180DcB56057a9a4D5DA17978Dd95C6692Ae6345` | 2 |
| ETH/USD | `0x98bc4A5Da6AE2cAc688eb9b75eBb36649E2F65c4` | 2 |
| SOL/USD | `0x5f8D593C0C5Fd59D209eA618b7F211310057c6D7` | 2 |
| VIRTUAL/USD | `0x9E83e182b8f1b464D5Ee9818818AA31A0118F9d5` | 1 |
| NVDA/USD | `0xd4e034215222F327F08f4067805d055Ec3c1aD89` | 1 |
| TSLA/USD | `0xE8C828ee3C284B6e5c8dC1963827e524F80c90f9` | 1 |
| AAPL/USD | `0x111A875F39C69a1E429a3D612c33123E69339a74` | 1 |
| GOOGL/USD | `0x7786f77D50Be682bDd7bA78D39c15Ccf15Ee1197` | 1 |

### Source adapters per aggregator

| Pair | Chainlink source | Squidlor source |
| --- | --- | --- |
| BTC/USD | `0x49707860769dB9f662f429713ba9C11B1437BC38` | `0xe1f9fe8FA22D49B7345AF0Cc78149759A4B1F8c7` |
| ETH/USD | `0x80182bfe4405B0101Fa56ea112d08b54EcD33e5e` | `0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21` |
| SOL/USD | `0x0995c64eE3d3AA01B2e581CbcAed601A53E1deB0` | `0x805976F8b82d2A0B66747ec08039D3a796FF3Ed6` |
| VIRTUAL/USD | `0x8A371202195DA3575bf6Ba17bE8a213a8003B66F` | `0xD3EBa74F2DF29253A1475B270D746071a3B33bB2` |
| NVDA/USD | `0x240456f0b18361c9382daCBdd78fc2A894245539` | `0xBCfd729810DDAC91AE787Fc2A3DEcc79b9De9AAf` |
| TSLA/USD | `0xf0372175D39FA26F719d0A77c3D63508b8c76437` | `0xa9e5Fef09E3612c652b4E54C64a57590afE08cf5` |
| AAPL/USD | `0x8391af423Ce130A01c1923CC3caD55754BcDA151` | `0xcE3A4241e3fD8D79E22CD7AC53fB748768ee217D` |
| GOOGL/USD | `0x11A080dbCd31e9E597591f958B4BED49C83FB24d` | `0xD37958Ac12E51EACAE641537572e40eD0354a204` |

The Chainlink equity legs wrap Coinbase's B20 total-return feeds on Base: NVDA `0x04689a41629776563E6822F76f2e57D148d28513`, TSLA `0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4`, AAPL `0x787f13dEa48Db0897CbCDD985de77809D837F988`, GOOGL `0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2`. The VIRTUAL leg wraps Chainlink's `0xEaf310161c9eF7c813A14f8FEF6Fb271434019F7`.

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0x0e674eeaaDB0213DE29C72aeFfD3d85E592024Bb` |
| BTC SquidPriceFeed | `0x16d03D6414c7aE8a1D2a63B1602557C1BAfFB91d` |
| ETH SquidPriceFeed | `0x01f21cc69674Ecd40a847257c405C6Dce8dEf0B9` |
| SOL SquidPriceFeed | `0x23637E2DBfe6B4c040b57F66FD043cB74B58B10E` |
| VIRTUAL SquidPriceFeed | `0x6386BB62B3D19100735f39482a49e1ef1FEc0AD8` |
| NVDA SquidPriceFeed | `0x1c0E3FdF32a174A73bc1a5f63bC17B999568C1d6` |
| TSLA SquidPriceFeed | `0x5AAbE5810fa59F55fd11b44E572593fD06dadAC8` |
| AAPL SquidPriceFeed | `0xe7662d69ebdDC4a3f2a0Fe6B0F351cadeeE66502` |
| GOOGL SquidPriceFeed | `0x22A60B79ffFc4FC33ed2C6bF4aed549406c67e13` |

`SquidlorAdapterV2` on Base runs `requiredSigners = 1` with the owner plus one authorised signer per relay process. The prediction market's resolver reads this adapter directly, by feed id, not the aggregators above.

### Registry

| Contract | Address |
| --- | --- |
| AggregatorRegistry (UUPS proxy) | `0x65af89Cf250FcC7627e53Ce0c892B65d6dBbB5eF` |
| AggregatorRegistry implementation | `0x473c2bdCf237c009EcEFBad7a8cE6e6A7eA8b628` |

`superAdmin` is the deployer. All eight pairs are registered.

### Prediction market and launchpad

The market contracts (`MarketFactory`, `ConditionalTokens`, `SquidlorPriceResolver`, sqUSD, the netting relay) are listed on [prediction markets](/products/markets#contracts-on-base). The Doppler and Uniswap v4 addresses the launchpad uses are on [stock-paired tokens](/products/trade#contracts-on-base).

## Robinhood Chain (4663)

Explorer: `https://robinhoodchain.blockscout.com`

Deployer and owner of every contract below: `0x34f54E0Ca7f18DB6F088297d3a34D67B57B443Cb`

### Aggregators (read these)

This is the table most integrations need. Each address is a `SquidlorOracleAggregator` implementing Chainlink's `AggregatorV3Interface` at 8 decimals.

| Pair | Aggregator |
| --- | --- |
| BTC/USD | `0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF` |
| ETH/USD | `0xc0B5AEb320Cb31fB51F17c823157aCECeF225b6E` |
| SOL/USD | `0xf3B44eDd2Dd256179C79f5772d68Ca943645F38d` |
| NVDA/USD | `0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91` |
| TSLA/USD | `0x7d3A942f0Ac45d5B78e5cDFC8fF99D0CdaD1e059` |
| AAPL/USD | `0xB7227458A404EfaE56FC9A830C8Ca7Ff5aa0140e` |
| GOOGL/USD | `0xf6EB4A09Dff938cA857DB11E9B331abBdDdef1B8` |

### Source adapters per aggregator

| Pair | Chainlink source | Squidlor source |
| --- | --- | --- |
| BTC/USD | `0x15CEa6611568464e768C8810e4E9873d9D6bDF08` | `0xd79d9997F49a14b0b74dA4085b95ddAD18F1482e` |
| ETH/USD | `0xCbd8c8d721ffe2C8EBa9FBFc99eC6BA2f2a99F2f` | `0xEC4c77Af927a9fDC1D5693A3656C8f07aE7c473D` |
| SOL/USD | none (no Chainlink SOL feed on 4663) | `0x9021CfBF1cb6f42393cafEa9EF70c564eb531688` |
| NVDA/USD | `0xccC9011353C860639073480FE6Aceb1530856e2f` | wired; read `sources(1)` on the aggregator |
| TSLA/USD | `0x033F60366fE7Ca60636B545784F6167Ac1258b37` | wired; read `sources(1)` on the aggregator |
| AAPL/USD | `0xeFb3bAE78042398E63B8AA591756915712791177` | wired; read `sources(1)` on the aggregator |
| GOOGL/USD | `0x22c432CE3b40270A6f4f338761Aa26D45C7F2464` | wired; read `sources(1)` on the aggregator |

> [!WARNING]
> Every Robinhood Chain aggregator now has two sources, but Squidlor's own relay on 4663 is paused as of September 2026. Every pair there reads its Chainlink leg alone (`healthyCount` 1 of 2), and SOL/USD, which has no Chainlink leg, has no healthy source. Read `peek()` before you trust a Robinhood round.

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0xf64c478d921e1d2904Dd15b43bE39659e54f22f1` |
| BTC SquidPriceFeed | `0x2eD9A7002D7e8685D47B7D802F951c856d742648` |
| ETH SquidPriceFeed | `0x241B3638Bf7db7cF2eA530Bb30F372493456de36` |
| BNB SquidPriceFeed | `0x899f3880876913468DA3ffA85cbD8393d1fAC959` |
| XRP SquidPriceFeed | `0xE8591074127301D1386dE3Fd0fa0E88537ec2b7A` |
| SOL SquidPriceFeed | `0xCD0348723f4b7b2E323D04d9b88d75a410c3ac70` |
| NVDA SquidPriceFeed | `0x3f225cCa2946deAaf94d7D540119A112431FAE96` |
| TSLA SquidPriceFeed | `0x1e74312f260EF8D5Dad0289068CD243b27bBAe08` |
| AAPL SquidPriceFeed | `0xd54cdEb0925638032cF7A2CB7fBBEdA140819Be7` |
| GOOGL SquidPriceFeed | `0xfeab08dC602CD27154b496ab4cDC57992054c30A` |

`SquidlorAdapterV2` runs with `signers = [deployer]`, `required = 1`.

BNB/USD and XRP/USD have price feeds but no aggregator; read the feed proxy directly, accepting that there is no cross-oracle layer for those two.

### Registry

| Contract | Address |
| --- | --- |
| AggregatorRegistry (UUPS proxy) | `0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a` |
| AggregatorRegistry implementation | `0x35D92492d1b3991e7cd07A739590A81aeA71b07b` |

`superAdmin` is the deployer. All seven pairs are registered; see [aggregator registry](/contracts/registry).

### Economics and randomness

| Contract | Address |
| --- | --- |
| RewardDistributor | `0x2204935B87e5F1b63aBAD2334346E65BD06CF229` |
| FeeCollector | `0x538C1b17D4D6edB052baA3A954e262FDCae91a9A` |
| SquidlorCommitRevealRandomness | `0x79D2Af79eFe23a18baA81b47E4B2adEB747BAB78` |

Treasury is the deployer; `treasuryBps` 3000; `epochDuration` 86,400s; `revealDelayBlocks` 5.

## Arbitrum One (42161)

The source of the "Arbitrum hub" prices the relay medians, and the only chain with the events and randomness endpoints.

### Aggregators

| Pair | Aggregator |
| --- | --- |
| BTC/USD | `0x71aF698Ad533fb0e3f93a68096E1e25b3283f773` |
| ETH/USD | `0x193A76CeD344005c52168516d32483A99719EdB0` |
| SOL/USD | `0x381208FDFd0ed3af1Ce5E1F7B647990c2E7C81a5` |
| EUR/USD | `0x3683B3fD0CE2D048ff7cB2c4BE96aBA77905cAe2` |
| XAU/USD | `0x5192918F9910EDBEda5F00bf1c5Ab2357dcB737f` |
| TSLA/USD | `0x6Eba8E5CeF1fA78fE92d7E98F0898D96b9d3f75D` |
| FBTC/POR | `0x0d53131972Df13DEb38932a188cB7D00A4d1748d` |

### Other contracts

| Contract | Address |
| --- | --- |
| SquidlorCommitRevealRandomness | `0x0FC1feC8083a287f4508c76e922757c2A98e7E75` |
| EventOracleAggregator | `0x67ff83c40B0338518B0781466EA3cB092002BbB4` |
| Event resolver | `0xD79AA11e81c9d3013B30DD71d9cba8977a9518BF` |

Arbitrum carries two pairs Robinhood Chain does not, EUR/USD (FX) and XAU/USD (gold), plus `FBTC/POR`, a proof-of-reserve feed.

## Verifying an address

Never trust a documentation table for something that moves money. Confirm on-chain before you deploy against it:

```bash
# Confirm it's the pair you expect
cast call 0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF \
  "description()(string)" \
  --rpc-url https://rpc.mainnet.chain.robinhood.com

# Confirm the aggregator produces a sane answer and source count
cast call 0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF \
  "peek()(int256,uint256,uint256)" \
  --rpc-url https://rpc.mainnet.chain.robinhood.com
```

Or resolve through the [registry](/contracts/registry) so discovery happens on-chain rather than from a copied string.

> [!IMPORTANT]
> Addresses change when contracts are redeployed or upgraded. This page reflects the 2026-07-13 Robinhood deployment and the 2026-08-30 to 2026-09-02 Base deployments. For automated systems, resolve from the registry or the [API's feed list](/api/feeds#list-feeds) rather than pinning what you read here.
