# LADDER — Loop Engineering Hackathon (Zero.xyz challenge, $2k)

> An AI agent is handed **$5** and told **"get rich."** It can't touch a bank or a card.
> So it plays the only economy built for machines — the **agentic web** — buying cheap
> inputs, refining them, and selling them behind its own paywall. Every profitable cycle
> is a rung on the **📎 → 🏠 ladder**. It closes by cashing its winnings out into an
> **Amazon gift card — the exact prize we're competing for.**

**Date:** 2026-07-17 · Build 11:00–16:30 · Submit 16:30 · Finals 18:00
**Target:** Best Zero.xyz Use Case — $2,000 Amazon gift card (1st) / $500 (runner-up)

---

## 1. What's real vs. narrative (read this first)

- **Zero** = search + payment layer for the agentic web. $5 managed wallet, hard ceiling,
  never touches a card/bank. Flow: `zero search → get → fetch (auto-pays the 402) → review`.
  ~8k x402/MPP services: gen (image/video/audio), web + social data, page hosting, RPC,
  and **WURK** (hire real humans for microtasks).
- **Zero agents can only SPEND.** The earn side is **ours**: our own x402 seller endpoint
  (USDC on Base, Coinbase facilitator). That's the rung Zero doesn't give you.
- **The house is the narrative.** A literal house via human bartering is not real and would
  die on stage. The *engine* (autonomous plan→act→observe→self-correct money loop) is real;
  the ladder is the honest extrapolation.

## 2. The loop (this is the whole hackathon theme)

```
        ┌─────────────────────────────────────────────────────┐
        │  PLAN    assess net worth → pick next rung/niche      │
        │  ACT     Zero: buy data + generations → build product │
        │  SELL    list behind our x402 paywall → USDC in       │
        │  OBSERVE zero review + wallet balance + sales         │
        │  CORRECT flop → pivot niche · profit → reinvest bigger │
        └─────────────────────────────────────────────────────┘
                     each profitable cycle = one ladder rung
```

**Real autonomy beat (on camera):** the agent picks its product niche live from real
market/trend data it *buys through Zero* — a genuine real-time decision, not a script.

## 3. Architecture

```
 ┌────────────┐   search/get/fetch/review   ┌──────────────────┐
 │  AGENT      │ ──────────────────────────▶ │  Zero ($5 wallet) │→ ~8k paid services
 │  (Claude    │                             └──────────────────┘
 │   loop)     │   list product / read sales ┌──────────────────┐
 │             │ ──────────────────────────▶ │  OUR x402 store   │← buyers pay USDC
 └─────┬──────┘                              │  (Base + facilitator)
       │ state (net worth, rungs, ledger)    └──────────────────┘
       ▼
 ┌────────────────────────────┐        ┌───────────────────────┐
 │  LADDER DASHBOARD (web)     │        │  CASH-OUT (closer)    │
 │  live thoughts · ledger ·   │        │  USDC → Amazon gift   │
 │  📎→🏠 rung animation        │        │  card via agentic web │
 └────────────────────────────┘        └───────────────────────┘
```

**Stack:** Node/TS. Agent = Claude (Agent SDK or plain API loop). Zero via `@zeroxyz/cli`
(+ `mcp.zero.xyz` for auth in sandbox). Seller = x402 Node middleware, USDC on Base,
Coinbase public facilitator. Dashboard = single-page (Vite/React or plain) reading a
JSON event log the agent appends to. Buyer fallback = 1–2 funded agents that purchase if
no external x402 traffic lands during the demo (disclosed honestly).

## 4. Build timeline (owners = fill in)

| Time | Milestone | Fallback |
|------|-----------|----------|
| 11–12 | Zero CLI live; claim $5; one real paid `fetch` end-to-end | MCP connector auth if CLI login flaky |
| 12–13 | Agent loop: search/get/fetch/review + net-worth state machine | hardcode 1 niche if search churns |
| 13–14 | x402 seller endpoint live on Base; 1 real test purchase | Zero "host a webpage" storefront |
| 14–15 | Ladder dashboard (thoughts, ledger, rung animation) | terminal TUI if web runs late |
| 15–16 | Gift-card cash-out path + funded-buyer safety net | "found a gift-card service" framing |
| 16–16:30 | Rehearse 3-min run ×2; record backup take | pre-recorded clip as insurance |

## 5. Demo script (3:00)

1. **0:00** — "We gave an agent $5 and told it to get rich. No bank, no card." Show the real $5 Zero wallet.
2. **0:25** — Agent buys real market/trend data via Zero, **decides its niche live** (autonomy beat).
3. **0:55** — Buys generations via Zero → assembles a digital product. Spend ticks on ledger.
4. **1:25** — Lists it on its **own x402 storefront** (real, onchain). First USDC lands → **rung lights up**.
5. **1:55** — Loop compounds once more; net worth climbs the ladder.
6. **2:25** — **Closer:** agent finds a gift-card service on the agentic web and **cashes out into an Amazon gift card — the prize.** Mic drop.
7. **2:50** — Ladder graphic extrapolates 📎→🏠. "The engine is real. The ceiling isn't $5."

## 6. Judging fit (5 × 20%)

- **Idea / real-world value:** autonomous machine-to-machine commerce — a real emerging market.
- **Technical:** real Zero spend + real onchain x402 earn + live self-directing loop.
- **Sponsor-tool use:** deep Zero (search/get/fetch/review) + optional WURK.
- **Demo:** the gift-card meta-loop closer.
- **Autonomy:** live niche decision from bought data; reinvest logic; (optional) failure→pivot.

## 7. Risk register

- **Gift-card service may not exist in Zero's directory** → verify `zero search "gift card"`
  first thing; fallback: any real redeemable cash-out, or honest "here's the mechanism" framing.
- **No external x402 buyers during demo** → funded-buyer safety net, disclosed.
- **CLI auth churn in sandbox** → use `mcp.zero.xyz` connector.
- **$5 ceiling** → keep per-call spend tiny; budget the whole demo to well under $5.
- **Honesty:** never claim a literal house or net profit we didn't make. Claim the engine.

## 8. Stretch (only if ahead)

- WURK real-human-in-the-loop ranking of the agent's product options.
- Multi-agent buyer swarm for a livelier economy.
- Dual-submit to Pomerium ($1k) via OpenClaw if there's spare time — not the focus.

## 9. Repo layout

```
/agent      Claude loop, Zero client wrapper, state machine
/store      x402 seller endpoint (Base + facilitator)
/dashboard  Ladder UI (reads event log)
/buyers     funded buyer safety-net agents
PLAN.md     this file
README.md   architecture + how to run (submission requirement)
```
```
```
