---
title: Clippers
description: Clip contests on squidlor.com. Connect a wallet, submit a public video link, get reviewed and paid after a monitoring window.
---

Clippers is a clipping-contest surface at [squidlor.com/clippers](https://squidlor.com/clippers). Squidlor posts a contest, clippers submit the public link to a video they made, the team reviews entries and logs view metrics, and rewards are paid after a monitoring window. It has run on the platform since August 2026 and has a chapter in the [hub](/products/hub).

## The flow

1. **A contest opens.** It appears on the page as soon as it is created, with a deep link of the form `/clippers?contest=<id>`.
2. **Connect a wallet.** The same Sign-In with Ethereum handshake the [hub](/products/hub) and [markets](/products/markets) use. One signature, no gas.
3. **Fill in a profile, once.** Username, email and at least one social handle. Submitting without one returns `428 Precondition Required`, and the page opens the form instead of showing an error.
4. **Submit a link.** Submitting is what reserves a slot, so a slot is only spent by a wallet that delivered a video. One entry per wallet per contest, and the same video URL cannot be submitted twice.
5. **Review.** An approval starts a 14-day monitoring window. A rejection carries a note and lets you replace the link.
6. **Metrics and payout.** Views are logged during the window and the reward is recalculated on each update. The last figure before the window ends is what gets paid, and the payout is recorded against the entry.

## Where it runs

Clippers adds no service. It rides the platform's user service through the gateway at `https://api.squidlor.com/user/clippers/*`, and the page is part of the marketing site. Contests are created and reviewed in the operator console.

Nothing here touches the oracle or a chain. The wallet is an identity, not a payment method.
