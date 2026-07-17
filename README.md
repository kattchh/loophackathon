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

## Sponsor stack — three tools, three visibly different jobs

| Sponsor | Role | Proof |
|---|---|---|
| **Zero.xyz** | The agent's **hands** — discovers, inspects, pays, and reviews x402 services (`search → get → fetch → review`), $5 wallet claimed via device-flow CLI auth | CLI installed + `zero init`; 5.00 USDC claimed; run ledger |
| **Nexla** | The agent's **books** — every thought and purchase streams from `ladder_agent.py` into a webhook source created with `nexla-cli` (dry-run-validated), schema auto-detected into a nexset | source `125742` → flow `634457` → nexset `435614`; `nexla-cli skill install` on the build agent |
| **Akash** | The agent's **public mission control** — the dashboard, containerized (`node:20-alpine`) and self-hosted on the decentralized cloud, perpetually replaying a real recorded run | SDL at `deploy/akash-deploy.yaml`; public deployment URL in the Devpost |

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
   ┌───────────────────────────────────────────────────────────┐
   │  PRIMARY BRAIN — ladder_agent.py (Python)                 │
   │  Claude itself, via the Claude Agent SDK, reasoning LIVE. │
   │  It gets exactly 5 tools: market_search · market_inspect  │
   │  · market_buy · market_review · narrate — and nothing else│
   │                                                           │
   │  The AI decides. The code guards: budget cap, finale-only │
   │  reserve, per-call caps live in market_buy(), not in the  │
   │  model's judgment.                                        │
   └──────────────┬────────────────────────────────────────────┘
                  │                    ┌──────────────────────────────┐
                  │ guarded spend      │ UNDERSTUDY — agent/run.js    │
                  │                    │ deterministic clockwork arc, │
                  │              ◄─────┤ same guards (agent/zero.js), │
                  │   same event feed  │ stage fallback in 90 seconds │
                  │                    └──────────────────────────────┘
   ┌──────────────▼────────────────┐
   │  ZERO CLI  search → get →     │      x402 (HTTP 402 + USDC on Base)
   │  fetch --max-pay → review     ├────────────────────────────────────►
   └──────────────┬────────────────┘   thousands of machine-payable
                  │ appends            services: data, image gen, hosting,
   ┌──────────────▼────────────────┐   gift cards, even human labor
   │         events.jsonl          │
   │   (the only interface between │
   │      agents and dashboard)    │
   └──────────────▲────────────────┘
                  │ polled every 400ms via /events
   ┌──────────────┴────────────────┐
   │  DASHBOARD  localhost:4200    │
   │  giant balance · thought feed │
   │  purchase ledger · rung rail  │
   │  full-screen gift-card finale │
   └───────────────────────────────┘
```

Zero external dependencies. Node 20 stdlib only. No `npm install`, no CDNs,
no build step — venue wifi cannot hurt us.

## How to run

```bash
# terminal 1 — the demo screen (http://localhost:4200)
node dashboard/server.js          # Node 20+, zero dependencies

# terminal 2 — THE BRAIN (Claude Agent SDK; rehearsal mode: spends nothing)
python3 -m venv .venv && ./.venv/bin/pip install claude-agent-sdk
npm i -g @anthropic-ai/claude-code   # the SDK's engine; sign in once with `claude`
./.venv/bin/python ladder_agent.py

# understudy — deterministic 90-second arc, no SDK needed (stage fallback)
node agent/run.js
```

Open http://localhost:4200 and watch the climb: all 7 rungs, ending in the
gift-card finale. Every brain run is different — the thoughts on screen are
Claude actually reasoning about vendors, prices, and strategy in real time
(in one rehearsal it named its product "Royal Pets" and priced it at $6.99;
we take no credit).

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

**Also real: the thinking.** In the primary brain, every decision and every
on-screen thought is Claude reasoning live via the Agent SDK — in rehearsal
mode too. Rehearsal replays the *market* (from our real recon); it never
scripts the *mind*. We chose to run the hackathon demo in rehearsal mode and
keep the $5.00 sealed — the wallet is real, funded, and verifiably intact,
and we'd rather show honest engineering than burn the budget for theater.

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
ladder_agent.py      THE BRAIN — Claude Agent SDK, 5 guarded tools (read this one)
agent/run.js         understudy: deterministic clockwork arc (Builder A)
agent/zero.js        Zero CLI wrapper + money guards (Builder A)
agent/fixtures.js    canned dry-run data from real recon (Builder A)
dashboard/server.js  serves dashboard + /events (Builder B)
dashboard/index.html the demo screen (Builder B)
events.jsonl         runtime artifact — the agent/dashboard interface
README.md · DEMO_SCRIPT.md · DEVPOST.md   docs (Builder C)
docs/                process artifacts: the original battle plan (PLAN.md)
                     and the spec the AI build team worked under (CONTRACT.md)
```

Built in an afternoon by one human (product/GTM, non-technical) directing a
team of AI builders — which is itself the thesis: agents doing real economic
work under human intent and hard-coded guardrails.
