---
title: Trust model
description: Exactly what you are trusting when you use Squidlor today, what could go wrong, and what closes each gap.
---

Every oracle asks for trust somewhere. This page states where Squidlor asks for it, in plain terms, without softening the parts that are uncomfortable.

If you are sizing risk for a protocol that will hold real money, this is the page that matters.

## What you trust, ranked

### 1. A single key controls every contract

One address — `0x34f54E0Ca7f18DB6F088297d3a34D67B57B443Cb` — is the deployer and owner of every live Robinhood Chain contract, and `superAdmin` of the registry.

That address can:

- Add, remove, and reorder sources on any aggregator.
- Change `selectionMode`, `minHealthySources`, and staleness windows.
- Add and remove oracle signers, and change the signer threshold.
- Repoint any pair in the registry to a different aggregator.

**If that key is compromised, the oracle can be made to report any price.** No amount of median aggregation defends against an attacker who can reconfigure which sources are medianed.

**What closes it:** moving ownership to a multisig, then to a timelock so configuration changes are visible before they take effect.

### 2. The signer set is one key

`SquidlorAdapterV2` runs `requiredSigners = 1` with a single authorized signer.

The M-of-N machinery is real and enforced on-chain. With N=1, it provides no protection. Whoever holds the signer key can publish any price into Squidlor's own feed.

The mitigation that partially holds today: for BTC/USD and ETH/USD, the aggregator medians the Squidlor feed **with** Chainlink. A compromised Squidlor signer moves the median only as far as the median voter — with two sources, it can pull the answer but not set it freely.

For SOL/USD there is no second source, and for the four equity pairs the Squidlor feed is not wired in at all.

**What closes it:** independent signers with independent key custody and `requiredSigners ≥ 3`.

### 3. The relayer decides what "the price" is

The relayer reads several venues, medians them off-chain, and signs the result. It could sign something else. On-chain verification proves the value was signed by an authorized key — not that the value is correct.

Layer 1 of the [aggregation architecture](/oracle/architecture) defends against a bad *venue*. It does not defend against a bad *relayer*. That is Layer 2's job, and Layer 2 currently has one signer.

**What closes it:** the same fix as above. Independent signers running independent relayers make relayer honesty verifiable rather than assumed.

### 4. Relayer liveness

Squidlor is a push oracle. If the relayer stops, the price stops updating, and consumers enforcing staleness will halt.

Halting is the correct failure — far better than serving a stale price as if it were fresh — but it is a liveness dependency on a single operator.

**What closes it:** redundant relayers with independent infrastructure.

### 5. Chainlink, where it is a source

Where an aggregator wires `ChainlinkSource`, you inherit Chainlink's trust model for that source. For the four equity pairs, which are Chainlink-only, **you are trusting Chainlink and Squidlor's configuration of it** — not a Squidlor-independent price.

### 6. The chain itself

Robinhood Chain has a single Robinhood sequencer and permissioned validators. Deployment is permissionless; block production is not. Chain-level liveness and censorship-resistance are Robinhood's, not Squidlor's.

## What you do not have to trust

Worth stating, because it is the part that is actually strong.

**Reads are trustless.** Reading an aggregator is an `eth_call`. You need no permission, no API key, and no Squidlor service. Squidlor cannot serve you a different price than it serves anyone else.

**The verification pipeline cannot be bypassed.** Signature checks, the signer bitmap, the 3-minute and 1-minute timestamp bounds, and monotonic ordering are enforced in the contract. No configuration change relaxes them.

**Replay is impossible.** Timestamps must be strictly increasing, so an old set of validly-signed packages can never be published again.

## Where Squidlor sits on the decentralization spectrum

Honestly: **low, today.** Lower than Chainlink and lower than Pyth on operator decentralization. A project claiming otherwise at this stage would be misrepresenting itself.

What is genuinely different is that the *architecture* is built for decentralization and the *configuration* has not caught up. M-of-N verification, the signer bitmap, and median aggregation are all built, tested, and enforced on-chain — they are running with N=1. Expanding the signer set is an operational task, not a rewrite.

That distinction is real, and it is also not the same as being decentralized. Both things are true.

## If you are integrating

Concretely, given the above:

**Bound staleness and health yourself.** Do not rely on the aggregator's `minHealthySources = 1`. Read `peek()` and enforce your own floor — see [read prices on-chain](/integration/reading-prices).

**Check how many sources back your pair.** BTC and ETH have two. SOL has one. Equities have one, and it is Chainlink. Size your exposure accordingly.

**Monitor ownership and configuration events.** `OwnershipTransferred`, `SignerAdded`, `RequiredSignersChanged`, and source changes on the aggregators you read. A change in who controls the oracle is a change in your risk.

**Add your own circuit breaker if you need one.** There is no maximum-deviation check on-chain. A colliding signer majority could publish an extreme price and nothing would reject it. If a sudden 40% move should pause your protocol, implement that yourself.

**Consider Squidlor a second opinion for equities, not a first.** Until the equity aggregators get their second source, they do not deliver Squidlor's core value proposition.

## Roadmap for closing these

In the order they matter:

1. **Multisig ownership** of the adapter and aggregators, then a timelock.
2. **Independent M-of-N signers** with independent key custody.
3. **Equity aggregators wired to a second source.**
4. **Redundant relayers.**
5. **Per-source health monitoring and alerting**, beyond the current admin panel.
6. **A deviation circuit breaker** at the contract level.

See the [roadmap](/resources/roadmap) for the full picture.
