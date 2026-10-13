---
title: Torus
description: Squidlor's oracle on Torus mainnet (chain 8195) and Torus Testnet (8196). BTC, ETH, gold, EUR and Brent, pushed gasless through the Torus forwarder, with 2-of-3 signing, a Safe owner and a 48-hour upgrade timelock.
---

Squidlor is the oracle on Torus mainnet. It publishes five feeds: BTC/USD, ETH/USD, gold (XAU/USD), EUR/USD and Brent (BRENT/USD). Every update needs two independent signatures, and Torus's relayer pays the gas, so the relay holds no TQF at all. [Torus Testnet](#torus-testnet) runs the same contracts with eight feeds and was the benchmark for this deployment.

> [!IMPORTANT]
> Read Torus on-chain. The public API, the SDK and the agent tools serve Arc, so
> `https://api.squidlor.com/aggregator/v1/8195/feeds` returns `chain not supported`.

## Chain facts

| Fact | Torus mainnet | Torus Testnet |
| --- | --- | --- |
| Chain ID | **8195** (`0x2003`) | **8196** (`0x2004`) |
| Gas token | TQF | TQF |
| RPC | `https://rpc-v2.toruschain.com` | `https://rpc-v2.testnet.toruschain.com` |
| Explorer | `https://toruscan.com` | `https://testnet.toruscan.com` |
| Torus transaction forwarder | `0x0bB7744E852d859aDAd085A3ec474fD91ba32ae7` | `0x478CbFAAD289d3aF08256fCf2938666eca454F03` |

Chain 8192 is a retired Torus chain. Do not point anything at it.

## What Squidlor runs on Torus mainnet

**Oracle.** `SquidlorAdapterV3` with a `SquidPriceFeed` proxy per feed and a `SquidlorOracleAggregator` per pair, all 8 decimals, `MEDIAN` mode. `AggregatorRegistry` registers all five. `SquidlorAdapterV3` is `SquidlorAdapterV2` plus ERC-2771 support: it accepts updates that arrive through the Torus transaction forwarder, and reads the signed payload the same way either path.

**Sources per aggregator.** One, Squidlor's feed, at `minHealthySources = 1`. No other push oracle publishes on Torus, so there is no second on-chain leg. Before it signs, the relay takes a median across several venues, and it refuses to sign a crypto price backed by fewer than three.

**Signing and governance.**

| Control | Setting |
| --- | --- |
| Signatures per update | 2 of 3 authorised signers (`requiredSigners = 2`) |
| Owner of the adapter, every aggregator and the registry admin role | Safe `0xf9bEB81b3d631b51228daC5866A78E5a00169257`, 2 of 3 |
| Upgrades (adapter, feeds, registry) | Through a timelock with a 48-hour delay, `0xB7227458A404EfaE56FC9A830C8Ca7Ff5aa0140e`. Only the Safe can schedule, execute or cancel. |
| Deployer | Holds no role on any contract |

**Relay.** Every update goes through the Torus forwarder and Torus's relayer, which pays the gas. A first update to all five feeds needs about 560k gas, inside the forwarder's 650k cap, so each push is a single request.

| Feed | Deviation | Heartbeat |
| --- | --- | --- |
| BTC, ETH | 0.1% | 5 minutes |
| XAU, EUR, BRENT | 0.1% | 5 minutes, while the underlying market is open |

XAU, EUR and BRENT come from public market venues only. Outside market hours they stop, so the last close stays on-chain with its real timestamp. BRENT tracks the second-nearby ICE Brent contract.

**Staleness windows.** Every Squidlor leg has a 900-second window, three heartbeats. A macro feed therefore reverts at the aggregator while its market is closed. Its `SquidPriceFeed` proxy still returns the last close.

## Mainnet addresses

> [!WARNING]
> Torus mainnet and Torus Testnet were deployed from the same wallet, so several addresses exist
> on both chains as **different** contracts. Assert `eth_chainId` is `8195` before you trust any
> address below.

### Aggregators (read these)

| Pair | Aggregator |
| --- | --- |
| BTC/USD | `0x1613Be6b66d28CD98Aa684C3bCa6cecD13A5901d` |
| ETH/USD | `0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF` |
| XAU/USD | `0xd79d9997F49a14b0b74dA4085b95ddAD18F1482e` |
| EUR/USD | `0xCbd8c8d721ffe2C8EBa9FBFc99eC6BA2f2a99F2f` |
| BRENT/USD | `0x63fFC25f3097aaE50f9bdCc6F96C1f34BaF8Aa77` |

### Oracle core

| Contract | Address |
| --- | --- |
| SquidlorAdapterV3 | `0x9E1b618422d0C9a4da5C49b041484073352Ca05d` |
| BTC SquidPriceFeed | `0x49a8D57C032b8aAFE03a80f4450702cD27823202` |
| ETH SquidPriceFeed | `0xf64c478d921e1d2904Dd15b43bE39659e54f22f1` |
| XAU SquidPriceFeed | `0x241B3638Bf7db7cF2eA530Bb30F372493456de36` |
| EUR SquidPriceFeed | `0x899f3880876913468DA3ffA85cbD8393d1fAC959` |
| BRENT SquidPriceFeed | `0xE8591074127301D1386dE3Fd0fa0E88537ec2b7A` |
| AggregatorRegistry (UUPS proxy) | `0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91` |

### Governance

| Contract | Address |
| --- | --- |
| Safe (2 of 3) | `0xf9bEB81b3d631b51228daC5866A78E5a00169257` |
| TimelockController (48 hours) | `0xB7227458A404EfaE56FC9A830C8Ca7Ff5aa0140e` |
| ProxyAdmin (owned by the timelock) | `0x168E32887F7A48B556740F5E2602a1F45300DDE4` |

Every contract is verified on `toruscan.com`.

## Read a price

```bash
cast call 0x1613Be6b66d28CD98Aa684C3bCa6cecD13A5901d \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://rpc-v2.toruschain.com
```

To resolve an aggregator without hardcoding it, ask the registry:

```bash
cast call 0x7D8E02C7d2Ee80c75EFF199B8AD64522C4a88b91 \
  "getAggregatorByName(string)(address)" "BTC/USD" \
  --rpc-url https://rpc-v2.toruschain.com
```

## Torus Testnet

Torus Testnet (8196) runs the same contracts as mainnet with eight feeds: the five above plus 24/7 versions of gold, EUR/USD and Brent. It is where the gasless integration was proven before mainnet, and it stays up for integration testing.

**Differences from mainnet.**

| Control | Torus Testnet |
| --- | --- |
| Feeds | BTC, ETH, XAU, EUR, BRENT, XAU24, EUR24, BRENT24 |
| Owner of the adapter, every aggregator and the registry admin role | Safe `0xcEa710DdD25b5D84Dd1F413418683cdb4D9Bb6f4`, 2 of 3 |
| Upgrades | Through a timelock with a 900-second delay |
| Requests per push | Up to six feeds per forwarder request |

The `24` feeds keep publishing from venues that trade around the clock, and a circuit breaker refuses any value too far from the base feed's last close. In market hours a base feed and its `24` version carry the same number. The testnet Multicall3 is at `0x15CEa6611568464e768C8810e4E9873d9D6bDF08`, not the canonical address. On mainnet that address is a different contract.

### Testnet aggregators

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

### Testnet oracle core

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

Read a testnet price the same way, against the testnet RPC:

```bash
cast call 0x3A5E4CbEA4D66dE1138C68d839A2B64B650054d9 \
  "latestRoundData()(uint80,int256,uint256,uint256,uint80)" \
  --rpc-url https://rpc-v2.testnet.toruschain.com
```
