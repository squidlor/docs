---
title: Consumer interface
description: The full read and admin surface of SquidlorOracleAggregator: what each function returns, and which one you should actually call.
---

`SquidlorOracleAggregator` is the contract consumers read. One instance exists per pair, and it implements Chainlink's `AggregatorV3Interface` so existing consumers work unchanged.

## Read functions

### `peek()`

```solidity
function peek()
    external
    view
    returns (
        int256 answerValue,
        uint256 freshestUpdatedAt,
        uint256 healthyCount
    );
```

A live aggregate read that changes no state. This is the most informative read: alongside the price you get the freshest source timestamp and how many sources were counted as healthy.

Reverts if fewer than `minHealthySources` sources are healthy, an intentional refusal to return a number nobody stands behind.

Use `peek()` when your contract wants to make its own decision about source health.

`freshestUpdatedAt` is the publish time of the **newest** source counted, not the oldest. With one source the two are the same. With several, an older source can still be inside the median: each source is counted until it is older than its own `maxStaleness` (read it with `sources(i)`), so that limit, not `freshestUpdatedAt`, bounds the oldest price behind the answer. Every Arc pair runs one source today.

### `latestRoundData()`

```solidity
function latestRoundData()
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
```

Chainlink-compatible. `updatedAt` is the same `freshestUpdatedAt` that `peek()` returns: the publish time of the newest healthy source, never the time of your read. A standard Chainlink staleness check works as written.

- **It reverts instead of serving a stale price.** When fewer than `minHealthySources` sources are fresh, it reverts with `InsufficientHealthySources`, exactly like `peek()`.
- **It follows the newest data.** A round committed with `poke()` is returned only while it is still the freshest publish. After the next publish it returns the live aggregate as provisional round `latestRoundId() + 1`, the id the next `poke()` would commit it under.

It does not return `healthyCount`. If your protocol needs a floor on agreeing sources, read `peek()`.

> [!NOTE]
> Aggregators deployed before 2026-09-24 stamp `updatedAt` with `block.timestamp` until a round is committed, so a staleness check against them always passes. They are superseded; every address on [networks & addresses](/networks/addresses) has the behaviour above.

### `getRoundData(uint80 roundId)`

```solidity
function getRoundData(uint80 roundId)
    external
    view
    returns (uint80, int256, uint256, uint256, uint80);
```

Historical lookup of a committed round. Only returns rounds created by `poke()`.

### `decimals()`, `description()`

```solidity
function decimals() external view returns (uint8);
function description() external view returns (string memory);
```

`8` across every Squidlor pair. Descriptions look like `BTC/USD (Squidlor aggregated)`.

### Source introspection

```solidity
function sourceCount() external view returns (uint256);
function sources(uint256 index)
    external
    view
    returns (address adapter, uint32 maxStaleness, bool enabled);
function selectionMode() external view returns (uint8); // 0 = MEDIAN, 1 = PRIMARY_WITH_FALLBACK
function minHealthySources() external view returns (uint256);
function defaultMaxStaleness() external view returns (uint256);
function latestRoundId() external view returns (uint80);
```

Every source is inspectable on-chain: which adapter, what staleness window applies, whether it is enabled. Each adapter in turn exposes `latestPrice()` and `name()`, so you can reconstruct exactly how an answer was formed. The [API](/api/feeds) does precisely this and returns it as JSON.

## Committing a round

### `poke()`

```solidity
function poke() external returns (uint80 roundId, int256 answer);
```

**Permissionless.** Computes the current aggregate and commits it as a numbered round.

Nobody needs to call this for prices to work; live reads are always available. It exists for consumers that need a persisted, replayable round identifier: indexers, settlement logic, and anything that must prove *which* price it acted on.

## Admin functions

All `onlyOwner`, and ownership uses `Ownable2Step` so a transfer requires the new owner to accept.

| Function | Effect |
| --- | --- |
| `addSource(address adapter, uint32 maxStaleness, bool enabled)` | Append a source. |
| `setSource(uint256 index, address adapter, uint32 maxStaleness, bool enabled)` | Replace or reconfigure a source in place. |
| `removeSource(uint256 index)` | Drop a source. |
| `reorderSources(uint256[] order)` | Reorder. Significant under `PRIMARY_WITH_FALLBACK`, where order is priority. |
| `setParameters(...)` | Adjust `minHealthySources` and `defaultMaxStaleness`. |
| `setSelectionMode(uint8 mode)` | Switch between `MEDIAN` and `PRIMARY_WITH_FALLBACK`. |
| `transferOwnership` / `acceptOwnership` | Two-step ownership handover. |

> [!NOTE]
> Every aggregator in the live deployment is owned by a single deployer address. That address can add, remove, and reorder sources. This is stated explicitly in the [trust model](/resources/trust-model); it is the most consequential piece of trust the current deployment asks for.

## Which function should I call?

| Situation | Call |
| --- | --- |
| Existing Chainlink consumer, minimal change | `latestRoundData()` with a staleness check on `updatedAt` |
| You want data age and the healthy-source count | `peek()` |
| You need a stable round ID to settle against | `poke()`, then `getRoundData()` |
| You are building a dashboard or bot | The [HTTP API](/api/feeds), not the chain |

Worked examples are in [read prices on-chain](/integration/reading-prices).
