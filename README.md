# LADDER 📎→🏠

**We gave an AI five dollars and told it to get rich.**

It can't touch a bank, a card, or a human. So it shops the only economy built
for machines: paid x402 services it discovers, inspects, pays, and reviews
through the [Zero.xyz](https://zero.xyz) CLI — buying data and generations for
fractions of a cent, building a product, opening its own shop, and finally
cashing out into a **real Amazon gift card**. Which happens to be the prize
this hackathon pays out in. Yes, on purpose.

## The plot twist (real, and our favorite part)

When the agent scoped its exit, `zero search "gift card"` returned **22 real
x402 services**. The cheapest ready-made gift card cost **$5.24**. The agent
has **$5.00**.

It starts the run unable to afford its own ending. It has to shop smart —
spend fractions of cents on inputs, create value, and find a card with a
flexible denomination (Bitrefill sells variable-amount cards) that fits
whatever balance it earns its way to. Nobody wrote that arc. The market did.

## The ladder

Seven rungs, rendered live on the dashboard as the agent climbs:

1. 📎 wallet live
2. 🔍 market scouted
3. 🎨 inputs bought
4. 📦 product built
5. 🏪 shop open
6. 💰 value created
7. 🎁 CASHED OUT

## Architecture

```
            ┌───────────────────────────────┐
            │   AGENT LOOP    agent/run.js  │
            │   PLAN → ACT → BUILD → SELL → │
            │   OBSERVE → CORRECT → FINALE  │
            └──────────────┬────────────────┘
                           │ guarded spend
            ┌──────────────▼────────────────┐
            │  ZERO CLI WRAPPER agent/zero.js│      x402 (HTTP 402 +
            │  search → get → fetch → review │      USDC on Base)
            │  budget caps · reserve · caps  ├────────────────────────►
            │  per-call --max-pay            │   thousands of machine-
            └──────────────┬────────────────┘   payable services: data,
                           │ appends            image gen, hosting, gift
            ┌──────────────▼────────────────┐   cards, even human labor
            │         events.jsonl          │
            │   (the only interface between │
            │      agent and dashboard)     │
            └──────────────▲────────────────┘
                           │ polled every 400ms via /events
            ┌──────────────┴────────────────┐
            │  DASHBOARD  localhost:4200    │
            │  dashboard/server.js + index  │
            │  giant balance · thought feed │
            │  purchase ledger · rung rail  │
            │  full-screen gift-card finale │
            └───────────────────────────────┘
```

Zero external dependencies. Node 20 stdlib only. No `npm install`, no CDNs,
no build step — venue wifi cannot hurt us.

## How to run

Requirements: Node 20+. That's it.

```bash
# terminal 1 — the demo screen (http://localhost:4200)
node dashboard/server.js

# terminal 2 — the agent (DRY mode, the default: spends nothing)
node agent/run.js
```

Open http://localhost:4200 and watch the full story arc play out in about
90 seconds: all 7 rungs, ending in the gift-card finale.

### LIVE mode (real money, heavily guarded)

```bash
LIVE=1 BUDGET_USD=0.25 RESERVE_USD=2.50 node agent/run.js
```

| Env var       | Default | Meaning                                                        |
|---------------|---------|----------------------------------------------------------------|
| `LIVE`        | unset   | Set to `1` to shell out to the real `zero` CLI                 |
| `BUDGET_USD`  | `0.25`  | Cumulative spending cap for the whole run (pre-finale)         |
| `RESERVE_USD` | `2.50`  | Untouchable reserve — only the FINALE phase may spend it       |

Additional guards in LIVE mode: every `zero fetch` carries
`--max-pay = min(listed_price × 1.5, $0.50)` (finale excepted), every paid
call is followed by a `zero review` of the service, and any blocked spend is
surfaced as a visible "thought" on the dashboard instead of failing silently.

### Smoke test

```bash
curl localhost:4200            # serves the dashboard HTML
curl localhost:4200/events     # returns the parsed event array as JSON
```

`events.jsonl` is a runtime artifact (agent appends, server tails). It is not
committed.

## Honest notes — what's real vs. simulated

**Real, in both modes:**

- The wallet. 5.00 USDC, actually funded, managed by Zero via its device-flow
  login. No card, no bank account anywhere in the system.
- The market reconnaissance. Every service, price, endpoint, and capability
  slug in our fixtures came from live Zero sessions: 22 gift-card services
  from `zero search "gift card"`; Bitrefill Gift Card & Voucher Search at
  $0.002/call; Reloadpi Voucher Brands Catalog at $0.001/call (lists Amazon,
  Google Play, Netflix); Laso Finance Agent Payments (free, prepaid cards and
  Venmo/PayPal payouts via USDC on Base); image generation around $0.003/call.
- The plot twist. Ready-made cards really cost $5.24–$25. The agent really
  cannot afford its ending on day one.
- The guard-rail code. Budget cap, finale reserve, and per-call `--max-pay`
  are enforced in `agent/zero.js` in both modes.

**Simulated in DRY mode (the default):**

- Every Zero call is replayed from fixtures captured during that real
  reconnaissance. Dry mode never spawns the `zero` binary and makes zero
  network calls.
- Balance changes are simulated arithmetic against the same real prices.
- The storefront sales in the SELL/OBSERVE beats are narrative: Zero agents
  can only *spend*, so the earn side of the loop is our own x402 storefront
  concept, simulated in dry runs.
- The gift-card code shown at the finale is a masked placeholder. In LIVE
  mode the finale purchase is real and the code is masked because it's real.

We think the honest version of this demo is better than the inflated one:
the engine — an agent that plans, spends real money machine-to-machine,
observes, corrects, and cashes out — is the real thing. The house at the top
of the ladder is the extrapolation, clearly labeled.

## Repo layout

```
agent/run.js         the agent loop (Builder A)
agent/zero.js        Zero CLI wrapper + money guards (Builder A)
agent/fixtures.js    canned dry-run data from real recon (Builder A)
dashboard/server.js  serves dashboard + /events (Builder B)
dashboard/index.html the demo screen (Builder B)
events.jsonl         runtime artifact — the agent/dashboard interface
README.md · DEMO_SCRIPT.md · DEVPOST.md   docs (Builder C)
```
