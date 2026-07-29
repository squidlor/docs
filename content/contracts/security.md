---
title: Security properties
description: What the contracts cryptographically guarantee, what they assume, and the known limitations they do not address.
---

This page states what the contracts enforce and what they do not. The [trust model](/resources/trust-model) covers the operational side — who holds which keys.

## Signature security

### ECDSA with low-S canonicalization

Every price package is signed with secp256k1 ECDSA. `SignatureLib` enforces three things:

- **Valid recovery ID.** `v` must be exactly `27` or `28`. Anything else reverts with `InvalidSignature`.
- **Low-S form.** `s` must satisfy `s ≤ HALF_CURVE_ORDER`. This eliminates signature malleability: each signed message has exactly one valid signature form, so a malleated signature cannot be replayed as if it were distinct.
- **Non-zero recovery.** `ecrecover` returning `address(0)` reverts, which prevents an invalid signature from being accepted because it happened to recover to the zero address.

### Message hash integrity

The signed message is hashed directly from calldata with `keccak256(msg.data[start:end])`. No intermediate memory copy exists to be manipulated between hashing and verification.

## Signer authorization

### Allowlist

Only addresses registered in the adapter can contribute a value. A package signed by an unknown key reverts with `SignerNotAllowed`.

### Duplicate prevention via bitmap

Each signer has a unique index (0–255). Within a single `updateDataFeedsValues` call, a per-feed bitmap records which indices have contributed. A second package from an index whose bit is already set is ignored.

The consequence: **a compromised signer can contribute at most one value per feed per update.** It cannot inflate its influence by submitting many packages.

## Price manipulation resistance

### Median aggregation

The contract collects `requiredSigners` values per feed from distinct authorized signers and takes the median.

To shift the median, an attacker must control **more than half** of the contributing signers simultaneously. A single compromised signer among three has no effect at all:

```text
Signers submit: [98000, 98100, 75000]   ← attacker submits 75000
Sorted:         [75000, 98000, 98100]
Median:         98000                    ← attacker's value has zero effect
```

> [!WARNING]
> This guarantee is a function of the signer *count*, not of the mechanism. At `requiredSigners = 1` — the live configuration — there is no median to speak of and no manipulation resistance at this layer. The property described above becomes real only once the signer set is expanded.

## Timestamp security

| Protection | Enforcement |
| --- | --- |
| **Staleness rejection** | A price older than 3 minutes from `block.timestamp` reverts with `PriceTooOld`. |
| **Future rejection** | A price more than 1 minute ahead reverts with `PriceFromFuture`, preventing pre-signing a price for a future moment. |
| **Monotonic ordering** | `dataPackagesTimestamp` must be strictly greater than the last accepted one, so an old set of valid signatures cannot be replayed. |
| **Minimum interval** | A 3-second cooldown between updates prevents spam that could cause legitimate updates to race and fail. |

Monotonic ordering is the important one: it means signature validity alone is not sufficient to write a price. Old packages are permanently unusable, regardless of how well-formed they are.

## Storage integrity

### Keccak-derived slots

All price data lives at slots derived from `keccak256(abi.encode(...))`. No two feeds or rounds can collide, and a proxy upgrade cannot shift slot assignments.

### Overflow guards

Every narrowing cast is checked:

| Cast | Guard |
| --- | --- |
| `uint256` → `uint80` (round ID) | `UnsafeUint80Cast` |
| `uint256` → `uint128` (block timestamp) | `BlockTimestampOverflow` |
| `uint256` → `uint128` (data timestamp) | `DataTimestampOverflow` |
| `uint256` → `int256` (price) | `UnsafeInt256Cast` |

## Trust assumptions

The contracts are secure **if** these hold:

| Assumption | Mitigation if violated |
| --- | --- |
| At least `⌈threshold/2⌉ + 1` signers are honest | Raise the threshold; rotate compromised signers. |
| Signer private keys stay secret | Hardware wallets or HSMs for production signers. |
| The relayer is live within the staleness window | Run redundant relayers; monitor `DataFeedsUpdated`. |
| The proxy admin key stays secure | Use a multisig as the ProxyAdmin owner. |
| Aggregator owners act honestly | Watch ownership and source-configuration events. |

## Known limitations

Stated plainly, because a security page that lists only guarantees is not useful.

**No circuit breaker.** There is no maximum-deviation check between rounds. A colluding majority of signers could publish an extreme price and nothing on-chain would reject it. Consumers that need this protection must implement their own deviation bound.

**Relayer availability is a liveness dependency.** If no relayer submits for more than 3 minutes, the on-chain price goes stale. Protocols enforcing staleness will halt — which is the correct failure, but it is a halt.

**No cross-chain verification.** Each chain's deployment is independent. A price on one chain is not checked against the same asset's price on another.

**Signer set of one, today.** The most consequential limitation, and it is configuration rather than code. See the [trust model](/resources/trust-model).

**Source `name()` is unauthenticated.** An adapter self-reports its label. A source named `chainlink` is one the owner wired and named that way; the name is not proof of provenance. Verify the adapter address if provenance matters.

## Defensive integration

The single most valuable thing a consumer can do is bound both staleness and health itself:

```solidity
// Don't rely on the aggregator's own thresholds — set your own.
(int256 answer, uint256 freshestUpdatedAt, uint256 healthyCount) = aggregator.peek();

require(answer > 0, "invalid price");
require(block.timestamp - freshestUpdatedAt <= maxAge, "stale");
require(healthyCount >= 2, "insufficient source agreement");
```

The aggregator's `minHealthySources = 1` is chosen for availability across all consumers. Your protocol knows its own risk tolerance and should enforce it. More patterns in [read prices on-chain](/integration/reading-prices).
