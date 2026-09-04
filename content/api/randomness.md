---
title: Randomness
description: Read the commit-reveal randomness contract's state, fee, and recent requests.
---

`SquidlorCommitRevealRandomness` provides on-chain randomness through a commit-reveal scheme. This endpoint exposes its configuration and recent request history.

> [!WARNING]
> The randomness endpoint is currently **Arbitrum-only**. The service returns `404` for any other chain, including Robinhood Chain, even though a randomness contract is deployed there. Read it [directly on-chain](/networks/addresses) in the meantime.

## Get randomness state

```http
GET /v1/:chain/randomness
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `limit` | `10` | Recent requests to include. Capped at 50. |

```bash
curl "https://api.squidlor.com/aggregator/v1/arbitrum/randomness?limit=2"
```

```json
{
  "chainId": 42161,
  "contract": "0x0FC1feC8083a287f4508c76e922757c2A98e7E75",
  "entropy": "0x…",
  "provider": "0x…",
  "owner": "0x…",
  "feeWei": "100000000000000",
  "feeEth": "0.0001",
  "totalRequests": "412",
  "recentRequests": [
    {
      "sequenceNumber": "412",
      "requester": "0x…",
      "randomness": "0x9f2c…",
      "randomnessDecimal": "72014…",
      "requestedAt": 1785242800,
      "fulfilledAt": 1785242860,
      "fulfilled": true
    },
    {
      "sequenceNumber": "411",
      "requester": "0x…",
      "requestedAt": 1785242100,
      "fulfilled": false
    }
  ],
  "cachedAt": "2026-07-28T12:50:53.011Z"
}
```

### State fields

| Field | Meaning |
| --- | --- |
| `contract` | The randomness contract address. |
| `entropy` | The entropy source it is configured against. |
| `provider` | The address authorized to reveal. |
| `owner` | The contract owner. |
| `feeWei` / `feeEth` | Cost of one request, in wei and as a decimal string. |
| `totalRequests` | Lifetime request count. |

### Request fields

| Field | Meaning |
| --- | --- |
| `sequenceNumber` | Monotonic request identifier. |
| `requester` | The address that paid for and requested randomness. |
| `randomness` | The revealed value as hex. Absent while unfulfilled. |
| `randomnessDecimal` | The same value as a decimal `uint256` string. |
| `requestedAt` | Unix seconds when the request was made. |
| `fulfilledAt` | Unix seconds when it was revealed. Absent while unfulfilled. |
| `fulfilled` | Whether the reveal has happened. |

## How commit-reveal works here

1. A consumer pays `feeWei` and requests randomness, receiving a `sequenceNumber`.
2. The contract records the request along with the commitment.
3. After a reveal delay (5 blocks in the live configuration), the provider reveals the value, which the contract verifies against the commitment.
4. The consumer reads the revealed randomness.

The reveal delay is what prevents the provider from choosing a favourable value after seeing the request's consequences. It also means randomness is **not** available in the same transaction as the request.

> [!IMPORTANT]
> A `fulfilled: false` request is not an error; it is a request still inside its reveal window. Any consumer that needs randomness must be written to handle the two-step flow. If your logic needs a value synchronously, commit-reveal is the wrong primitive.

## Errors

| Status | Meaning |
| --- | --- |
| `404` | No randomness contract configured for this chain on this instance. |
| `500` | RPC failure. |
