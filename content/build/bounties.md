---
title: Bounties
description: Specific things we will pay cash for: priced, scoped, and open to anyone.
---

Bounties are the things we most want built and have not built ourselves. Each is scoped, priced in USDC, and judged by a human.

The live board with current status is at [build.squidlor.com/bounties](https://build.squidlor.com). This page explains how it works and what the opening slate is.

## How to claim

1. Read the bounty's requirements on the board.
2. Build it. Talk to us first (<build@squidlor.com>) if scope is ambiguous; we would rather answer a question than reject a submission.
3. Submit a link (repo, deployed address, live URL) against one of your projects in the portal.
4. We review weekly.

**Submitting does not lock a bounty.** Several people may submit for the same one and the first accepted submission is paid; a claim button that reserved work would let a drive-by park a bounty for a month. If two good submissions land close together, we will talk to both of you.

## What gets accepted

- It works against **live** feeds, not a mock.
- Source is public and licensed permissively.
- A stranger can run it from the README alone.
- If it is a contract, it is deployed and verified on a supported chain.

## What we are paying for

Amounts are the budgeted range; the board is authoritative.

### On-chain consumers

| Bounty | Reward |
|---|---|
| First lending market using an equity feed as collateral on Robinhood Chain | $3,000–5,000 |
| First perps or synthetic market consuming a Squidlor aggregator | $3,000–5,000 |
| An index or basket product over 2+ Squidlor feeds | $2,000 |

These are the highest-value bounties because a live consumer contract is the strongest evidence the oracle is useful. Robinhood Chain's own docs invite third parties to build price-aware contracts, and there is no competing grants program there.

### Oracle layer

| Bounty | Reward |
|---|---|
| eOracle source adapter (`IPriceSource`), tested and merged | $1,500 |
| Uniswap V3 TWAP source hardened against short-window manipulation | $1,500 |
| A third-party resolver oracle (`IResolver`) with a working pilot | $2,000–4,000 |

### Tooling

| Bounty | Reward |
|---|---|
| Python client for the REST API, published to PyPI | $1,000 |
| Go or Rust client | $1,000 |
| Grafana/Datadog dashboard template over the audit endpoint | $500 |
| A genuinely novel agent using the MCP server | $1,000–2,000 |

## Payment

Cash bounties are paid in USDC to the payout address on your account, settled through the same epoch mechanism as [points](/build/rewards). Some bounties also carry a points award, listed on the board.

You will need a payout address and accepted rewards terms before we can pay you.

## Proposing one

If you want to build something not listed, email <build@squidlor.com> with what it is, what it needs from us, and what you think it is worth. Ideas that unblock other builders (a client library, a template, a testing harness) are the easiest yes.
