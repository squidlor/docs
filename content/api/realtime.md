---
title: Realtime prices
description: The 1-second off-chain price feed — REST snapshot, Server-Sent Events, socket.io, and signed webhooks — and how it differs from the on-chain value.
---

Squidlor runs two feeds at two cadences, on purpose.

| | Off-chain (this page) | On-chain (`/v1/feeds`) |
| --- | --- | --- |
| Cadence | **1 second** | 0.5% deviation, or 1h heartbeat |
| Source | median of live venue WebSockets | the value stored in the aggregator contract |
| Cost per update | zero | gas |
| Use it for | charts, tickers, alerts, UI | liquidations, settlement, anything a contract reads |

This is the same split Chainlink and Pyth use — continuous computation off-chain, threshold-gated publication on-chain — because latency is free off-chain and costs gas on-chain. Measured on Robinhood Chain 4663, publishing every second instead of on a trigger costs ~$17.6/day against ~$0.33/day for the same information.

> [!WARNING]
> Do not price a liquidation off this feed. A contract reads the on-chain value, so a liquidation decided against a 1-second price that has not been published yet can be wrong at the moment it executes. Use `/v1/feeds` for anything that must agree with a contract, and this feed for anything a human looks at.

Every response carries `ageMs` and a `stale` flag so you never have to guess how current a number is.

## REST snapshot

```bash
curl https://api.squidlor.com/aggregator/v1/prices
curl https://api.squidlor.com/aggregator/v1/prices/BTC
curl "https://api.squidlor.com/aggregator/v1/prices?symbols=BTC,ETH"
```

```jsonc
{
  "count": 5,
  "engineAgeMs": 341,          // how long ago the price engine last published anything
  "prices": [
    {
      "symbol": "BTC",
      "price": 64919.98,        // median across live venues
      "priceRaw": "6491998000000",  // same value at 8 decimals — what gets signed and pushed
      "decimals": 8,
      "ts": 1785958022007,
      "seq": 302,               // per-symbol counter; a jump backwards means the engine restarted
      "venues": { "coinbase": 64867.34, "gate": 64920.5, "binance": 64919.98, "bybit": 64921.3, "hub": 64845.12 },
      "freshestAgeMs": 28,
      "ageMs": 335,
      "stale": false
    }
  ]
}
```

`venues` is included deliberately: a median is only as trustworthy as its inputs, and you can see them.

## Server-Sent Events

```bash
curl -N "https://api.squidlor.com/aggregator/v1/prices/stream?symbols=BTC,ETH"
```

```javascript
const es = new EventSource("https://api.squidlor.com/aggregator/v1/prices/stream?symbols=BTC,ETH");

es.addEventListener("snapshot", (e) => setPrices(JSON.parse(e.data).prices));
es.addEventListener("tick", (e) => updatePrice(JSON.parse(e.data)));
es.addEventListener("event", (e) => console.log("price event", JSON.parse(e.data)));
```

| Event | When |
| --- | --- |
| `snapshot` | once, immediately on connect — so you render prices without waiting for the next tick |
| `tick` | one per symbol per second |
| `event` | `deviation` (moved ≥ 0.5%), `stale`, `recovered`. Suppress with `?events=false` |

SSE rather than a WebSocket because it survives every corporate proxy, needs no client library, and reconnects on its own — and this is a one-way firehose with nothing for a client to send back.

- `?symbols=` filters server-side. Use it; a client watching BTC should not pay for XRP frames.
- **Five concurrent streams per caller.** A stream is metered once at connect but held for hours, so filter with `?symbols=` instead of opening several connections.
- A slow consumer has frames dropped rather than queued. On a 1-second feed you want the newest price, never a backlog of old ones.

## socket.io

For consumers that want rooms and bidirectional messaging, the websocket service carries the same ticks:

```javascript
const socket = io("wss://ws.squidlor.com");            // auth optional for prices
socket.emit("subscribe", { topic: "price", symbols: ["BTC", "ETH"] });

socket.on("price", (tick) => updatePrice(tick));        // identical object to the SSE `tick`
socket.on("price:event", (ev) => console.log(ev));      // deviation / stale / recovered
socket.on("oracle:event", (ev) => console.log(ev));     // a round landed on-chain
```

`{ topic: "price" }` with no `symbols` subscribes to everything. Unsubscribe with the same shape. Capped at 25 symbols per socket.

## Webhooks

Webhooks carry **events, not ticks**. A webhook per second per subscriber would melt both ends; what you get is "BTC moved 0.5%", "the ETH feed went stale", "a new round landed on-chain" — things a backend reacts to once.

```bash
curl -X POST https://api.squidlor.com/notification/webhooks \
  -H "Authorization: Bearer <session token>" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://your-app.com/hooks/squidlor",
    "events": ["deviation", "round"],
    "symbols": ["BTC"],
    "minDeviationBps": 100
  }'
```

The response contains a `secret` **shown exactly once**. Store it — it is not retrievable later.

| Event | Fires when |
| --- | --- |
| `deviation` | a symbol moves ≥ 0.5% from the last event price (raise the bar per-subscription with `minDeviationBps`) |
| `stale` | no live venue for a symbol for 30s |
| `recovered` | a stale symbol starts publishing again |
| `round` | the relay landed a new round on-chain |

Omit `symbols` for all symbols. `POST /notification/webhooks/:id/test` delivers a synthetic event so you can verify your signature check before a real move.

### Verifying the signature

Every delivery is signed. Reject anything that fails this check, and anything whose timestamp is more than a few minutes old — the timestamp is inside the signed material specifically so a captured delivery cannot be replayed later.

```javascript
import crypto from "node:crypto";

app.post("/hooks/squidlor", express.raw({ type: "application/json" }), (req, res) => {
  const ts = req.get("X-Squidlor-Timestamp");
  const sig = req.get("X-Squidlor-Signature").replace("sha256=", "");
  const expected = crypto.createHmac("sha256", process.env.SQUIDLOR_WEBHOOK_SECRET)
    .update(`${ts}.${req.body}`)          // raw body, not the parsed object
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.sendStatus(401);
  if (Date.now() - Number(ts) > 5 * 60_000) return res.sendStatus(401);

  res.sendStatus(200);                     // ack fast, process async
  handle(JSON.parse(req.body));
});
```

Delivery is retried three times with exponential backoff. A 4xx (other than 408/429) is not retried — the same body would be rejected again. **After 20 consecutive failures a subscription is disabled**; re-enable it with `PATCH /notification/webhooks/:id {"active": true}`, which also clears the failure count.

## What backs the median

| Venue | Quote | Notes |
| --- | --- | --- |
| Coinbase | USD | no BNB (US delisting) |
| Binance | USDT | |
| Bybit | USDT | |
| Gate.io | USDT | |
| Arbitrum hub | USD | one venue, *not* a pre-medianed composite — see [aggregation architecture](/oracle/architecture) |

USDT-quoted venues are medianed together with the USD-quoted one. The peg risk is bounded: a depegging USDT moves at most two of five inputs, and a median only moves if the median voter moves.

A venue whose socket drops ages out of the median within 10 seconds and reconnects with backoff. A symbol with no live venue publishes nothing and emits `stale` — you will see absence, never a frozen price presented as current.

## Health

```bash
curl https://api.squidlor.com/aggregator/health/prices
```

Returns `disabled` where the realtime feed is not deployed, `degraded` (503) when the engine is unreachable, and `ok` with subscriber counts otherwise.
