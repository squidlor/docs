---
title: Robinhood Chain
description: Squidlor's oracle on Robinhood Chain (chain 4663). Seven aggregators, Squidlor's relay pushing BTC, ETH and SOL, and Chainlink's official feeds for the tokenized stocks.
---

Squidlor's oracle has run on Robinhood Chain since July 2026. Seven aggregators cover BTC, ETH, SOL, NVDA, TSLA, AAPL and GOOGL against USD. Squidlor's relay pushes BTC, ETH and SOL. The four stock pairs read Chainlink's official Robinhood feeds, which are the chain's own oracle for its stock tokens.

> [!IMPORTANT]
> Read Robinhood Chain on-chain. The public API, the SDK and the agent tools serve Arc, so
> `https://api.squidlor.com/aggregator/v1/4663/feeds` returns `chain not supported`.

## Chain facts

| Fact | Value |
| --- | --- |
| Chain ID | **4663** (`0x1237`) |
| Gas token | ETH |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

## What Squidlor runs on Robinhood Chain

**Oracle.** One `SquidlorAdapterV2`, a `SquidPriceFeed` proxy per asset, and a `SquidlorOracleAggregator` per pair, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers all seven. Every aggregator runs `minHealthySources = 1`.

**Sources per aggregator.**

| Pair | Sources | What answers today |
| --- | --- | --- |
| BTC/USD, ETH/USD | Chainlink's Robinhood feed and Squidlor's feed | The median of both |
| SOL/USD | Squidlor's feed only. Chainlink has no SOL feed on Robinhood Chain. | Squidlor's feed |
| NVDA/USD, TSLA/USD, AAPL/USD, GOOGL/USD | Chainlink's official stock-token feed and Squidlor's feed | Chainlink's feed. Squidlor does not push stocks on this chain, so its leg is stale and the aggregator skips it. |

Chainlink's stock-token feeds already include the corporate-action multiplier, so the price is what one stock token is worth.

**Relay.** Squidlor pushes BTC, ETH and SOL on a 1% deviation or a 1-hour heartbeat. Two relay copies run in different locations. Each re-reads the chain before it sends, so one update lands once.

**Staleness windows:**

| Pair | Chainlink leg | Squidlor leg |
| --- | --- | --- |
| BTC/USD, ETH/USD | 25,200 s | 3,900 s |
| SOL/USD | none | 7,800 s |
| Stock pairs | 259,200 s | 259,200 s |

## Addresses

Owner of every contract below: `0x34f54E0Ca7f18DB6F088297d3a34D67B57B443Cb`.

> [!WARNING]
> Some addresses below are reused on other chains for different contracts. Assert `eth_chainId`
> before you trust any address.

### Aggregators (read these)

| Pair | Aggregator | Chainlink source | Squidlor source |
| --- | --- | --- | --- |
| BTC/USD | `0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF` | `0x15CEa6611568464e768C8810e4E9873d9D6bDF08` | `0xd79d9997F49a14b0b74dA4085b95ddAD18F1482e` |
| ETH/USD | `0xc0B5AEb320Cb31fB51F17c823157aCECeF225b6E` | `0xCbd8c8d721ffe2C8EBa9FBFc99eC6BA2f2a99F2f` | `0xEC4c77Af927a9fDC1D5693A3656C8f07aE7c473D` |
| SOL/USD | `0xf3B44eDd2Dd256179C79f5772d68Ca943645F38d` | none | `0x9021CfBF1cb6f42393cafEa9EF70c564eb531688` |
| NVDA/USD | `0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91` | `0xccC9011353C860639073480FE6Aceb1530856e2f` | `0x70aDBae39f6262f032172C8011BC60ea60ff1ca2` |
| TSLA/USD | `0x7d3A942f0Ac45d5B78e5cDFC8fF99D0CdaD1e059` | `0x033F60366fE7Ca60636B545784F6167Ac1258b37` | `0xF8395cFBB70c576238Da0C448472b9A37144ECEb` |
| AAPL/USD | `0xB7227458A404EfaE56FC9A830C8Ca7Ff5aa0140e` | `0xeFb3bAE78042398E63B8AA591756915712791177` | `0x8Be107969b1122772Dd3A731cE25Ce85C61e5275` |
| GOOGL/USD | `0xf6EB4A09Dff938cA857DB11E9B331abBdDdef1B8` | `0x22c432CE3b40270A6f4f338761Aa26D45C7F2464` | `0x34ad7332a775AAD06533B542644bFEA885038442` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV2 | `0xf64c478d921e1d2904Dd15b43bE39659e54f22f1` |
| BTC SquidPriceFeed | `0x2eD9A7002D7e8685D47B7D802F951c856d742648` |
| ETH SquidPriceFeed | `0x241B3638Bf7db7cF2eA530Bb30F372493456de36` |
| SOL SquidPriceFeed | `0xCD0348723f4b7b2E323D04d9b88d75a410c3ac70` |
| NVDA SquidPriceFeed | `0x3f225cCa2946deAaf94d7D540119A112431FAE96` |
| TSLA SquidPriceFeed | `0x1e74312f260EF8D5Dad0289068CD243b27bBAe08` |
| AAPL SquidPriceFeed | `0xd54cdEb0925638032cF7A2CB7fBBEdA140819Be7` |
| GOOGL SquidPriceFeed | `0xfeab08dC602CD27154b496ab4cDC57992054c30A` |
| AggregatorRegistry (UUPS proxy) | `0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a` |

## Read a price

```bash
cast call 0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://rpc.mainnet.chain.robinhood.com
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0xbbCf13b4A9AFf2Ef444dE83751B280ccEB57349a \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://rpc.mainnet.chain.robinhood.com
```
