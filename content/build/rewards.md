---
title: Builder rewards
description: Season 0 pays for verifiable work on Squidlor — metered usage, verified on-chain consumers, agent integrations, templates and referrals.
---

Season 0 rewards people who build on Squidlor. The program pays for things we can verify: requests we metered, contracts we confirmed read our feeds, code that got merged. Not for signups, follows or form submissions.

> **Points are discretionary.** They are a record of contribution. They carry no monetary value and confer no right to any token or payment. Squidlor may adjust, withhold or convert points at its sole discretion. Cash bounties are paid per their own terms. Nothing here is an offer of a security.

## How to be eligible

1. [Get an API key](/build/authentication) and use it — anonymous traffic earns nothing because we cannot attribute it.
2. Create a project in the [portal](https://build.squidlor.com) and submit it to the [showcase](/build/showcase).
3. Add a payout address and accept the [rewards terms](/build/rewards-terms), or an epoch will skip you (your points are kept, not lost).

## What earns points

| Category | What we verify | Points |
|---|---|---|
| Integration live | Your project crossed 10,000 lifetime metered requests | 5,000 once |
| Sustained usage | Weekly metered requests, log-scaled | up to 1,000/week |
| Showcase verified | Admin-reviewed listing | 2,500 once |
| Content & templates | A merged template, tutorial or source adapter | 1,000–10,000 |
| Referral | Someone you referred reached "integration live" | 1,000 each |
| Bounty | An accepted [bounty](/build/bounties) submission | varies + cash |

### Multipliers

| Multiplier | Condition |
|---|---|
| **1.5×** agent | More than half your traffic arrives through the [MCP server](/build/quickstart-agents) with your key attached |
| **2×** on-chain | You registered a consumer contract and we verified it reads a Squidlor aggregator |

Multipliers apply to usage points only, stack with each other, and require a **verified project on a trusted account**. Without that gate, "my traffic is agent traffic" would be a self-declaration worth money.

### Why usage points are log-scaled

Weekly usage points are `100 × log₁₀(1 + requests)`, capped at 1,000. Ten thousand requests earns 400; ten million earns 700. A real integration reaches most of the curve, and burning requests to farm the rest is deliberately unprofitable.

## How settlement works

Rewards settle on the same `RewardDistributor` contract that pays validators — no new contract, and its payout formula reduces to exact pro-rata by points:

```
reward = pool × (your points / total points)
```

Each week:

1. A cron aggregates metered usage into **pending** ledger rows, showing its arithmetic per project.
2. We review the epoch and approve or reject rows.
3. Approved points become two Merkle roots, posted on-chain.
4. You claim from the portal with your wallet.

Points that are computed are not points that are paid — approval is a human step, deliberately. Once an epoch is posted, its rows are frozen; we do not retro-edit settled history.

## Anti-farming

Stated plainly, because a rewards program without this is a faucet:

- Points require a key on a real account; anonymous traffic scores zero.
- Usage points are per-project, log-scaled and capped, so volume plateaus fast.
- Multipliers need admin verification of both project and account.
- Referrals pay only when the referred builder actually ships, never on signup.
- Request-pattern anomalies are flagged for review before an epoch is approved.
- Accounts sharing a payout address are merged into one payout.
- Cash bounties are judged by a human.

## Season 0 at a glance

| | |
|---|---|
| Epoch length | 7 days |
| Bounty pool | $23,500 USDC across 10 open [bounties](/build/bounties) |
| Settlement chain | announced with the first funded epoch |
| Payout asset | announced with the first funded epoch |

Check your standing at [build.squidlor.com/rewards](https://build.squidlor.com) — current points, pending epoch, history and claims.

## Questions we expect

**Do points become a token?** Possibly, at our discretion, and we will not promise a rate. Anyone telling you a conversion figure is guessing.

**Can I earn without writing code?** Content and templates count. Engagement does not.

**What if I only build on-chain and never touch the API?** Register your consumer contract. A verified consumer earns the integration award and the 2× multiplier; you do not need API traffic to qualify.

**I am in a restricted jurisdiction.** Claims are geo-gated per the rewards terms. Points still accrue.

The full terms are on the [rewards terms](/build/rewards-terms) page.

Something unclear or seemingly unfair? <build@squidlor.com> — the rules are meant to be arguable.
