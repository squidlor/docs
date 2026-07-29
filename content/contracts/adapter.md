---
title: SquidlorAdapterV2
description: The oracle's storage core — signature verification, the signer set, per-feed rounds, and the update entry point.
---

`SquidlorAdapterV2` is the single storage contract behind every Squidlor asset. One deployment serves all feeds; the relayer calls it once per cycle to update them together.

It inherits the verification pipeline from `OracleVerifier` and the storage layout from `SquidlorAdapter`, adding signer-set management and two-step ownership.

## Updating prices

### `updateDataFeedsValues`

```solidity
function updateDataFeedsValues(
    bytes32[] calldata feedIds,
    uint256 dataPackagesTimestamp
) external;
```

The relayer's entry point. Signed price packages are appended to the transaction's calldata after the ABI-encoded arguments — see [calldata format](#calldata-format).

| Parameter | Meaning |
| --- | --- |
| `feedIds` | Feeds to update, e.g. `[bytes32("BTC"), bytes32("ETH")]`. |
| `dataPackagesTimestamp` | Millisecond timestamp that every signed package in calldata must carry. |

Execution order:

1. `allowedUpdater(msg.sender)` — the access-control hook.
2. Enforce the minimum update interval of **3 seconds**.
3. Require the timestamp to be newer than the last stored one.
4. Store the new timestamps.
5. Extract and verify prices from calldata (`OracleVerifier`).
6. Increment the round counter.
7. Store round timestamps and the median price per feed.
8. Emit `DataFeedsUpdated(roundId, block.timestamp)`.

Reverts on `UpdateTooSoon`, `StaleDataPackage`, `ZeroPrice`, or any verification failure.

### `allowedUpdater`

```solidity
function allowedUpdater(address) public view virtual {}
```

An overridable hook. The default permits any caller — which is safe, because signature verification still applies: an unauthorized caller cannot produce validly-signed packages. Override it to additionally restrict *who may submit*, for example to one keeper address.

## Reading prices

Most consumers should not call these directly — read a [`SquidPriceFeed`](/contracts/price-feed) or, better, a [`SquidlorOracleAggregator`](/contracts/aggregator). These are the primitives underneath.

```solidity
function latestRound() external view returns (uint80);
function getPrice(bytes32 feedId, uint80 roundId) external view returns (uint256);
function getRoundTimestamps(uint80 roundId) external view returns (uint128 dataTs, uint128 blockTs);
function getLastDataTimestamp() external view returns (uint256);
```

| Function | Returns |
| --- | --- |
| `latestRound()` | The current round number. Reverts `UnsafeUint80Cast` if the counter exceeds `uint80` max. |
| `getPrice(feedId, roundId)` | The verified median for a feed at a round. Reverts `RoundNotFound` for an invalid round, `ZeroPrice` if nothing was stored. |
| `getRoundTimestamps(roundId)` | `dataTs` in **milliseconds** from the signed packages; `blockTs` in **seconds** from `block.timestamp` at update. |
| `getLastDataTimestamp()` | Millisecond timestamp of the most recently accepted packages. |

> [!WARNING]
> The two timestamps have different units. `dataTs` is milliseconds because that is what the signed packages carry; `blockTs` is seconds because that is what the EVM provides. Mixing them up produces a staleness check that is wrong by a factor of 1000 — which will either never fire or always fire.

## Verification pipeline

Inherited from `OracleVerifier`, which runs before any price is stored:

1. Locate the Squidlor payload marker at the end of calldata.
2. Iterate data packages **backwards** from the end.
3. ECDSA-recover the signer of each package.
4. Check each signer against the authorized set via `authorisedSignerIndex`.
5. Use a **per-feed bitmap** to reject a second contribution from the same signer.
6. Collect values until `requiredSigners()` distinct signers are met, per feed.
7. Return the median per feed.

### Timestamp bounds

```solidity
function _validateTimestamp(uint256 timestampMs) internal view;
```

| Bound | Value |
| --- | --- |
| Maximum staleness | 3 minutes before block time |
| Maximum future drift | 1 minute after block time |

These are enforced in the contract, not configuration. No aggregator setting or operator action can widen them.

## Signer set

```solidity
function addSigner(address signer) external onlyOwner;
function addSigners(address[] calldata signers) external onlyOwner;
function removeSigner(address signer) external onlyOwner;
function setRequiredSigners(uint8 required) external onlyOwner;

function signerCount() external view returns (uint256);
function signerAt(uint256 index1Based) external view returns (address);
function isSigner(address signer) external view returns (bool);
```

`setRequiredSigners` is the M in M-of-N. It reverts with `ThresholdTooHigh` if it would exceed the signer count, and `ThresholdZero` for zero — so the threshold can never be set to something unsatisfiable or to nothing.

> [!IMPORTANT]
> The live deployment runs `requiredSigners = 1` with a single signer. The mechanism is real and enforced; the *configuration* provides no multi-party protection today. Whoever holds that key can publish any price the aggregator will then read. See the [trust model](/resources/trust-model).

## Ownership

```solidity
function owner() external view returns (address);
function pendingOwner() external view returns (address);
function transferOwnership(address newOwner) external onlyOwner;
function acceptOwnership() external;
```

Two-step by design: a transfer must be accepted by the incoming owner, so a typo in an address cannot permanently orphan the contract.

## Initialization

```solidity
function initializeFresh(address owner_, address[] calldata signers, uint8 required) external;
function initializeV2(address owner_, address[] calldata currentSigners) external;
```

`initializeFresh` is for a new deployment. `initializeV2` migrates an existing V1 adapter, adopting its current signers.

## Events

| Event | When |
| --- | --- |
| `DataFeedsUpdated(uint256 indexed roundId, uint256 updatedAt)` | Every successful update. Index on `roundId` to reconstruct history. |
| `SignerAdded(address indexed signer, uint256 indexed index)` | A signer is authorized. |
| `SignerRemoved(address indexed signer, uint256 indexed index)` | A signer is removed. |
| `RequiredSignersChanged(uint8 previous, uint8 current)` | The threshold changes. |
| `OwnershipTransferStarted` / `OwnershipTransferred` | Ownership handover. |

Monitoring `SignerAdded`, `RequiredSignersChanged`, and `OwnershipTransferred` is the practical way to detect a change in who controls the oracle.

## Errors

| Error | Trigger |
| --- | --- |
| `UpdateTooSoon(currentBlock, lastUpdateBlock, minInterval)` | Called within 3 seconds of the last update. |
| `StaleDataPackage(received, lastKnown)` | Proposed timestamp is not newer than the stored one. |
| `ZeroPrice(feedId)` | A verified median came out zero. |
| `RoundNotFound(roundId)` | Round ID is 0 or beyond the latest. |
| `InvalidPayload()` | The payload marker was not found in calldata. |
| `CalldataOverflow()` / `BadMetadataSize()` | Parsed offsets fall outside calldata. |
| `NoDataPackages()` | The package count is zero. |
| `PackageTimestampMismatch()` | A package timestamp differs from the expected one. |
| `SignerNotAllowed(address)` | A recovered signer is not authorized. |
| `InsufficientSigners(got, need)` | Not enough distinct signers for a feed. |
| `PriceTooOld(received, block)` / `PriceFromFuture(received, block)` | Timestamp bounds violated. |
| `ValueByteSizeTooLarge(size)` | A data point's value byte size is ≥ 33. |
| `AlreadySigner` / `NotASigner` / `TooManySigners` | Signer-set management errors. |
| `ThresholdTooHigh(required, signerCount)` / `ThresholdZero()` | Invalid threshold. |
| `NotOwner(caller)` / `NotPendingOwner(caller)` / `ZeroAddress()` | Access-control errors. |

## Calldata format

The signed payload is appended after the standard ABI-encoded arguments, and parsed backwards from the end:

```text
... [ABI args] [pkg_N] ... [pkg_1] [pkg_count:2] [meta_size:3] [marker:9]
                                                                ↑
                                              parsing starts here (backwards)
```

Each package:

```text
[data_points × (valueByteSize + 32)] [timestamp:6] [data_point_count:3] [value_byte_size:4] [signature:65]
```

The magic marker:

```text
0x0000000000000000000000000000000000000000000000000002ed57011e0000
```

Reading backwards is what allows a variable number of packages to ride along without their size being declared in the ABI. Building this payload is the relayer's job — see [push price updates](/integration/sending-updates).

## Storage layout

Prices are stored at slots derived from the feed ID:

```solidity
keccak256(abi.encode(feedId, "squid.price"))
```

Not at a position determined by declaration order. Two consequences:

- Adding an asset cannot collide with existing storage, so there is no migration.
- A proxy upgrade cannot accidentally shift where a price lives.

This is why the answer to "what does it cost to add a feed?" is one proxy deploy.
