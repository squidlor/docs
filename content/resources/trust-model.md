---
title: Trust model
description: Exactly what you are trusting when you use Squidlor today, what could go wrong, and what closes each gap.
---

Every oracle asks for trust somewhere. This page states where Squidlor asks for it, in plain terms, without softening the parts that are uncomfortable.

If you are sizing risk for a protocol that will hold real money, this is the page that matters.

## What you trust, ranked

### 1. A single key controls every contract

One address is the deployer and owner of every live contract and `superAdmin` of the registry: `0xB57BBda48C33fF725E93D604023D56D9C5b00e2a`. It also owns the prediction market's contracts and mints sqUSD. The relay signs with a separate key, `0x94d89f2C7F0fa43fED39Bd07bE04a1606CD669C9`, which does nothing else.

That address can:

- Add, remove, and reorder sources on any aggregator.
- Change `selectionMode`, `minHealthySources`, and staleness windows.
- Add and remove oracle signers, and change the signer threshold.
- Repoint any pair in the registry to a different aggregator.

**If that key is compromised, the oracle can be made to report any price.** No amount of median aggregation defends against an attacker who can reconfigure which sources are medianed.

**What closes it:** moving ownership to a multisig, then to a timelock so configuration changes are visible before they take effect.

### 2. The signer set is one key

`SquidlorAdapterV2` runs `requiredSigners = 1`. There are several authorized signer keys, one per relay process, but they are all operated by Squidlor, so for trust purposes it is one signer.

The M-of-N machinery is real and enforced on-chain. With N=1, it provides no protection. Whoever holds the signer key can publish any price into Squidlor's own feed.

The mitigation is currently OFF-CHAIN, and you should size your trust accordingly. On Arc no third-party push oracle publishes yet, so each aggregator has one on-chain leg: ours. What medians several independent sources is the relay, before it signs. That defends against one venue being wrong; it does not defend against our signer being wrong, which an on-chain second source would.

The [prediction market](/products/markets) settles against the adapter's own round through `SquidlorPriceResolver`, not against the aggregator, so a market's outcome is decided by Squidlor's signer. That is by design (settlement needs a fixed cadence the aggregator does not have) and it is the sharpest consequence of the single-signer configuration.

**What closes it:** independent signers with independent key custody and `requiredSigners ≥ 3`.

### 3. The relayer decides what "the price" is

The relayer reads several venues, medians them off-chain, and signs the result. It could sign something else. On-chain verification proves the value was signed by an authorized key, not that the value is correct.

Layer 1 of the [aggregation architecture](/oracle/architecture) defends against a bad *venue*. It does not defend against a bad *relayer*. That is Layer 2's job, and Layer 2 currently has one signer.

**What closes it:** the same fix as above. Independent signers running independent relayers make relayer honesty verifiable rather than assumed.

### 4. Relayer liveness

Squidlor is a push oracle. If the relayer stops, the price stops updating, and consumers enforcing staleness will halt.

Halting is the correct failure (far better than serving a stale price as if it were fresh), but it is a liveness dependency on a single operator.

**What closes it:** redundant relayers with independent infrastructure.

### 5. Chainlink, where it is a source

Where an aggregator wires `ChainlinkSource`, you inherit Chainlink's trust model for that source. No such source is wired on Arc today, so every reading is Squidlor's own; the aggregator contract supports adding one to a live pair without a redeploy, and that is the plan the moment a provider publishes there.

### 6. The chain itself

Arc is Circle's L1 with a permissioned validator set and instant finality on inclusion. Deployment is permissionless; block production is not. Chain-level liveness and censorship-resistance are the validators', not Squidlor's. Gas is paid in USDC, so a funded relay does not need a volatile asset to keep publishing.

## What you do not have to trust

Worth stating, because it is the part that is actually strong.

**Reads are trustless.** Reading an aggregator is an `eth_call`. You need no permission, no API key, and no Squidlor service. Squidlor cannot serve you a different price than it serves anyone else.

**The verification pipeline cannot be bypassed.** Signature checks, the signer bitmap, the 3-minute and 1-minute timestamp bounds, and monotonic ordering are enforced in the contract. No configuration change relaxes them.

**Replay is impossible.** Timestamps must be strictly increasing, so an old set of validly-signed packages can never be published again.

## Where Squidlor sits on the decentralization spectrum

Honestly: **low, today.** Lower than Chainlink and lower than Pyth on operator decentralization. A project claiming otherwise at this stage would be misrepresenting itself.

What is genuinely different is that the *architecture* is built for decentralization and the *configuration* has not caught up. M-of-N verification, the signer bitmap, and median aggregation are all built, tested, and enforced on-chain; they are running with N=1. Expanding the signer set is an operational task, not a rewrite.

That distinction is real, and it is also not the same as being decentralized. Both things are true.

## If you are integrating

Concretely, given the above:

**Bound staleness and health yourself.** Every Arc pair runs `minHealthySources = 1` today, because there is one on-chain leg. That means the aggregator will answer from a single source: read `peek()` and enforce your own bound rather than relying on the floor; see [read prices on-chain](/integration/reading-prices).

**Check how many sources back your pair.** Every Arc pair has one on-chain leg today. The [measured performance](/oracle/evidence) page shows what the legs did historically. Size your exposure accordingly.

**Monitor ownership and configuration events.** `OwnershipTransferred`, `SignerAdded`, `RequiredSignersChanged`, and source changes on the aggregators you read. A change in who controls the oracle is a change in your risk.

**Add your own circuit breaker if you need one.** There is no maximum-deviation check on-chain. A colliding signer majority could publish an extreme price and nothing would reject it. If a sudden 40% move should pause your protocol, implement that yourself.

**Read the source count, not the promise.** Until a second on-chain leg exists, an Arc aggregator is our signed median with a cross-oracle interface; treat it as such.

## The hardening ladder

Each rung has a trigger rather than a date. The order does not change; dates appear here when a rung is scheduled, and chain programs move the ladder because their validators are the signers it needs.

| Rung | Trigger | What it closes |
| --- | --- | --- |
| Dedicated relay key, published | Done | The key that signs the feeds does nothing else |
| Feed freshness and relayer wallet-balance alerting, every chain | Before the next chain deployment | Gap 4, relayer liveness, stops being discovered by consumers |
| Owner multisig, then a timelock | First partner chain in production, or first third-party protocol holding value on the feeds | Gap 1, the single owner key |
| Independent signers, `requiredSigners` 2-of-3 | Three external signers onboarded, expected to be a partner chain's validators | Gaps 2 and 3, the single signer and the relayer deciding the price alone |
| A second on-chain source per pair | A push oracle publishing on Arc, then `addSource` on the live aggregator | Every pair back to a real on-chain median |
| Redundant relayers | Follows the signer rung; each signer runs its own | Gap 4 for good |
| `requiredSigners` 5-of-9 with stake-backed slashing | Nine signers onboarded | Collusion becomes expensive |
| Contract-level deviation circuit breaker | Scoped with the first partner chain's risk team | The missing on-chain maximum-spread guard |

How chains supply the signers is on [bring Squidlor to your chain](/networks/for-chains). What the deployment has actually done so far, including the rounds it refused, is on [measured performance](/oracle/evidence). The full product roadmap is on [roadmap](/resources/roadmap).
