---
title: Quick start
description: Read a Squidlor price from a Solidity contract or over plain HTTP. No SDK, no API key, no allowlist.
---

Squidlor feeds are readable two ways, and both hit the same on-chain state:

- **On-chain**, through the standard Chainlink `AggregatorV3Interface`. If your contract already reads a Chainlink feed, you change one address.
- **Off-chain**, through the public read API, which returns JSON over HTTPS with no authentication.

## Read a price on-chain

Every pair has its own `SquidlorOracleAggregator` instance that implements Chainlink's interface. Point your existing consumer code at it.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
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
}

contract PriceConsumer {
    // BTC/USD aggregator on Robinhood Chain (4663)
    IAggregatorV3 public constant BTC_USD =
        IAggregatorV3(0x94800f5Cebb5677F1855e9C9024b1Bc9685b60AF);

    /// @notice Latest BTC/USD price, reverting if the feed has gone stale.
    function btcPrice(uint256 maxAge) external view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = BTC_USD.latestRoundData();

        require(answer > 0, "invalid price");
        require(block.timestamp - updatedAt <= maxAge, "stale price");

        return answer; // 8 decimals
    }
}
```

That is the whole integration. Aggregator addresses for every pair are in [deployed addresses](/networks/addresses).

> [!IMPORTANT]
> Always bound staleness yourself. The aggregator drops sources it considers unhealthy, but *your* protocol decides what age of price is acceptable for the risk it is taking. Never read `answer` without also checking `updatedAt`.

For the richer read paths — `peek()`, historical rounds, and committing a round with `poke()` — see [read prices on-chain](/integration/reading-prices).

## Read a price off-chain

The public API needs no key. Ask for one value:

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds/BTC_USD/value
```

```json
{
  "pair": "BTC/USD",
  "chainId": 42161,
  "value": "63434.9049817",
  "valueRaw": "6343490498170",
  "decimals": 8,
  "healthyCount": 1,
  "updatedAt": 1785243053
}
```

Note the pair format: a URL uses `_` where the pair uses `/`, so `BTC/USD` becomes `BTC_USD`.

List everything configured on a chain:

```bash
curl https://api.squidlor.com/aggregator/v1/arbitrum/feeds
```

The full surface — per-source breakdowns, history, OHLC candles, event outcomes — is in the [API reference](/api).

## Ask in natural language

[Oracle Chat](/ai/oracle-chat) answers questions about live feed state without any integration work, and the [MCP server](/ai/mcp) exposes the same data as tools your own agent can call.

```text
Which BTC sources are currently unhealthy, and how far apart are they?
```

## What to read next

```cards
[
  {
    "title": "Core concepts",
    "description": "Sources, adapters, aggregators, feeds, and rounds — the model behind everything above.",
    "href": "/concepts",
    "icon": "book"
  },
  {
    "title": "Aggregation architecture",
    "description": "The three independent layers that make a Squidlor price hard to move.",
    "href": "/oracle/architecture",
    "icon": "layers"
  },
  {
    "title": "API reference",
    "description": "Every endpoint, parameter, and response field.",
    "href": "/api",
    "icon": "code"
  },
  {
    "title": "Deployed addresses",
    "description": "Live contract addresses per chain and per pair.",
    "href": "/networks/addresses",
    "icon": "network"
  }
]
```
