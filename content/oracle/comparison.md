---
title: How it compares
description: Squidlor Oracle against Chainlink, Pyth, API3, UMA, and Chronicle, including where the competition genuinely wins.
---

The useful version of this comparison names the losses as well as the wins. Squidlor is younger and less decentralized than the incumbents; it is also structurally different in ways that matter for some integrations and not others.

## Side by side

| Property | **Squidlor** | Chainlink | Pyth | API3 | UMA | Chronicle |
| --- | --- | --- | --- | --- | --- | --- |
| Settlement model | Push (relayer pays) | Push | Pull (user pays) | Push (first-party) | Optimistic, dispute-based | Push |
| Latency for new pushes | ~3s floor | ~5–60 min | Sub-second (on pull) | ~minutes | 24–48h dispute window | ~minutes |
| Multi-asset per transaction | One tx, N feeds | One per feed | Per-pull | Per-publisher | n/a | On-chain median |
| Chainlink-interface compatible | Yes | Yes (it is the standard) | Wrapper needed | Yes | No | Custom |
| Custom event outcomes | Roadmap | Functions / Any-API | No | No | Yes, its core use case | No |
| Self-owned full stack | Yes | No, third-party network | No, third-party | Federated | No, third-party | Yes |
| Layers of aggregation | Source + signer + oracle | Signer + oracle | Oracle only | Oracle only | Single, dispute-based | Signer + oracle |
| Deployable on any EVM chain | Single contract deploy | Needs node deployment | Needs Wormhole / Pythnet | Needs publisher onboarding | Needs UMA contracts | Maker-centric |

## Where Squidlor wins

**No external dependency that can deprioritize your chain.** A third-party oracle network decides which chains it serves and how well. Squidlor's whole stack deploys from a forge script, so a chain's coverage is not somebody else's roadmap decision.

**A real second source for single-oracle asset classes.** Tokenized equities are the clearest case: most chains have exactly one stock oracle, which makes it a single point of failure by construction. Squidlor runs its own independent equity source, so a second opinion exists at all.

**Cheap multi-asset updates.** One transaction updates every feed. Five feeds landed for about $0.05 on the live deployment. Per-feed transactions do not scale to a wide asset list on a chain with meaningful gas.

**Push cadence as a product knob.** Because Squidlor operates its own relayer, update frequency is a decision rather than a vendor parameter. A 3-second floor is available where it is worth the gas.

**One stack for price *and* event data.** Most systems need a price oracle from one vendor and an outcome oracle from another. See [resolver oracles](/oracle/resolver-oracles).

**Zero-dependency chain expansion.** No node software, no validator onboarding, no bridge. A single contract set and an environment file.

## Where competitors win

**Chainlink: adoption and brand.** Chainlink is the interface everyone already implements and the name that passes a risk committee without discussion. That is a real advantage and not one Squidlor claims to have.

**Pyth: sub-second latency for gas-paying consumers.** For a perp DEX willing to pay per read, pull-based sub-second pricing is simply better than any push cadence. Different architecture, different right answer.

**UMA: battle-tested dispute resolution.** For genuinely ambiguous outcomes, where the question is contestable rather than merely unknown, an economic dispute system is the correct mechanism, and UMA's is proven.

**Chainlink and Pyth: far greater operator decentralization, today.** This is the honest gap. Squidlor's signer set is currently one key. The contracts enforce M-of-N and the roadmap closes it, but as of now the incumbents are meaningfully more decentralized and it would be misleading to imply otherwise.

## Choosing

| If you need… | Consider |
| --- | --- |
| Sub-second prices and can pay per read | Pyth |
| Maximum operator decentralization today | Chainlink |
| Resolution of genuinely contestable outcomes | UMA |
| A second independent source for tokenized equities | Squidlor |
| Wide asset coverage cheaply on an emerging chain | Squidlor |
| Price and event data from one stack | Squidlor |
| An oracle you control end to end | Squidlor |

Squidlor is transparent about sitting lower on the decentralization spectrum at launch. Read the [trust model](/resources/trust-model) and decide with the actual facts in hand.
