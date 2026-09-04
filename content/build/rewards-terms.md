---
title: Rewards terms
description: The terms that apply to Squidlor builder points and bounty payments.
---

> [!WARNING]
> **This document has not yet been reviewed by counsel.** It is a good-faith draft written to
> be accurate about how the program actually works. It must be reviewed before Season 0 is
> announced publicly, and the reviewed version replaces this page.

These terms apply to the Squidlor builder rewards program ("the Program"). By accepting them
in the [builder portal](https://build.squidlor.com) you agree to them.

## 1. What points are

Points are a discretionary internal record of contribution to the Squidlor ecosystem.

**Points are not:**

- a currency, security, financial instrument, or investment of any kind;
- a claim on Squidlor, its treasury, its revenue, or any token;
- a promise that any token will exist, or that points will convert into one;
- transferable, tradeable, or saleable.

Squidlor may adjust, recalculate, withhold, expire, or void points at its sole discretion,
including retroactively where points were earned through error, abuse, or conduct described
in §5. Points carry no monetary value and no guaranteed exchange rate to anything.

If a Squidlor token is ever issued, any relationship between points and that token would be
determined at Squidlor's sole discretion at that time. **Nothing in the Program is an offer,
solicitation, or commitment to issue, sell, or distribute any token or security.** Anyone
quoting you a conversion rate is speculating.

## 2. What bounties are

Bounties are payments for specified work, denominated in USD and settled in a stablecoin or
the network's native asset at Squidlor's discretion.

- Submitting does not reserve a bounty. Multiple people may submit for the same one; the
  first submission Squidlor accepts is the one paid.
- Acceptance is at Squidlor's discretion, judged against the requirements published on the
  bounty at the time of submission.
- Work submitted must be yours to submit, and must be licensed permissively enough for us to
  reference and for others to use.
- Payment follows acceptance, not submission.

## 3. Eligibility

You must:

- be at least 18 years old, or the age of majority where you live, whichever is greater;
- not be a resident of, or located in, a jurisdiction subject to comprehensive sanctions, and
  not be a person or entity on any applicable sanctions or restricted-party list;
- not be prohibited from receiving payments under the laws that apply to you;
- provide a payout address you control.

Squidlor may decline to make any payment where doing so would be unlawful, would breach
sanctions, or where eligibility cannot be established. **Claims may be geo-restricted.**
Points continue to accrue in that case; they simply cannot be settled.

You are solely responsible for determining and paying any tax arising from participation.
Squidlor does not provide tax advice.

## 4. How points are calculated

The methodology is published on the [builder rewards](/build/rewards) page and is the
authoritative description of how points are computed. In summary:

- Usage points come from metered API requests attributed to your API key, log-scaled and
  capped per project per epoch.
- One-time awards exist for reaching an integration threshold and for a verified showcase
  listing.
- Multipliers for agent traffic and for a verified on-chain consumer require a
  Squidlor-verified project on a Squidlor-trusted account.
- Content, template and referral awards are assessed by a human.

Machine-computed points enter the ledger as **pending** and are settled only after human
review. Squidlor may reject any row, and may change the methodology between epochs; changes
apply prospectively and are noted in the [changelog](/build/changelog).

Once an epoch is settled on-chain, its rows are final and are not retroactively edited.

## 5. Conduct that voids rewards

The Program pays for genuine contribution. The following void points and may result in
suspension:

- generating requests for the purpose of accruing points rather than operating a real
  integration, including automated traffic with no downstream use;
- operating multiple accounts to multiply awards intended to be one-time per person or
  per project;
- misrepresenting a project, its usage, its relationship to Squidlor, or its authorship;
- registering a contract you do not control, or that does not consume Squidlor feeds;
- submitting work you do not have the right to submit;
- attempting to interfere with the metering, points, or settlement systems.

Squidlor may suspend an account pending investigation. Suspended accounts are excluded from
all epochs while suspended.

## 6. Settlement

Approved points are settled by publishing Merkle roots to the `RewardDistributor` contract on
a chain Squidlor selects. Claiming is your action: you call the contract from your payout
address and pay the gas. Squidlor never takes custody of a claim on your behalf.

An epoch may be skipped for your account if you have no payout address on file or have not
accepted these terms. Points are retained and settle in a later epoch once resolved.

Unclaimed amounts may be rolled into a later epoch's pool after a reasonable claim window.

Squidlor does not guarantee that any epoch will be funded, or funded to any particular
amount.

## 7. Program changes

Squidlor may modify, suspend, or end the Program, any season, or any bounty at any time.
Where a change materially affects how points are earned, it will be reflected on the rewards
page and in the changelog. Continued participation after a change constitutes acceptance
of it.

## 8. No relationship

Participation does not create an employment, partnership, agency, or joint-venture
relationship. You are not a contractor of Squidlor by virtue of earning points, and the
Program does not entitle you to any role or access beyond the portal.

## 9. No warranty and limitation of liability

The Program, the API, the SDK, the MCP server and the contracts are provided **as is**,
without warranty of any kind. Oracle data may be delayed, incorrect, or unavailable; you are
responsible for the staleness and health checks appropriate to your use; see
[trust model](/resources/trust-model).

To the maximum extent permitted by law, Squidlor is not liable for any indirect,
incidental, consequential, or punitive damages, or for lost profits, arising from
participation in the Program.

## 10. Contact

Questions, disputes, or a case you think was decided wrongly: <build@squidlor.com>. We would
rather correct a mistake than defend it.

---

*Last updated with the builder platform launch. See the [changelog](/build/changelog).*
