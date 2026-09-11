---
title: Quick start
description: Read a Squidlor price from a Solidity contract or over plain HTTP. No SDK and no API key needed to start.
---

Squidlor feeds are readable two ways, and both hit the same on-chain state:

- **On-chain**, through the standard Chainlink `AggregatorV3Interface`. If your contract already reads a Chainlink feed, you change one address.
- **Off-chain**, through the public read API, which returns JSON over HTTPS. No key is required to start; a [free key](/build/authentication) raises your rate limit from 30 to 300 requests/minute.

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
    // BTC/USD aggregator on Base (8453): median of Chainlink and Squidlor,
    // reverts unless both legs are fresh (minHealthySources = 2).
    IAggregatorV3 public constant BTC_USD =
        IAggregatorV3(0xA180DcB56057a9a4D5DA17978Dd95C6692Ae6345);

    /// @notice Latest BTC/USD price, reverting if the feed has gone stale.
    function btcPrice(uint256 maxAge) external view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = BTC_USD.latestRoundData();

        require(answer > 0, "invalid price");
        require(block.timestamp - updatedAt <= maxAge, "stale price");

        return answer; // 8 decimals
    }
}
```

That is the whole integration. Aggregator addresses for every pair are in [deployed addresses](/networks/addresses). The Base aggregators for BTC, ETH and SOL require both legs fresh, so a successful read there is a two-source read by construction; the [measured performance](/oracle/evidence) page shows how often that guarantee held since go-live.

> [!IMPORTANT]
> Always bound staleness yourself. The aggregator drops sources it considers unhealthy, but *your* protocol decides what age of price is acceptable for the risk it is taking. Never read `answer` without also checking `updatedAt`.

For the richer read paths (`peek()`, historical rounds, and committing a round with `poke()`), see [read prices on-chain](/integration/reading-prices).

## Read a price off-chain

The public API needs no key. Ask for one value:

```bash
curl https://api.squidlor.com/aggregator/v1/base/feeds/BTC_USD/value
```

```json
{
  "pair": "BTC/USD",
  "chainId": 8453,
  "value": "77103.18524622",
  "valueRaw": "7710318524622",
  "decimals": 8,
  "healthyCount": 2,
  "updatedAt": 1789152365
}
```

`healthyCount: 2` is the point: both Chainlink and Squidlor were fresh and the value is their median. Response captured 2026-09-11.

Note the pair format: a URL uses `_` where the pair uses `/`, so `BTC/USD` becomes `BTC_USD`.

List everything configured on a chain:

```bash
curl https://api.squidlor.com/aggregator/v1/base/feeds
```

The full surface, including per-source breakdowns, history, OHLC candles, and event outcomes, is in the [API reference](/api).

## Ask in natural language

[Oracle Chat](/ai/oracle-chat) answers questions about live feed state without any integration work, and the [MCP server](/ai/mcp) exposes the same data as tools your own agent can call. The [hub](/products/hub) at app.squidlor.com streams the same answers next to the markets, the launch board and the builder portal.

```text
Which BTC sources are currently unhealthy, and how far apart are they?
```

## What to read next

```cards
[
  {
    "title": "Core concepts",
    "description": "Sources, adapters, aggregators, feeds, and rounds: the model behind everything above.",
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
