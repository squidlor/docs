---
title: Torus Testnet
description: Squidlor's oracle on Torus Testnet (chain 8196). BTC, ETH, gold, EUR and Brent, pushed gasless through the Torus forwarder, with 2-of-3 signing and a Safe owner.
---

Squidlor's oracle runs on Torus Testnet as the benchmark for Torus's own oracle integration. It publishes eight feeds: BTC/USD and ETH/USD, gold (XAU/USD), EUR/USD and Brent (BRENT/USD), and 24/7 versions of the last three. It is the only Squidlor deployment where an update needs two independent signatures, and the only one where the relay pays no gas.

> [!IMPORTANT]
> Torus Testnet is a testnet. Read it on-chain. The public API, the SDK and the agent tools serve
> Arc, so `https://api.squidlor.com/aggregator/v1/8196/feeds` returns `chain not supported`.

## Chain facts

| Fact | Value |
| --- | --- |
| Chain ID | **8196** (`0x2004`). Torus mainnet is 8195. |
| Gas token | TQF |
| RPC | `https://rpc-v2.testnet.toruschain.com` |
| Explorer | `https://testnet.toruscan.com` |
| Multicall3 | `0x15CEa6611568464e768C8810e4E9873d9D6bDF08` (not the canonical address) |

## What Squidlor runs on Torus Testnet

**Oracle.** `SquidlorAdapterV3` with a `SquidPriceFeed` proxy per feed and a `SquidlorOracleAggregator` per pair, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers all eight. `SquidlorAdapterV3` is `SquidlorAdapterV2` plus ERC-2771 support, so updates can arrive through the Torus transaction forwarder.

**Sources per aggregator.** One, Squidlor's feed, at `minHealthySources = 1`. No other push oracle publishes on Torus, so there is no second on-chain leg. The relay medians several venues off-chain before it signs.

**Signing and governance.**

| Control | Setting |
| --- | --- |
| Signatures per update | 2 of 3 authorised signers (`requiredSigners = 2`) |
| Owner of the adapter, every aggregator and the registry admin role | Safe `0xcEa710DdD25b5D84Dd1F413418683cdb4D9Bb6f4`, 2 of 3 |
| Upgrades | Through a timelock with a 900-second delay |
| Trusted forwarder | `0x478CbFAAD289d3aF08256fCf2938666eca454F03` |

**Relay.** Updates go through the Torus forwarder, so the relay spends no TQF.

| Feed | Deviation | Heartbeat |
| --- | --- | --- |
| BTC, ETH | 0.1% | 5 minutes |
| XAU, EUR, BRENT | 0.1% | 5 minutes, while the underlying market is open |
| XAU24, EUR24, BRENT24 | 0.1% | 5 minutes, around the clock |

XAU, EUR and BRENT come from public market venues only. Outside market hours the base feeds stop, so the last close stays on-chain with its real timestamp. The `24` feeds keep publishing from venues that trade around the clock, and a circuit breaker refuses any value too far from the base feed's last close. In market hours a base feed and its `24` version carry the same number. BRENT tracks the second-nearby ICE Brent contract.

**Staleness windows.** Every Squidlor leg has a 900-second window, three heartbeats. A base macro feed therefore reverts at the aggregator while its market is closed. Its `SquidPriceFeed` proxy still returns the last close.

## Addresses

> [!WARNING]
> Some addresses below are reused on other chains for different contracts. Assert `eth_chainId`
> before you trust any address.

### Aggregators (read these)

| Pair | Aggregator |
| --- | --- |
| BTC/USD | `0x3A5E4CbEA4D66dE1138C68d839A2B64B650054d9` |
| ETH/USD | `0xFf66398799bf0d1c921A64337BfEeDacBDBc8F57` |
| XAU/USD | `0xc45788C26c480340a9357aFE8F7a102C5a9bF029` |
| EUR/USD | `0xd54cdEb0925638032cF7A2CB7fBBEdA140819Be7` |
| BRENT/USD | `0x60e1760140321dBe67bc79B6828a1De4cEF46Ed0` |
| XAU24/USD | `0x5be5Ff8DA4c26D79F8B41f35f96761942C987F1F` |
| EUR24/USD | `0x8Be107969b1122772Dd3A731cE25Ce85C61e5275` |
| BRENT24/USD | `0x26fe6389965DD804bbb4164FE0F241BA0e12aEC2` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV3 | `0xDFE19fEa75c26B8dDac776126eAB5Ec77e96eCf1` |
| BTC SquidPriceFeed | `0x8dF05a35ebA264729f6137aAe10DD3F542c613dF` |
| ETH SquidPriceFeed | `0xAC1Db1010F7109F9Fc1F15dBEb35b38dc74CdC24` |
| XAU SquidPriceFeed | `0xE1854FbC9B08b4D1b72570D9B19c2937B85a337e` |
| EUR SquidPriceFeed | `0xb2786bF906e86FA0a0247aeA96E749CDB06B43EE` |
| BRENT SquidPriceFeed | `0xF720655057eA10e98729F7Da6Acca0338965cc18` |
| XAU24 SquidPriceFeed | `0x2EaE674394F2DbaaB604913B66aEE1BF4e48f772` |
| EUR24 SquidPriceFeed | `0xBFCf3e213aAbCD229633A3C548F2Bc7313176Bfc` |
| BRENT24 SquidPriceFeed | `0xbCF0e5D07D390e2F56b5B38A1D39B1354F3C4181` |
| AggregatorRegistry (UUPS proxy) | `0xCD0348723f4b7b2E323D04d9b88d75a410c3ac70` |

## Read a price

```bash
cast call 0x3A5E4CbEA4D66dE1138C68d839A2B64B650054d9 \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://rpc-v2.testnet.toruschain.com
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0xCD0348723f4b7b2E323D04d9b88d75a410c3ac70 \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://rpc-v2.testnet.toruschain.com
```
