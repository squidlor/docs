---
title: Deployed addresses
description: Every live Squidlor contract address, per chain and per component.
---

All Robinhood Chain contracts were deployed 2026-07-13. Verify any address on the chain's explorer before using it in production.

## Robinhood Chain — 4663

Explorer: `https://robinhoodchain.blockscout.com`

Deployer and owner of every contract below: `0x34f54E0Ca7f18DB6F088297d3a34D67B57B443Cb`

### Aggregators — read these

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
| SOL/USD | — (no Chainlink SOL feed on 4663) | `0x9021CfBF1cb6f42393cafEa9EF70c564eb531688` |
| NVDA/USD | `0xccC9011353C860639073480FE6Aceb1530856e2f` | not wired |
| TSLA/USD | `0x033F60366fE7Ca60636B545784F6167Ac1258b37` | not wired |
| AAPL/USD | `0xeFb3bAE78042398E63B8AA591756915712791177` | not wired |
| GOOGL/USD | `0x22c432CE3b40270A6f4f338761Aa26D45C7F2464` | not wired |

> [!WARNING]
> The four equity pairs read Chainlink alone. The Squidlor equity price feeds below exist on-chain but have not been added as a second source on those aggregators, so cross-oracle aggregation is not in effect for equities today.

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

BNB/USD and XRP/USD have price feeds but no aggregator — read the feed proxy directly, accepting that there is no cross-oracle layer for those two.

### Registry

| Contract | Address |
| --- | --- |
| AggregatorRegistry (UUPS proxy) | `0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a` |
| AggregatorRegistry implementation | `0x35D92492d1b3991e7cd07A739590A81aeA71b07b` |

`superAdmin` is the deployer. All seven pairs are registered — see [aggregator registry](/contracts/registry).

### Economics and randomness

| Contract | Address |
| --- | --- |
| RewardDistributor | `0x2204935B87e5F1b63aBAD2334346E65BD06CF229` |
| FeeCollector | `0x538C1b17D4D6edB052baA3A954e262FDCae91a9A` |
| SquidlorCommitRevealRandomness | `0x79D2Af79eFe23a18baA81b47E4B2adEB747BAB78` |

Treasury is the deployer; `treasuryBps` 3000; `epochDuration` 86,400s; `revealDelayBlocks` 5.

## Arbitrum One — 42161

The chain the public API currently serves, and the source of the "Arbitrum hub" prices the relay medians.

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

Arbitrum carries two pairs Robinhood Chain does not — EUR/USD (FX) and XAU/USD (gold) — plus `FBTC/POR`, a proof-of-reserve feed.

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
> Addresses change when contracts are redeployed or upgraded. This page reflects the 2026-07-13 deployment. For automated systems, resolve from the registry or the [API's feed list](/api/feeds#list-feeds) rather than pinning what you read here.
