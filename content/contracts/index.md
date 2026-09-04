---
title: Smart contracts
description: The contract set behind Squidlor: what each one does, how they inherit, and which you should actually interact with.
---

Squidlor's oracle contracts live in two repositories that deploy independently.

```cards
[
  {
    "title": "SquidlorAdapterV2",
    "description": "The storage core: signature verification, signer set, and per-feed rounds.",
    "href": "/contracts/adapter",
    "icon": "database"
  },
  {
    "title": "SquidPriceFeed",
    "description": "The per-asset Chainlink-compatible facade.",
    "href": "/contracts/price-feed",
    "icon": "filecode"
  },
  {
    "title": "Oracle aggregator",
    "description": "The contract consumers read: cross-oracle aggregation per pair.",
    "href": "/contracts/aggregator",
    "icon": "layers"
  },
  {
    "title": "Security properties",
    "description": "What the contracts guarantee, and what they explicitly do not.",
    "href": "/contracts/security",
    "icon": "shield"
  }
]
```

## Which contract do I interact with?

| You are… | Read |
| --- | --- |
| A DeFi protocol consuming a price | **`SquidlorOracleAggregator`** for the pair. Standard Chainlink interface. |
| A protocol that wants only Squidlor's own feed, no cross-oracle layer | The pair's **`SquidPriceFeed`** proxy. Also a Chainlink interface. |
| Discovering addresses programmatically | **`AggregatorRegistry`**, by pair name. |
| Running a relayer | **`SquidlorAdapterV2.updateDataFeedsValues`**. |
| Auditing how a price was formed | The aggregator's `sources()`, then each adapter's `latestPrice()`. |

> [!IMPORTANT]
> The aggregator is almost always the right answer. Reading a `SquidPriceFeed` directly gets you Squidlor's own price with no cross-oracle protection; Layer 3 of the [aggregation architecture](/oracle/architecture) is skipped entirely. Do that only if you specifically want the single source.

## Inheritance in the oracle core

```text
OracleVerifier          calldata parsing + ECDSA verification
      │
      ▼
SquidlorAdapter         storage layout, rounds, update flow
      │
      ▼
SquidlorAdapterV2       signer-set management, Ownable2Step ownership
```

Separately, one stateless proxy per asset:

```text
SquidPriceFeed (abstract)
      │
      ├── BtcPriceFeed      ├── NvdaPriceFeed
      ├── EthPriceFeed      ├── TslaPriceFeed
      ├── SolPriceFeed      ├── AaplPriceFeed
      ├── BnbPriceFeed      └── GooglPriceFeed
      └── XrpPriceFeed
```

Each subclass supplies just a `dataFeedId()` and a `description()`. All of them read the same `SquidlorAdapterV2`.

## The contract set

### Oracle core: `squid-contract`

| Contract | Role |
| --- | --- |
| `OracleVerifier` | Abstract. Locates the signed payload in calldata, recovers each signer, dedupes with a per-feed bitmap, enforces the signer threshold, and medians the verified values. |
| `SquidlorAdapter` | Abstract. Storage layout, round bookkeeping, the update entry point, and staleness bounds. |
| `SquidlorAdapterV2` | Concrete. Adds signer-set management (`addSigner`, `removeSigner`, `setRequiredSigners`) and two-step ownership. |
| `SquidPriceFeed` | Abstract per-asset facade implementing `AggregatorV3Interface` over the adapter. Stateless. |
| `*PriceFeed` | One concrete proxy per asset. |

### Aggregation and economics: `aggregator-contract`

| Contract | Role |
| --- | --- |
| `SquidlorOracleAggregator` | One per pair. Cross-oracle aggregation with health filtering. **The consumer-facing contract.** |
| `ChainlinkSource` | Adapter wrapping a Chainlink aggregator. |
| `SquidSource` | Adapter wrapping a `SquidPriceFeed`. |
| `AggregatorRegistry` | UUPS-upgradeable registry mapping pair names to aggregator addresses. |
| `RewardDistributor` | Epoch-based reward distribution. |
| `FeeCollector` | Fee accrual and treasury split. |
| `SquidlorCommitRevealRandomness` | Commit-reveal randomness with a reveal delay. |
| `EventOracleAggregator` | The event-outcome equivalent of the price aggregator. |
| `OperatorSignedEventSource` | Fast-path event source: operator signature, no bond. |

## Design constraints that shaped all of it

**Pure EVM.** Solidity ≥ 0.8 and standard `ecrecover`. No precompiles, no chain-specific opcodes. This is what makes a new-chain deployment a `forge script` rather than a port.

**Storage derived from feed IDs.** Slots are computed as `keccak256(abi.encode(feedId, "squid.price"))` rather than assigned by declaration order. New assets cannot collide with existing storage, so adding one never requires a migration, even across proxy upgrades.

**Batch updates.** One `updateDataFeedsValues` call carries every feed. The relayer's per-feed cost approaches zero as the asset list grows.

**Adapters over modification.** Adding an oracle network means writing a `*Source` contract and calling `addSource`. `SquidlorOracleAggregator` is never edited to accommodate a provider.

**Stateless facades.** `SquidPriceFeed` holds no price data. It reads through to the adapter, which means a feed proxy can never hold a divergent copy of a price.

## Verification

Contracts are deployed and verifiable on the host chain's explorer. On Robinhood Chain that is Blockscout; see [deployed addresses](/networks/addresses) for links.
