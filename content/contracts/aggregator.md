---
title: Oracle aggregator
description: SquidlorOracleAggregator, the consumer-facing contract that combines multiple oracle networks into one Chainlink-compatible feed per pair.
---

`SquidlorOracleAggregator` is the contract your protocol should read. One instance exists per pair. It holds an ordered list of sources, filters out the unhealthy ones, and combines the rest.

The full function surface is documented in [consumer interface](/oracle/interface). This page covers how it behaves and how it is configured.

## How an answer is produced

On every read:

1. Iterate the configured sources.
2. For each, call `latestPrice()` on its adapter to get `(price, updatedAt)`.
3. Skip any source that is disabled, reverts, or is stale, where stale means `now > updatedAt + effectiveMaxStaleness`.
4. If fewer than `minHealthySources` remain, **revert**.
5. Combine the survivors according to `selectionMode`.

Two properties follow from this, both worth internalizing:

**The aggregator can never be worse than its best source.** Its worst case is falling back to one healthy source, which is exactly what a single-oracle integration gives you anyway.

**It refuses rather than guesses.** Below the health threshold, reads revert. There is no "last known good value" that could be silently ancient.

## Selection modes

### `MEDIAN`

Sort the healthy answers, take the middle one. Used by every aggregator in the live deployment.

Moving the result requires moving the median voter. With three healthy sources, a single wrong source has no effect at all:

```text
Sources report:  [63180, 63201, 71000]   ← third source is wrong
Sorted:          [63180, 63201, 71000]
Median:          63201                    ← unaffected
```

### `PRIMARY_WITH_FALLBACK`

Use source 0 while it is healthy; otherwise fall down the ordered list. Source order is priority, which is why `reorderSources` matters in this mode.

Appropriate when one source is genuinely authoritative and the others exist only as a safety net. It provides no manipulation resistance: whatever the primary says is the answer.

## Staleness resolution

Each source has its own `maxStaleness` in seconds. A value of `0` means "use the aggregator's `defaultMaxStaleness`".

```text
effectiveMaxStaleness = source.maxStaleness != 0
    ? source.maxStaleness
    : aggregator.defaultMaxStaleness
```

This lets one aggregator hold sources with genuinely different update rhythms (a 3-second Squidlor push and a 24-hour Chainlink heartbeat) without forcing one window on both.

## Source adapters

Every source is wrapped in an adapter implementing the same interface:

```solidity
interface IPriceSource {
    function latestPrice() external view returns (int256 price, uint256 updatedAt);
    function name() external view returns (string memory);
}
```

| Adapter | Wraps |
| --- | --- |
| `ChainlinkSource` | A Chainlink `AggregatorV3Interface` feed. |
| `SquidSource` | A [`SquidPriceFeed`](/contracts/price-feed). |

Adding an oracle network means writing one adapter and calling `addSource`. `SquidlorOracleAggregator` is never modified to accommodate a provider; that is the whole point of the adapter layer.

`name()` is self-reported by the adapter and surfaces in the [API](/api/feeds#source-fields) and admin panel. It is a label, not an authenticated claim.

## Rounds

Live reads compute the aggregate at call time and write nothing. `poke()`, which is **permissionless**, commits the current aggregate as a numbered round that `getRoundData` can retrieve.

`latestRoundData()` reports the freshest healthy source's publish time as `updatedAt`, and reverts with `InsufficientHealthySources` when too few sources are fresh. A committed round is returned only while it is still the freshest publish; after the next publish, the live aggregate is returned as provisional round `latestRoundId() + 1`. `poke()` stores the same publish time, so committed rounds carry data age rather than commit time.

> [!NOTE]
> Aggregators deployed before 2026-09-24 stamp `updatedAt` with `block.timestamp` until a round is committed, and after one `poke()` keep returning that round. They are superseded; the current addresses are on [networks & addresses](/networks/addresses).

## Configuration

All admin functions are `onlyOwner`, with `Ownable2Step` ownership.

| Function | Purpose |
| --- | --- |
| `addSource(adapter, maxStaleness, enabled)` | Append a source. |
| `setSource(index, adapter, maxStaleness, enabled)` | Replace or reconfigure in place. |
| `removeSource(index)` | Remove a source. |
| `reorderSources(order)` | Reorder. Order is priority under `PRIMARY_WITH_FALLBACK`. |
| `setParameters(...)` | Adjust `minHealthySources` and `defaultMaxStaleness`. |
| `setSelectionMode(mode)` | Switch mode. |

### Live configuration

Every live aggregator runs `decimals = 8` and `selectionMode = MEDIAN`. The health floor differs by pair and chain:

| Chain | Pairs | Sources wired | `minHealthySources` | Effect |
| --- | --- | --- | --- | --- |
| Arc | all seven | Squidlor (1) | 1 | Serves Squidlor's feed while it is inside its staleness window; reverts `InsufficientHealthySources` once it ages out. Equity pairs age out overnight and at weekends by design. |

> [!WARNING]
> Where `minHealthySources = 1`, an aggregator will serve a price derived from a single source. On Arc that is every pair today, so **a successful read does not by itself prove multi-source agreement**; the off-chain median across exchanges is inside the one leg you read. Where it is 2, the revert is the guarantee: on the previous deployment the BTC/USD aggregator refused 209 of 12,757 sampled rounds rather than answer from one leg, see [measured performance](/oracle/evidence). Arc moves to 2 on a pair when a second oracle network publishes there and is added as a source.
>
> If your protocol needs the guarantee on a pair that runs 1, read `peek()` and enforce your own minimum on `healthyCount`. See [read prices on-chain](/integration/reading-prices).

## Monitoring

Two things are worth watching on an aggregator you depend on:

**`healthyCount` versus `sourceCount`.** A drop means a source has gone stale or started reverting. The price may still be valid while the protection has quietly thinned.

**Ownership and source changes.** The owner can add, remove, and reorder sources. Watch the ownership and configuration events on any aggregator you rely on; the [trust model](/resources/trust-model) is explicit that this is the most consequential trust the current deployment asks for.
