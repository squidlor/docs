---
title: Oracle SDK
description: '@squidlor/oracle-sdk: a thin viem wrapper that resolves feed addresses per chain and reads them with one call.'
---

`@squidlor/oracle-sdk` (0.4.0 on npm) is a small read-only SDK. It resolves a feed address from a `(chain, pair)` pair and reads it on-chain via viem, and it wraps the REST API for the things the chain does not store: history, candles, per-source audit.

It stays deliberately thin: the feeds are Chainlink-compatible, so anything that can read a Chainlink feed can read these without an SDK at all.

## Install

```bash
npm install @squidlor/oracle-sdk viem
```

## Read a price

```typescript
import { getFeed } from "@squidlor/oracle-sdk";

// BTC/USD aggregator on Arc
const feed = getFeed("arc", "BTC/USD");
const { formatted, price, decimals, updatedAt, roundId } = await feed.read();

console.log(formatted);  // "77016.42057129"
console.log(price);      // 7701642057129n, a raw bigint
console.log(decimals);   // 8
console.log(updatedAt);  // 1789152685 (unix seconds)
```

`getFeed` resolves the address **synchronously** from a static map; `read()` is what hits the chain.

## Supported chains

| Chain | ID | Built-in aggregators |
| --- | --- | --- |
| `arc` | 5042 (mainnet) | BTC, ETH, SOL, NVDA, TSLA, AAPL, GOOGL (all /USD) |

Squidlor publishes on one chain, so `chain` has a default and you can leave it out. Chain IDs work
in place of slugs: `getFeed(5042, "BTC/USD")`.

The table is generated from the deployment manifest at publish time, so an SDK release always
matches the chain it shipped for. Arc Testnet is not in the static map: pass an explicit `address`
and a testnet `client`, as in [address resolution](#address-resolution). Read
[deployed addresses](/networks/addresses) for what is live now.

```typescript
import { knownPairs, supportedChains } from "@squidlor/oracle-sdk";

knownPairs("arc");  // ['BTC/USD', 'ETH/USD', ...]
supportedChains();  // [{ key: 'arc', chainId: 5042, pairs: 7 }]
```

Anything outside that map needs an explicit address or a registry lookup; see [address resolution](#address-resolution).

## Read the health of a feed

`health()` calls the aggregator's `peek()`, which returns the answer alongside how many sources were fresh and in-bounds for it. Use it anywhere being wrong is expensive:

```typescript
const { formatted, healthyCount } = await getFeed("arc", "BTC/USD").health();
if (healthyCount < 1) throw new Error("no healthy source to act on");
```

If too few sources are fresh, the aggregator reverts rather than serve a number it does not stand behind. The SDK decodes that into a typed error:

```typescript
import { getFeed, StaleFeedError } from "@squidlor/oracle-sdk";

try {
  await getFeed("arc", "BTC/USD").read();
} catch (e) {
  if (e instanceof StaleFeedError) {
    console.warn(`only ${e.healthy}/${e.required} sources fresh, falling back`);
  } else throw e;
}
```

Do not retry this in a tight loop: freshness only changes when a pusher lands an update.

## Read off-chain data

The same package wraps the REST API for history, candles and the audit trail:

```typescript
import { createClient } from "@squidlor/oracle-sdk";

const api = createClient({ apiKey: process.env.SQUIDLOR_API_KEY }); // key optional

const btc = await api.getValue("arc", "BTC/USD");
const candles = await api.getOhlc("arc", "BTC/USD", { interval: "1h", limit: 24 });
const flagged = await api.getAudit("arc", "BTC/USD", { flagged: true });
```

Standalone equivalents are exported too: `listFeedsRest`, `getFeedRest`, `getValue`, `getHistory`, `getOhlc`, `getAudit`, `getConstituents`. Failures throw `SquidlorApiError` with `status`, `code` and `retryAfterSec`.

A key is optional but raises your rate limit; see [authentication](/build/authentication).

## Address resolution

Three ways, in the order the SDK tries them:

1. **`opts.address`**: an explicit override, skipping everything else.
2. **`opts.registry`** or the chain's known registry, read on-chain via `getFeedViaRegistry`.
3. **The built-in static map**.

```typescript
// 1. Explicit address: the escape hatch for any chain or pair the SDK
//    doesn't know about yet.
const feed = getFeed("arc", "SOMETHING/USD", {
  address: "0x5C792F2d7d350CFcA1661BC3d8d3B7F062Ed1bE5",
});

// 2. Resolve through the on-chain registry: async, because it reads a contract.
//    The registry address ships in the SDK, so no address is needed.
import { getFeedViaRegistry } from "@squidlor/oracle-sdk";

const resolved = await getFeedViaRegistry("arc", "NVDA/USD");
```

Resolving through the registry adds the registry admin to your trust surface; see the [trade-off table](/contracts/registry#trade-off-registry-lookup-versus-a-hardcoded-address).

## Options

```typescript
interface GetFeedOptions {
  rpcUrl?: string;        // override the chain's default RPC
  address?: Hex;          // explicit aggregator address
  registry?: Hex;         // registry to resolve through
  client?: PublicClient;  // bring your own viem client
}
```

Passing `client` is the right move in an application that already has one: you get connection reuse, your own transport configuration, and consistent retry behaviour:

```typescript
import { createPublicClient, http, defineChain } from "viem";
import { getFeed } from "@squidlor/oracle-sdk";

const arc = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
});

const client = createPublicClient({
  chain: arc,
  transport: http(process.env.ARC_RPC_URL),
});

const feed = getFeed("arc", "BTC/USD", { client });
```

> [!NOTE]
> The default RPCs are public endpoints. Fine for a script, rate-limited for anything in production. Pass `rpcUrl` or `client` with your own provider.

## Types

```typescript
interface FeedReading {
  price: bigint;      // raw answer
  decimals: number;
  formatted: string;  // human-readable, e.g. "63434.90498170"
  updatedAt: number;  // unix seconds
  roundId: bigint;
}

interface Feed {
  chainId: number;
  pair: string;
  address: Hex;
  read(): Promise<FeedReading>;
}
```

## Discovering pairs

```typescript
import { knownPairs, CHAINS } from "@squidlor/oracle-sdk";

knownPairs("arc");  // ["BTC/USD", "ETH/USD", "SOL/USD", …]
CHAINS.arc.chainId; // 5042
```

`knownPairs` reads the static map, so it will not list pairs that exist on-chain but are not compiled into the SDK. For live discovery, use the [API's feed list](/api/feeds#list-feeds).

## What the SDK does not do

Being clear about the boundaries, since they are easy to assume away:

- **No `peek()`.** `read()` calls `latestRoundData()`, whose `updatedAt` is the source publish time on current aggregators ([details](/integration/reading-prices#updatedat-on-an-aggregator)). For the healthy-source count, call `peek()` yourself with viem.
- **No history, OHLC, or audit.** Those live in the [HTTP API](/api/history).
- **No writes.** Read-only by design. Publishing is the relayer's job.
- **No health data.** `healthyCount` is not exposed. Use `peek()` or the API.

> [!IMPORTANT]
> For a protocol making financial decisions, the SDK's `read()` is not enough on its own. It gives you a price without telling you how old it is or how many sources stand behind it. Use `peek()`; see [read prices off-chain](/integration/reading-offchain#via-direct-rpc-with-viem).

## Errors

```typescript
try {
  // XAU/USD isn't in the SDK's built-in map, so this throws before any
  // network call, the most common error you'll hit in practice.
  const feed = getFeed("arc", "XAU/USD");
  const reading = await feed.read();
} catch (error) {
  // getFeed throws synchronously for an unsupported chain or unknown pair:
  //   "No known aggregator for XAU/USD on chain 5042. Pass opts.address, …"
  // read() throws on RPC failure, or if the aggregator reverts.
  console.error(error);
}
```
