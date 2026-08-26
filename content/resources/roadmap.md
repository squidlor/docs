---
title: Roadmap
description: What is shipping next across the oracle and the agent layer — ordered by what unblocks the most.
---

Ordered roughly by impact. Items that close a [trust-model](/resources/trust-model) gap come first, because they are what make everything else worth relying on.

> [!NOTE]
> This is a public roadmap of product and decentralization work. It is not a commitment to dates, and internal operational tasks are not listed here.

## Decentralization

The highest-priority work, because it is what currently limits how much value can safely sit on the oracle.

| Initiative | What it unlocks |
| --- | --- |
| **Multisig ownership** of the adapter and aggregators, then a timelock | No single key can reconfigure the oracle, and changes become visible before they take effect. |
| **Genuine M-of-N signers** with independent key custody | A compromised signer can no longer publish a price. The mechanism is already built and enforced — it is running with N=1. |
| **Redundant relayers** | Removes the single-operator liveness dependency. |
| **Contract-level deviation circuit breaker** | Rejects an extreme price on-chain rather than relying on every consumer to implement its own bound. |

## Oracle

| Initiative | What it unlocks |
| --- | --- |
| **Wire Squidlor equity feeds as a second source** on the four equity aggregators | Cross-oracle aggregation for equities, which is currently Chainlink-only. The feeds are already deployed. |
| **Resolver oracles — sports** | Sports outcomes become readable on-chain automatically. A pilot already runs via `sports-pusher`. |
| **Resolver oracles — politics, weather, custom events** | Any outcome that can be indexed becomes attestable without an admin. |
| **Per-source health metrics and alerting** | Deviation and staleness become observable beyond the admin panel's aggregator tab. |
| **Robinhood Chain in the public API and SDK** | The primary deployment becomes readable through the same tooling as Arbitrum. |
| **More pairs** | Chainlink's reference set on chain 4663 carries 55 feeds; USDG, USDC, USDT, LINK, MSFT, META, AMD, AMZN, SPY, and QQQ are available to wire. |

The equity second source is the most consequential item here. Until it lands, the four equity aggregators do not deliver the multi-source guarantee that is Squidlor's core claim for that asset class.

## Chain expansion

| Initiative | What it unlocks |
| --- | --- |
| **Additional EVM chains** | Each deployment is a script plus configuration — no Solidity changes, as the Robinhood launch demonstrated. |
| **SDK coverage per chain** | Closed. `@squidlor/oracle-sdk` 0.2.0 ships addresses for Robinhood Chain, Arbitrum and Qubetics. |

## AI and agents

| Initiative | What it unlocks |
| --- | --- |
| **Oracle Chat and the MCP server into production** | Closed. Chat is live at [chat.squidlor.com](https://chat.squidlor.com), MCP at `api.squidlor.com/mcp`. |
| **Paid chat credits over x402** | Built and switched off. A user out of daily messages can pay instead of waiting for midnight. |
| **Wallet and quote tools over MCP** | Chat serves them today. The public MCP endpoint does not advertise them yet. |
| **Evaluate ACP / GAME SDK integration** | An open question with no code yet. |

## Reading the roadmap honestly

Two things worth noticing about the shape of this list.

**The decentralization items are first because they are load-bearing.** More pairs and more chains increase surface area; they do not increase how much anyone should be willing to trust the oracle. The signer set and ownership work is what raises that ceiling.

**Several items are configuration, not construction.** M-of-N signing, the deviation-tolerant median, and the health filtering are all built and running. Multisig ownership and an expanded signer set are operational changes to systems that already work. That is a genuinely different position from having to build them — and it is also not the same as having done them.
