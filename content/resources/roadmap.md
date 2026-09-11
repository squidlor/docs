---
title: Roadmap
description: What is shipping next across the oracle, the products and the agent layer, ordered by what unblocks the most, with the items that closed since launch.
---

Ordered roughly by impact. Items that close a [trust-model](/resources/trust-model) gap come first, because they are what make everything else worth relying on.

> [!NOTE]
> This is a public roadmap of product and decentralization work. It is not a commitment to dates, and internal operational tasks are not listed here.

## Decentralization

The highest-priority work, because it is what currently limits how much value can safely sit on the oracle.

| Initiative | What it unlocks |
| --- | --- |
| **Multisig ownership** of the adapter and aggregators, then a timelock | No single key can reconfigure the oracle, and changes become visible before they take effect. |
| **Genuine M-of-N signers** with independent key custody | A compromised signer can no longer publish a price. The mechanism is built and enforced; it runs with `requiredSigners = 1`, and Base's several signer keys are all Squidlor's. |
| **Redundant relayers** | Removes the single-operator liveness dependency. Robinhood Chain's paused relay is the current example of what one operator means. |
| **Contract-level deviation circuit breaker** | Rejects an extreme price on-chain rather than relying on every consumer to implement its own bound. |
| **Feed freshness and relayer wallet-balance alerting on every chain** | Today the watchdog covers Base feeds only. A stalled relay or an empty gas wallet should page within minutes; see the incidents on [measured performance](/oracle/evidence). |

## Oracle

| Initiative | What it unlocks |
| --- | --- |
| **Resume the Robinhood Chain relay** | Every 4663 pair returns to two healthy sources. The contracts and wiring are in place; this is an operational decision. |
| **Extended-hours equity pushes** | Built and switched off. Sources now prove their own freshness, so pre-market and after-hours pushes can go out without medianing frozen closes. Rolls out in shadow first. |
| **Base in the SDK and the agent tool chain list** | `@squidlor/oracle-sdk` and `@squidlor/oracle-tools` know `arbitrum` and `robinhood`. Base is on the HTTP API only. |
| **Merkle-anchored history proofs** | Built and verified, not deployed: `/feeds/{pair}/at/proof` against an on-chain anchor, so a past median can be proven rather than trusted. |
| **Resolver oracles: sports, then weather and custom events** | Sports runs as a pilot on Arbitrum. The price resolver is in production on Base. |
| **Revive or remove stale Arbitrum sources** | Provider scorecards show 7 of 15 Arbitrum sources fresh less than half the time. Measurable now, so fixable. |
| **More pairs** | On Base, any Coinbase B20 stock is a relay-config change. On Robinhood Chain, Chainlink's reference set carries 55 feeds including USDG, USDC, USDT, LINK, MSFT, META, AMD, AMZN, SPY and QQQ. |

## Products

| Initiative | What it unlocks |
| --- | --- |
| **One session across every surface** | The [hub](/products/hub) signs you into the platform. Oracle Chat and the builder portal still keep their own sign-in until they accept the platform token, a small additive change on each. |
| **Markets collateralised in stock tokens** | A market on NVDA paid in NVDAc. One `setCollateralAllowed` call on the factory, blocked on verifying how B20 rebases balances. |
| **Season 1 settlement** | Points run 2026-09-10 to 2026-09-23. Settlement is a Merkle root the claim page verifies against, built and tested. |
| **Creator fee claims and profiles on the trade page** | Shipped. Claimable fees are simulated per pool; profiles and images are creator-signed. |

## Chain expansion

| Initiative | What it unlocks |
| --- | --- |
| **Additional EVM chains** | Each deployment is a script plus configuration. Robinhood Chain and Base both landed without a Solidity change. |

## AI and agents

| Initiative | What it unlocks |
| --- | --- |
| **Paid chat credits over x402** | Built and switched off. A user out of daily messages can pay instead of waiting for midnight. |
| **Wallet and quote tools over MCP** | Chat serves them today. The public MCP endpoint does not advertise them yet. |
| **X agent posting live** | Runs in draft mode: replies are composed and held for review. Turning autonomy on is a switch, once the per-post cost has been measured. |
| **Evaluate ACP / GAME SDK integration** | An open question with no code yet. |

## Closed since launch

| Item | Closed |
| --- | --- |
| Oracle Chat and the MCP server into production | August 2026 |
| Robinhood Chain in the public API and SDK | August 2026 |
| Base as a third oracle chain, all pairs two-source | 2026-08-30 to 2026-09-02 |
| Equity feeds wired as a second on-chain source | Live on Base 2026-09-02; wired on Robinhood Chain |
| Prediction market live on Base with gasless trading | 2026-09-01 |
| Tokenized-stock markets with a session-hours gate | 2026-09-02 |
| Stock-paired launchpad: GEYSER desk and squidlor.trade | 2026-09-03 |
| The hub at app.squidlor.com | 2026-09-04 |
| Daily price book, permanent 00:00 UTC prices | 2026-08-27 |
| Provider scorecards and `get_price_at` | 2026-08-11 |

## Reading the roadmap honestly

Two things worth noticing about the shape of this list.

**The decentralization items are first because they are load-bearing.** More pairs, more chains and more products increase surface area; they do not increase how much anyone should be willing to trust the oracle. The signer set and ownership work is what raises that ceiling, and a prediction market settling on the oracle makes that work more urgent, not less.

**Several items are configuration, not construction.** M-of-N signing, the deviation-tolerant median, the health filtering, extended-hours pushes and history proofs are all built. Multisig ownership and an expanded signer set are operational changes to systems that already work. That is a genuinely different position from having to build them, and it is also not the same as having done them.
