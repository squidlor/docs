---
title: Push price updates
description: How the relayer builds a signed payload and publishes prices — for operators running a Squidlor deployment.
---

This page is for operators. Consuming prices requires none of it.

Publishing a price to Squidlor means calling `updateDataFeedsValues` on `SquidlorAdapterV2` with signed price packages appended to the transaction's calldata. The contract verifies signatures on-chain before storing anything.

> [!NOTE]
> Only addresses in the adapter's authorized signer set can produce packages the contract will accept. Running your own relayer against a Squidlor deployment requires the owner to have added your signer.

## The flow

```text
1. Fetch the same asset from N independent venues
2. Median the values off-chain
3. Build a data package per feed: {feedId, value, timestamp}
4. Sign each package (secp256k1, low-S)
5. ABI-encode updateDataFeedsValues(feedIds, timestampMs)
6. Append the packed payload after the ABI arguments
7. Submit the transaction
```

Steps 5 and 6 are the unusual part: the payload rides in calldata **after** the ABI-encoded arguments, and the contract parses it backwards from the end.

## Payload layout

```text
... [ABI args] [pkg_N] ... [pkg_1] [pkg_count:2] [meta_size:3] [marker:9]
                                                                ↑
                                              parsing starts here (backwards)
```

Each package:

```text
[data_points × (valueByteSize + 32)] [timestamp:6] [data_point_count:3] [value_byte_size:4] [signature:65]
```

The magic marker the contract looks for:

```text
0x0000000000000000000000000000000000000000000000000002ed57011e0000
```

Parsing backwards is what allows a variable number of packages to travel with a fixed function signature — the ABI never has to describe them.

## Building the payload

```typescript
import {
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbi,
  concat,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ADAPTER_ABI = parseAbi([
  "function updateDataFeedsValues(bytes32[] feedIds, uint256 dataPackagesTimestamp)",
]);

const MARKER: Hex = "0x0002ed57011e0000"; // trailing 9 bytes of the marker word

type PricePoint = {
  feedId: Hex;    // bytes32, e.g. bytes32("BTC")
  value: bigint;   // 8-decimal integer
};

/**
 * One signed package per feed, then the trailer the contract parses backwards.
 *
 * `timestampMs` must be identical across every package in a submission — the
 * contract compares each against the `dataPackagesTimestamp` argument and
 * reverts on any mismatch.
 */
async function buildPayload(
  points: PricePoint[],
  timestampMs: number,
  signerKey: Hex,
): Promise<Hex> {
  const account = privateKeyToAccount(signerKey);
  const packages: Hex[] = [];

  for (const point of points) {
    // 32-byte value, 6-byte timestamp, 3-byte data-point count, 4-byte value size.
    const body = encodePacked(
      ["bytes32", "uint256", "uint48", "uint24", "uint32"],
      [point.feedId, point.value, BigInt(timestampMs), 1, 32],
    );

    const signature = await account.sign({ hash: keccak256(body) });
    packages.push(concat([body, signature]));
  }

  // Packages are emitted in order; the contract walks them in reverse.
  const trailer = encodePacked(
    ["uint16", "uint24"],
    [packages.length, packages.reduce((total, p) => total + (p.length - 2) / 2, 0)],
  );

  return concat([...packages, trailer, MARKER]);
}

async function submit(points: PricePoint[], signerKey: Hex) {
  const timestampMs = Date.now();

  const calldata = encodeFunctionData({
    abi: ADAPTER_ABI,
    functionName: "updateDataFeedsValues",
    args: [points.map((p) => p.feedId), BigInt(timestampMs)],
  });

  const payload = await buildPayload(points, timestampMs, signerKey);

  // The payload is appended to the ABI-encoded arguments, not passed as one.
  return concat([calldata, payload]);
}
```

> [!WARNING]
> The exact byte layout is enforced by the contract and will revert on any mismatch — with `InvalidPayload`, `BadMetadataSize`, or `CalldataOverflow`. Treat the snippet above as an illustration of the shape, and the production `relay-pusher` service as the reference implementation. Verify against a testnet deployment before pointing a relayer at mainnet.

## What the contract enforces

Every one of these is on-chain, and none can be relaxed by configuration:

| Rule | Failure |
| --- | --- |
| Signature `v` is 27 or 28, `s` is low-S | `InvalidSignature` |
| Signer is in the authorized set | `SignerNotAllowed(address)` |
| At least `requiredSigners()` distinct signers per feed | `InsufficientSigners(got, need)` |
| No signer counted twice (per-feed bitmap) | Second contribution ignored |
| Every package timestamp equals the argument | `PackageTimestampMismatch` |
| Timestamp within 3 minutes past | `PriceTooOld` |
| Timestamp within 1 minute future | `PriceFromFuture` |
| Timestamp strictly newer than the last stored | `StaleDataPackage` |
| At least 3 seconds since the last update | `UpdateTooSoon` |
| No verified median is zero | `ZeroPrice(feedId)` |

## Batch everything

One transaction should carry every feed:

```typescript
// Right: one transaction, five feeds.
await submit([
  { feedId: feedIdOf("BTC"), value: btcPrice },
  { feedId: feedIdOf("ETH"), value: ethPrice },
  { feedId: feedIdOf("SOL"), value: solPrice },
  { feedId: feedIdOf("BNB"), value: bnbPrice },
  { feedId: feedIdOf("XRP"), value: xrpPrice },
], signerKey);
```

Five feeds in one transaction cost roughly 522k gas — about $0.05 — on the live deployment. Five separate transactions would cost several times that in base overhead alone, and would be non-atomic: a partial failure leaves some feeds updated and some not.

## Operational requirements

**Median before signing.** The relayer's job is Layer 1 of the [aggregation architecture](/oracle/architecture). Sign the median of several venues, never a single venue's quote.

**Handle the 3-second floor.** Retries must respect it or they will revert with `UpdateTooSoon`.

**Clock discipline.** Timestamps are validated against `block.timestamp` with 3-minute and 1-minute bounds. A drifting relayer clock produces `PriceTooOld` or `PriceFromFuture` errors that look like network problems and are not.

**Monotonic timestamps.** Each submission must be strictly newer than the last accepted one. Two relayers racing with the same timestamp means one reverts — worth coordinating.

**Redundancy.** Relayer downtime past the staleness window makes the feed unreadable for consumers that check freshness. Run more than one, and monitor `DataFeedsUpdated` rather than assuming your process is alive.

**Gas price.** Some chains need an explicit gas price. On Robinhood Chain it is pinned at `0.1 gwei` in the deploy config, because automatic `maxFee` estimation underbids the base fee and stalls.

**Key custody.** A signer key can publish prices that consumers will act on. Use a hardware wallet or HSM in production — see [security properties](/contracts/security#trust-assumptions).

## Equity market hours

The equity relay runs only during US market hours, 09:30–16:00 ET. Outside them there is nothing to publish, and Chainlink's 24-hour heartbeat carries the price.

Consumers must account for this in their staleness bounds — see [price feeds & assets](/oracle/feeds#handling-market-hours-in-your-integration).
