---
title: SquidPriceFeed
description: The per-asset Chainlink-compatible facade over the adapter — stateless, 8-decimal, and one deployment per asset.
---

`SquidPriceFeed` presents a single asset from `SquidlorAdapterV2` as a Chainlink `AggregatorV3Interface`. It is abstract; one concrete subclass is deployed per asset.

The contract holds **no price data**. Every read passes through to the adapter, which means a feed proxy can never hold a copy of a price that has drifted from the canonical one.

> [!NOTE]
> Reading a `SquidPriceFeed` gets you Squidlor's own price with no cross-oracle aggregation. For most integrations you want [`SquidlorOracleAggregator`](/contracts/aggregator) instead, which combines this feed with Chainlink and any other wired source.

## Subclasses

Each concrete feed supplies only a `dataFeedId()` and a `description()`:

```text
SquidPriceFeed (abstract)
      ├── BtcPriceFeed      ├── NvdaPriceFeed
      ├── EthPriceFeed      ├── TslaPriceFeed
      ├── SolPriceFeed      ├── AaplPriceFeed
      ├── BnbPriceFeed      └── GooglPriceFeed
      └── XrpPriceFeed
```

Adding an asset means deploying one more of these against the same adapter. See [deployed addresses](/networks/addresses).

## Interface

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

Resolves the feed's latest round from the adapter and returns it Chainlink-style.

| Return value | Source |
| --- | --- |
| `roundId` | `adapter.latestRoundForFeed(feedId)` |
| `answer` | `adapter.getPrice(feedId, roundId)`, cast to `int256` |
| `startedAt` | The round's block timestamp |
| `updatedAt` | The round's block timestamp |
| `answeredInRound` | Same as `roundId` |

`startedAt` and `updatedAt` are deliberately identical here: a push oracle's round is a single instant, not an interval, so there is nothing meaningful to distinguish.

### `getRoundData(uint80 roundId)`

```solidity
function getRoundData(uint80 requestedRoundId)
    external
    view
    returns (uint80, int256, uint256, uint256, uint80);
```

Historical lookup. One difference from `latestRoundData` worth noting: here `startedAt` is the **data** timestamp converted from milliseconds to seconds, while `updatedAt` remains the block timestamp.

So on a historical round:

- `startedAt` — when the price was true off-chain.
- `updatedAt` — when it landed on-chain.

The gap between them is the relay latency for that round, which makes this pair genuinely informative for auditing.

### `decimals()`, `description()`, `version()`

```solidity
function decimals() external pure returns (uint8);      // always 8
function description() external view returns (string memory);
function version() external pure returns (uint256);     // 1
```

`decimals()` is `pure` and hardcoded to 8 — the same across every Squidlor feed, and not configurable.

### Legacy Chainlink functions

```solidity
function latestAnswer() external view returns (int256);
function latestRound() external view returns (uint80);
```

Provided for older consumers built against Chainlink's pre-`latestRoundData` interface.

> [!WARNING]
> `latestAnswer()` returns a price and nothing else — no timestamp, no round. There is no way to check freshness against it. It exists for compatibility with legacy consumers; new code should never call it.

### Timestamp getters

```solidity
function getLastDataTimestamp() external view returns (uint256);   // milliseconds
function getLastBlockTimestamp() external view returns (uint256);  // seconds
```

Again, note the differing units — milliseconds for the data timestamp, seconds for the block timestamp.

### `updateDataFeedValue`

```solidity
function updateDataFeedValue(uint256) external pure override;
```

Always reverts. Prices are never written to a feed proxy — they are written to the adapter by the relayer. The function exists only to satisfy an interface.

## Initialization

```solidity
function initialize(address _adapter) public virtual initializer;
```

Feeds are deployed behind proxies and initialized with the adapter address. `dataFeedId()` is supplied by the subclass rather than stored, so it cannot be reconfigured after deployment.

## Errors

| Error | Trigger |
| --- | --- |
| `UnsafeInt256Cast(value)` | A stored `uint256` price exceeds `int256` max. |
| `RoundNotFound(roundId)` | Propagated from the adapter for an invalid round. |
| `ZeroPrice(feedId)` | Propagated from the adapter when no price is stored. |

## Reading it

```solidity
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
}

contract SquidFeedConsumer {
    IAggregatorV3 public immutable feed;

    constructor(address feedAddress) {
        feed = IAggregatorV3(feedAddress);
    }

    function price(uint256 maxAge) external view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();

        require(answer > 0, "invalid price");
        // updatedAt is the on-chain publish time — a real staleness signal here,
        // unlike the aggregator's live-read fallback.
        require(block.timestamp - updatedAt <= maxAge, "stale");

        return answer;
    }
}
```
